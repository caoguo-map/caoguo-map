/**
 * 草果地图 AI 代理服务（Node 原生 http，无框架依赖）
 *
 * 职责：
 *   1. /api/deepseek  —— 代理 DeepSeek Chat Completions（解决浏览器 CORS + 保护密钥）
 *   2. /api/nlpg      —— NLPG：自然语言 → (LLM/规则) SQL → 安全校验 → PostGIS 执行 → 结果
 *   3. /api/db/query  —— 数据库代理（MySQL/OceanBase/PG/ClickHouse/InfluxDB/达梦）
 *   4. /api/webhook/* —— Webhook 登记/接收/轮询
 *   5. /api/devices   —— 设备 Mock 快照（REST 轮询）
 *   6. WS /api/ws     —— 设备 Mock 实时推送（每 2s 一帧）
 *   7. /api/health    —— 健康检查
 *
 * 配置：读取 docker/.env（DEEPSEEK_API_KEY / POSTGRES_* / PROXY_PORT）
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { snapshot as deviceSnapshot, handleUpgrade as handleWsUpgrade } from './mockDevices.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// 一、配置加载（从 docker/.env 读取）
// ============================================================
function loadEnv() {
  const envPath = join(__dirname, '../../docker/.env');
  const env = { ...process.env };
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        const [, k, v] = m;
        if (!(k in env)) env[k] = v.replace(/^["']|["']$/g, '');
      }
    }
  }
  return env;
}

const env = loadEnv();
const PORT = Number(env.PROXY_PORT || 8787);
const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const DEEPSEEK_MODEL = env.DEEPSEEK_MODEL || 'deepseek-chat';

// PostGIS 连接
const pgConfig = {
  host: env.POSTGRES_HOST || '127.0.0.1',
  port: Number(env.POSTGRES_PORT || 5433),
  database: env.POSTGRES_DB || 'caoguo',
  user: env.POSTGRES_USER || 'caoguo',
  password: env.POSTGRES_PASSWORD || 'caoguo123',
};
const pgPool = new pg.Pool(pgConfig);

// ============================================================
// 二、工具函数
// ============================================================
function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// ============================================================
// 三、SQL 安全校验（与服务端执行绑定，双重保险）
// ============================================================
const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE',
  'MERGE', 'CREATE', 'REPLACE', 'EXEC', 'EXECUTE', 'CALL', 'COPY', 'LOAD',
  'INTO', 'UNION', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'REINDEX',
];
const ALLOWED_TABLES = [
  'pipelines', 'nodes', 'users', 'schools', 'hospitals', 'substations',
  'base_stations', 'rivers', 'reservoirs', 'alarms', 'pois',
];

function validateSql(sql) {
  const issues = [];
  const upper = sql.trim().toUpperCase();
  if (!upper.startsWith('SELECT')) issues.push('仅允许 SELECT');
  for (const kw of DANGEROUS_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(sql) && !(kw === 'SET' && /ST_SetSRID/i.test(sql))) {
      issues.push(`危险关键字 ${kw}`);
    }
  }
  if (/--|\/\*/.test(sql)) issues.push('禁止注释');
  if (/'\s*OR\s*'/i.test(sql) || /"\s*OR\s*"/i.test(sql)) issues.push('注入特征');
  const from = upper.match(/FROM\s+([A-Za-z_][\w]*)/);
  if (from && !ALLOWED_TABLES.includes(from[1].toLowerCase())) {
    issues.push(`表 ${from[1]} 不在白名单`);
  }
  return { valid: issues.length === 0, issues };
}

// ============================================================
// 四、DeepSeek 调用
// ============================================================
async function callDeepSeek(messages, { json = false } = {}) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }
  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 2048,
  };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ============================================================
