/**
 * NLPG 自然语言 → PostGIS SQL 生成（PRD phase-0 §5.7 N-1/N-2/N-3）
 *
 * 支持：
 *   - 属性过滤（字段 + 操作符 + 值，AND/OR 组合）
 *   - 空间关系（ST_DWithin / ST_Within / ST_Intersects / ST_Contains / ST_Buffer）
 *   - 混合查询（空间 + 属性）
 *
 * v1 采用「字段词典 + 规则匹配」方案（不依赖大模型），SQL 生成后必须经
 * `validateSql` 安全校验层通过方可执行（见 sqlValidator.ts）。
 */

// ============================================================
// 一、类型定义
// ============================================================
export type NlpgIntent = 'attribute_filter' | 'spatial_nearby' | 'spatial_within' | 'mixed' | 'unknown';

export type Operator = '>' | '<' | '>=' | '<=' | '=' | '!=' | 'LIKE';

export interface AttributeCondition {
  /** 字段名（白名单字段） */
  field: string;
  operator: Operator;
  /** 字面量值 */
  value: string | number;
}

export interface SpatialCondition {
  /** 空间关系 */
  relation: 'dwithin' | 'within' | 'intersects' | 'contains' | 'buffer';
  /** 参考点 [lng, lat]：within/intersects/contains/buffer/dwithin 的参考几何中心 */
  point?: [number, number];
  /** 缓冲/距离半径（米，dwithin/buffer 及以参考点表达的 within·intersects·contains 用） */
  radius?: number;
  /** 参考几何列名（进阶：与某字段几何做空间关系，缺省时用 point 构造缓冲圆） */
  referenceColumn?: string;
  /** 目标几何字段 */
  geometryColumn: string;
}

export interface GeneratedQuery {
  intent: NlpgIntent;
  /** 目标表（白名单表） */
  table: string;
  /** 属性条件 */
  conditions: AttributeCondition[];
  /** 空间条件 */
  spatial: SpatialCondition | null;
  /** 生成的 SQL */
  sql: string;
  /** 置信度 0-1 */
  confidence: number;
}

// ============================================================
// 二、字段与表词典
// ============================================================
/** 字段别名 → 规范字段名 */
const FIELD_ALIASES: Array<{ field: string; re: RegExp }> = [
  { field: 'material', re: /材质|材料|铸铁|钢管|PE|PVC|球墨|HDPE|铜管/ },
  { field: 'pressure', re: /压力|水压|气压|MPa/ },
  { field: 'diameter', re: /管径|直径|口径|DN/ },
  { field: 'status', re: /状态|运行|停运|故障|检修/ },
  { field: 'install_date', re: /安装日期|投运|建成|敷设/ },
  { field: 'age', re: /年限|使用.{0,2}年|超过.{0,2}年|.{0,2}年以上|年代/ },
  { field: 'voltage', re: /电压|kV|kv|伏/ },
  { field: 'load_rate', re: /负载率|负荷率|利用率|负载|负荷/ },
  { field: 'fault_rate', re: /故障率/ },
  { field: 'flow_rate', re: /流量|流速/ },
  { field: 'water_level', re: /水位/ },
  { field: 'storage_rate', re: /蓄水率|库容/ },
  { field: 'rsrp', re: /RSRP|信号强度|信号/ },
];

/** 表别名 → 规范表名 */
const TABLE_ALIASES: Array<{ table: string; re: RegExp }> = [
  { table: 'pipelines', re: /管段|管线|管道|管网|燃气管|供水管|排水管|供热管|电力管|通信管/ },
  { table: 'nodes', re: /节点|阀门|泵站|表|井|闸/ },
  { table: 'users', re: /用户|居民|小区|住户|建筑/ },
  { table: 'schools', re: /学校|小学|中学|大学|幼儿园/ },
  { table: 'hospitals', re: /医院|卫生院|诊所/ },
  { table: 'substations', re: /变电站|配变|台区|电站/ },
  { table: 'base_stations', re: /基站|宏站|微站|室分/ },
  { table: 'rivers', re: /河流|水系|河段|支流/ },
  { table: 'reservoirs', re: /水库|大坝/ },
  { table: 'alarms', re: /报警|告警|警报/ },
  { table: 'pois', re: /POI|兴趣点|场所|设施/ },
];

