/**
 * 草果地图 AI 代理服务（Node 原生 http，无框架依赖）
 *
 * 职责：
 *   1. /api/deepseek  —— 代理 DeepSeek Chat Completions（解决浏览器 CORS + 保护密钥）
 *   2. /api/nlpg      —— NLPG：自然语言 → (LLM/规则) SQL → 安全校验 → PostGIS 执行 → 结果
 *   3. /api/health    —— 健康检查
 *
 * 配置：读取 docker/.env（DEEPSEEK_API_KEY / POSTGRES_* / PROXY_PORT）
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

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

  return json(res, 404, { ok: false, message: 'not found' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    json(res, 500, { ok: false, message: e.message });
  });
});

server.listen(PORT, () => {
  console.log(`[caoguo-ai-server] listening on http://127.0.0.1:${PORT}`);
  console.log(`  POST /api/deepseek  - DeepSeek 代理`);
  console.log(`  POST /api/nlpg      - 自然语言 → SQL → PostGIS`);
  console.log(`  GET  /api/health    - 健康检查`);
  console.log(`  DeepSeek key: ${DEEPSEEK_API_KEY ? '已配置' : '未配置'}`);
  console.log(`  PostGIS: ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
});