// 五、NLPG 处理（自然语言 → SQL → 执行）
// ============================================================
const NLPG_SYSTEM_PROMPT = `你是"草果地图"管网自然语言查询助手。用户用中文描述数据查询需求，你生成 PostGIS SQL（仅 SELECT）。

规则：
1. 只返回 JSON：{"sql":"SELECT ...","table":"..."}
2. 表名只能来自：${ALLOWED_TABLES.join(', ')}
3. 空间函数可用 ST_DWithin / ST_Within / ST_Intersects / ST_Contains / ST_Buffer / ST_MakePoint / ST_SetSRID / ST_Distance / ST_AsGeoJSON / ST_Transform
4. 只生成 SELECT，禁止写操作。字段 snake_case，坐标 WGS84（SRID 4326）
5. 空间查询时用 ST_AsGeoJSON(geom) 返回几何，例如 SELECT name, material, ST_AsGeoJSON(geom) AS geojson FROM pipelines WHERE ... LIMIT 50

字段值枚举（必须使用英文枚举值，禁止用中文）：
- pipelines.material: cast_iron(铸铁) / ductile_iron(球墨) / steel(钢) / pe(PE) / pvc(PVC) / hdpe(HDPE)
- pipelines.status: normal / fault / maintenance / aging
- substations.status: normal / overload
- base_stations.status: normal / weak

实体-表映射（查询实体必须用正确表，不要跨表找错）：
- 学校（华中科技大学/武汉大学/小学等）→ schools 表
- 医院 → hospitals 表
- 变电站/电网 → substations 表
- 基站/通信 → base_stations 表
- 河流/水系 → rivers 表
- 水库 → reservoirs 表
- 管段/管线/管网 → pipelines 表
- 阀门/节点 → nodes 表
- POI（光谷广场/江汉路/黄鹤楼等）→ pois 表

字段存储格式（必须按实际存储格式过滤）：
- substations.load_rate 是 0-1 小数（0.72 表示 72%），"负载率超过90%" → load_rate > 0.9
- substations.voltage 是整数 kV，"110kV变电站" → voltage = 110
- base_stations.rsrp 是负整数 dBm（-85 表示信号强），"信号弱" → rsrp < -100
- reservoirs.storage_rate 是 0-1 小数，"蓄水率超过80%" → storage_rate > 0.8
- rivers.water_level 是米（22.5 表示 22.5 米）

日期运算（必须用 EXTRACT，禁止用日期直接相减）：
- "使用超过N年" → EXTRACT(YEAR FROM age(CURRENT_DATE, install_date)) > N
- "使用超过20年的铸铁管" → WHERE material = 'cast_iron' AND EXTRACT(YEAR FROM age(CURRENT_DATE, install_date)) > 20

空间查询注意：
- "XX附近/范围内"：先在同表内按 name 定位目标，或用 ST_MakePoint 构造坐标
- ST_DWithin(geom, 参考几何, 距离米) 中 geom 是 geometry(4326)，第三参数单位是"度"，500米约等于 0.005 度；若需精确米用 ::geography 转换
- 例如"华中科技大学500米内的学校" → SELECT name FROM schools WHERE ST_DWithin(geom::geography, (SELECT geom::geography FROM schools WHERE name LIKE '%华中科技大学%'), 500)

6. 不要输出 JSON 以外的文字。`;