/** 字段值词典（材质/状态等） */
const VALUE_DICT: Array<{ field: string; value: string; re: RegExp }> = [
  { field: 'material', value: 'cast_iron', re: /铸铁/ },
  { field: 'material', value: 'ductile_iron', re: /球墨/ },
  { field: 'material', value: 'steel', re: /钢(?!筋)/ },
  { field: 'material', value: 'pe', re: /PE/ },
  { field: 'material', value: 'pvc', re: /PVC/ },
  { field: 'material', value: 'hdpe', re: /HDPE/ },
  { field: 'status', value: 'normal', re: /正常/ },
  { field: 'status', value: 'fault', re: /故障/ },
  { field: 'status', value: 'maintenance', re: /检修|维修/ },
  { field: 'status', value: 'aging', re: /老化/ },
];

/** 操作符识别 */
function detectOperator(text: string): Operator {
  if (/超过|高于|大于|超出|以上|不小于/.test(text)) return text.includes('以上') || text.includes('不小于') ? '>=' : '>';
  if (/低于|小于|不到|以下|不足/.test(text)) return text.includes('以下') ? '<=' : '<';
  if (/等于|正好|恰好|为\s*\d/.test(text)) return '=';
  if (/不是|非|不等于/.test(text)) return '!=';
  if (/包含|含有|含/.test(text)) return 'LIKE';
  return '=';
}

// ============================================================
// 三、表名 / 字段 / 值识别
// ============================================================
export function detectTable(text: string): string {
  for (const t of TABLE_ALIASES) {
    if (t.re.test(text)) return t.table;
  }
  return 'pois';
}

export function detectField(text: string): string | null {
  for (const f of FIELD_ALIASES) {
    if (f.re.test(text)) return f.field;
  }
  return null;
}

export function detectValue(text: string, field: string): string | number | null {
  // 词典值（材质/状态）
  for (const v of VALUE_DICT) {
    if (v.field === field && v.re.test(text)) return v.value;
  }
  // 数值 + 单位
  const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(MPa|mpa|kV|kv|米|m|公里|km|%|％|方|立方米)?/);
  if (numMatch) {
    let value = parseFloat(numMatch[1]);
    const unit = numMatch[2] ?? '';
    if (/公里|km/.test(unit)) value *= 1000; // 距离转米
    if (/%|％/.test(unit)) value /= 100;     // 百分比转 0-1
    return value;
  }
  // 日期
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月)/);
  if (dateMatch) return dateMatch[1];
  return null;
}

// ============================================================
// 四、空间关系识别
// ============================================================
export function detectSpatial(text: string, geometryColumn = 'geom'): SpatialCondition | null {
  // N 米/公里 内/附近/周边：dwithin（带参考半径）
  const nearby = text.match(/(\d+(?:\.\d+)?)\s*(米|m|公里|km|千米)\s*(?:内|以内|范围内|附近|周边)/);
  if (nearby) {
    let radius = parseFloat(nearby[1]);
    if (/公里|km|千米/.test(nearby[2])) radius *= 1000;
    return { relation: 'dwithin', radius, geometryColumn };
  }
  const point = detectReferencePoint(text);
  // 缓冲/范围内：用参考点（或默认中心）构造缓冲圆 → ST_Intersects
  if (/缓冲区|缓冲|范围内|区域.{0,2}内/.test(text)) {
    return { relation: 'buffer', point, geometryColumn };
  }
  // 包含/覆盖（参考几何包含要素）：ST_Contains(refGeom, geom)
  if (/包含|覆盖|涵盖|包围|圈住/.test(text)) {
    return { relation: 'contains', point, geometryColumn };
  }
  // 在…内部/以内（要素在某几何内）：ST_Within(geom, refGeom)
  if (/在.{0,2}内|内部|以内|之中/.test(text)) {
    return { relation: 'within', point, geometryColumn };
  }
  // 相交/叠加：ST_Intersects(geom, refGeom)
  if (/相交|叠加|重叠|交叉/.test(text)) {
    return { relation: 'intersects', point, geometryColumn };
  }
  return null;
}