async function handleNlpg(query) {
  // 1) LLM 生成 SQL
  let sql = '';
  let source = 'llm';
  try {
    const content = await callDeepSeek(
      [
        { role: 'system', content: NLPG_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      { json: true }
    );
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    sql = (JSON.parse(cleaned).sql ?? '').trim();
  } catch (e) {
    sql = '';
    source = 'error:' + (e.message || 'unknown');
  }

  // 2) 安全校验
  const validation = validateSql(sql);
  if (!validation.valid) {
    return {
      ok: false,
      source,
      validation,
      message: '生成的 SQL 未通过安全校验',
    };
  }

  // 3) 执行 SQL
  try {
    const result = await pgPool.query(sql);
    return {
      ok: true,
      source,
      validation,
      sql,
      rowCount: result.rowCount,
      rows: result.rows,
    };
  } catch (e) {
    return {
      ok: false,
      source,
      validation,
      sql,
      message: 'SQL 执行失败: ' + (e.message || 'unknown'),
    };
  }
}

// ============================================================
// 五·五、数据库代理（/api/db/query 后端分发）
// ============================================================
// 惰性加载驱动：未安装则给出明确错误，不阻断服务启动
async function loadDriver(name) {
  try {
    return await import(name);
  } catch {
    return null;
  }
}

/**
 * 按 type 路由到对应数据库执行查询，返回统一 { ok, rows, rowCount, message }。
 * 支持：mysql / oceanbase（MySQL 协议）、postgres、clickhouse、influxdb、dameng。
 */
async function queryDatabase(type, cfg = {}) {
  const { host, port, database, username, password, query } = cfg;
  const connInfo = { host: host || '127.0.0.1', port, database, user: username, password };

  try {
    if (type === 'mysql' || type === 'oceanbase') {
      const mysql = await loadDriver('mysql2/promise');
      if (!mysql) return { ok: false, message: '未安装 mysql2 驱动（npm i mysql2）' };
      const c = await mysql.createConnection({ ...connInfo, port: Number(port || (type === 'oceanbase' ? 2881 : 3306)) });
      const [rows] = await c.query(query);
      await c.end();
      return { ok: true, rows: ensureArray(rows), rowCount: Array.isArray(rows) ? rows.length : undefined };
    }

    if (type === 'postgres') {
      const pg = await loadDriver('pg');
      if (!pg) return { ok: false, message: '未安装 pg 驱动' };
      const client = new pg.Client({ ...connInfo, port: Number(port || 5432) });
      await client.connect();
      const r = await client.query(query);
      await client.end();
      return { ok: true, rows: r.rows, rowCount: r.rowCount };
    }

    if (type === 'clickhouse') {
      const ch = await loadDriver('@clickhouse/client');
      if (!ch) return { ok: false, message: '未安装 @clickhouse/client 驱动' };
      const client = ch.createClient({
        url: `http://${host || '127.0.0.1'}:${port || 8123}`,
        username: username || 'default',
        password: password || '',
        database: database || 'default',
      });
      try {
        const rs = await client.query({ query, format: 'JSONEachRow' });
        const rows = await rs.json();
        return { ok: true, rows: Array.isArray(rows) ? rows : (rows?.data ?? []), rowCount: Array.isArray(rows) ? rows.length : undefined };
      } finally {
        await client.close().catch(() => {});
      }
    }

    if (type === 'influxdb') {
      // InfluxDB v2：通过 HTTP /api/v2/query 执行 Flux（org 在 query 中 via |>
      const url = `http://${host}:${port || 8086}/api/v2/query?org=${encodeURIComponent(cfg.org || 'caoguo')}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.flux', Authorization: `Token ${cfg.token || password || ''}` },
        body: query,
      });
      if (!r.ok) return { ok: false, message: 'InfluxDB HTTP ' + r.status + ': ' + (await r.text().catch(() => '')) };
      const text = await r.text();
      // 解析注释头 + CSV 体为对象数组（简化）
      const rows = parseInfluxCsv(text);
      return { ok: true, rows, rowCount: rows.length };
    }

    if (type === 'dameng') {
      // 达梦需专用驱动 dmdb（私有包），未内置
      const dm = await loadDriver('dmdb');
      if (!dm) return { ok: false, message: '达梦需安装官方 dmdb 驱动并配置 DM_HOME' };
      const c = await dm.connect(connInfo);
      const rows = await c.query(query);
      await c.close();
      return { ok: true, rows: ensureArray(rows), rowCount: Array.isArray(rows) ? rows.length : undefined };
    }

    return { ok: false, message: '不支持的数据库类型：' + type };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

function ensureArray(rows) {
  // mysql2 小结果集返回数组；大结果集返回 ResultSetHeader，需处理
  if (Array.isArray(rows)) return rows;
  return [];
}

function parseInfluxCsv(text) {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  // 跳过注释行（#）
  const dataLines = lines.filter((l) => !l.startsWith('#'));
  const header = dataLines[0].split(',');
  return dataLines.slice(1).map((l) => {
    const cells = l.split(',');
    const o = {};
    header.forEach((h, i) => (o[h.trim()] = cells[i]));
    return o;
  });
}

// ============================================================
// 五·六、Webhook 接收（外部系统推送 → 代理暂存 → 前端轮询取回）
// ============================================================
const webhooks = new Map(); // id -> { createdAt, lastPayload }
function genId(prefix = 'wh') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

// ============================================================
// 六、路由
// ============================================================
async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // 设备 Mock：REST 快照（编辑器设备图层轮询用；path 留空即可当数组解析）
  if (path === '/api/devices' && req.method === 'GET') {
    return json(res, 200, deviceSnapshot());
  }

  if (path === '/api/health' && req.method === 'GET') {
    let pgOk = false;
    try {
      await pgPool.query('SELECT 1');
      pgOk = true;
    } catch {}
    return json(res, 200, { ok: true, postgis: pgOk, deepseek: Boolean(DEEPSEEK_API_KEY) });
  }

  if (path === '/api/deepseek' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const content = await callDeepSeek(body.messages ?? [], { json: body.json });
      return json(res, 200, { ok: true, content });
    } catch (e) {
      return json(res, 500, { ok: false, message: e.message });
    }
  }

  if (path === '/api/nlpg' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (!body.query) return json(res, 400, { ok: false, message: '缺少 query 参数' });
      const result = await handleNlpg(body.query);
      return json(res, 200, result);
    } catch (e) {
      return json(res, 500, { ok: false, message: e.message });
    }
  }

  // 数据库代理：统一入口，按 type 路由到对应库执行查询
  if (path === '/api/db/query' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (!body.type) return json(res, 400, { ok: false, message: '缺少 type' });
      if (!body.query && body.type !== 'rest') return json(res, 400, { ok: false, message: '缺少 query' });
      const result = await queryDatabase(body.type, body);
      return json(res, result.ok ? 200 : 502, result);
    } catch (e) {
      return json(res, 500, { ok: false, message: e.message });
    }
  }

  // Webhook 登记：返回前端轮询用的接收端点
  if (path === '/api/webhook/register' && req.method === 'POST') {
    const body = await readBody(req).catch(() => ({}));
    const id = genId();
    webhooks.set(id, { createdAt: Date.now(), lastPayload: null, source: body.source });
    const receiveUrl = `/api/webhook/${id}`;
    return json(res, 200, { ok: true, id, receiveUrl, pollUrl: receiveUrl, message: '将 receiveUrl 配置为数据源的 Webhook 地址，外部系统 POST 设备数组到此端点' });
  }

  // Webhook 接收端点：外部 POST 推送（payload 为设备数组）；前端 GET 取最新
  const whMatch = path.match(/^\/api\/webhook\/([\w-]+)$/);
  if (whMatch) {
    const id = whMatch[1];
    if (!webhooks.has(id)) return json(res, 404, { ok: false, message: 'webhook 不存在' });
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await readBody(req).catch(() => ({}));
      const arr = Array.isArray(body) ? body : (body.rows ?? body.data ?? null);
      if (!arr) return json(res, 400, { ok: false, message: 'body 需为设备数组或 {rows}' });
      webhooks.get(id).lastPayload = arr;
      return json(res, 200, { ok: true, received: arr.length });
    }
    if (req.method === 'GET') {
      const payload = webhooks.get(id).lastPayload;
      return json(res, 200, { ok: true, rows: payload ?? [], hasData: !!payload });
    }
  }

  return json(res, 404, { ok: false, message: 'not found' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    json(res, 500, { ok: false, message: e.message });
  });
});

// WebSocket：/api/ws 设备实时推送（与编辑器 websocket 数据源联动）
server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/ws') {
    handleWsUpgrade(req, socket);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`[caoguo-ai-server] listening on http://127.0.0.1:${PORT}`);
  console.log(`  POST /api/deepseek       - DeepSeek 代理`);
  console.log(`  POST /api/nlpg           - 自然语言 → SQL → PostGIS`);
  console.log(`  POST /api/db/query       - 数据库代理（MySQL/OceanBase/PG/ClickHouse/InfluxDB/达梦）`);
  console.log(`  POST /api/webhook/register - 登记 Webhook 接收端点`);
  console.log(`  *    /api/webhook/:id     - 外部推送 / 前端轮询取数`);
  console.log(`  GET  /api/devices        - 设备 Mock 快照（REST 轮询）`);
  console.log(`  WS   /api/ws             - 设备 Mock 实时推送（每 2s）`);
  console.log(`  GET  /api/health         - 健康检查`);
  console.log(`  DeepSeek key: ${DEEPSEEK_API_KEY ? '已配置' : '未配置'}`);
  console.log(`  PostGIS: ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
});