/** 从文本中识别"某点/坐标/某设施"作为参考几何中心；当前仅支持显式经纬度，否则返回 undefined（由 generate 补中心） */
function detectReferencePoint(text: string): [number, number] | undefined {
  const m = text.match(/([1-2]?\d{2,3}(?:\.\d+)?)\s*[,，]\s*(\d{1,3}(?:\.\d+)?)/);
  if (m) {
    const lng = parseFloat(m[1]);
    const lat = parseFloat(m[2]);
    if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) return [lng, lat];
  }
  return undefined;
}

// ============================================================
// 五、SQL 组装
// ============================================================
function quoteValue(v: string | number): string {
  return typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v);
}

function buildWhere(conditions: AttributeCondition[], spatial: SpatialCondition | null): string {
  const parts: string[] = [];
  for (const c of conditions) {
    parts.push(`${c.field} ${c.operator} ${quoteValue(c.value)}`);
  }
  if (spatial) {
    const col = spatial.geometryColumn;
    // 参考几何：优先 referenceColumn（字段几何），否则用 point 构造缓冲圆
    const refGeom = spatial.referenceColumn
      ? spatial.referenceColumn
      : spatial.point
        ? `ST_Buffer(ST_SetSRID(ST_MakePoint(${spatial.point[0]}, ${spatial.point[1]}), 4326), ${spatial.radius ?? 0})`
        : null;
    switch (spatial.relation) {
      case 'dwithin':
        if (spatial.point && spatial.radius !== undefined) {
          parts.push(`ST_DWithin(${col}, ST_SetSRID(ST_MakePoint(${spatial.point[0]}, ${spatial.point[1]}), 4326), ${spatial.radius})`);
        }
        break;
      case 'buffer':
        // 缓冲区内：以参考几何/参考点缓冲圆判断相交
        if (refGeom) parts.push(`ST_Intersects(${col}, ${refGeom})`);
        break;
      case 'within':
        // 要素在参考几何内
        if (refGeom) parts.push(`ST_Within(${col}, ${refGeom})`);
        break;
      case 'contains':
        // 参考几何包含要素
        if (refGeom) parts.push(`ST_Contains(${refGeom}, ${col})`);
        break;
      case 'intersects':
        // 要素与参考几何相交
        if (refGeom) parts.push(`ST_Intersects(${col}, ${refGeom})`);
        break;
    }
  }
  return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
}

// ============================================================
// 六、主入口
// ============================================================
export interface GenerateOptions {
  /** 参考点（空间查询用，默认武汉中心） */
  center?: [number, number];
  /** 目标几何字段 */
  geometryColumn?: string;
}

export function generatePostGISQuery(text: string, opts: GenerateOptions = {}): GeneratedQuery {
  const center = opts.center ?? [114.305, 30.593];
  const geometryColumn = opts.geometryColumn ?? 'geom';

  const table = detectTable(text);
  const spatial = detectSpatial(text, geometryColumn);
  // 空间查询需要参考点：默认使用中心坐标（buffer/within/intersects/contains 以参考点缓冲圆表达）
  if (spatial && !spatial.point) {
    spatial.point = center;
  }
  // buffer/within/intersects/contains 缺省半径时给一个合理缓冲半径
  if (spatial && spatial.relation !== 'dwithin' && spatial.radius === undefined) {
    spatial.radius = 1000;
  }

  // 属性条件提取
  const conditions: AttributeCondition[] = [];
  const field = detectField(text);
  if (field) {
    const value = detectValue(text, field);
    if (value !== null) {
      conditions.push({ field, operator: detectOperator(text), value });
    }
  }

  // 意图判定
  let intent: NlpgIntent;
  if (spatial && conditions.length > 0) intent = 'mixed';
  else if (spatial) intent = spatial.relation === 'dwithin' ? 'spatial_nearby' : 'spatial_within';
  else if (conditions.length > 0) intent = 'attribute_filter';
  else intent = 'unknown';

  const where = buildWhere(conditions, spatial);
  const sql = `SELECT * FROM ${table} ${where}`.trim();

  // 置信度
  let confidence = 0.3;
  if (conditions.length > 0) confidence += 0.3;
  if (spatial) confidence += 0.3;
  if (table !== 'pois') confidence += 0.1;
  confidence = Math.min(0.95, confidence);

  return { intent, table, conditions, spatial, sql, confidence };
}
