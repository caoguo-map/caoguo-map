/**
 * NLPG SQL 安全校验层（PRD phase-0 §5.7 N-5 / §5.7.3）
 *
 * 所有 LLM/规则生成的 SQL 必须经过以下校验方可执行：
 *   1. 语法校验（引号/括号配对、非空）
 *   2. 白名单表检查（只允许查询授权表）
 *   3. 危险操作拦截（DROP/DELETE/UPDATE/INSERT/ALTER/TRUNCATE/GRANT 等全部拒绝）
 *   4. 仅允许 SELECT 只读查询
 *   5. 参数化占位（防止 SQL 注入的字面量转义）
 *
 * 纯函数，可在 Node/浏览器两侧运行。
 */

export interface ValidationIssue {
  severity: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface ValidationResult {
  /** 是否通过（无 error 级问题） */
  valid: boolean;
  issues: ValidationIssue[];
}

/** 危险关键字（拒绝执行） */
const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE',
  'MERGE', 'CREATE', 'REPLACE', 'EXEC', 'EXECUTE', 'CALL', 'COPY', 'LOAD',
  'INTO', 'SET', 'UNION', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'REINDEX',
];

/** 危险注释/注入特征 */
const INJECTION_PATTERNS = [
  /--/,                 // SQL 注释
  /\/\*/,               // 块注释
  /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)/i, // 多语句注入
  /'\s*OR\s*'/i,        // ' OR ' 恒真注入（含 ' OR '1'='1'）
  /"\s*OR\s*"/i,        // " OR " 恒真注入
  /\bOR\s+\d+\s*=\s*\d+\b/i,           // OR 1=1 恒真
  /\bOR\s+'\w*'\s*=\s*'\w*'/i,         // OR 'a'='a' 恒真
  /UNION\s+SELECT/i,
];

/** 默认白名单表（只读授权） */
export const DEFAULT_ALLOWED_TABLES = [
  'pipelines', 'nodes', 'users', 'schools', 'hospitals', 'substations',
  'base_stations', 'rivers', 'reservoirs', 'alarms', 'pois',
];

/** 允许的空间函数 */
const ALLOWED_SPATIAL_FUNCTIONS = [
  'ST_DWithin', 'ST_Within', 'ST_Intersects', 'ST_Contains', 'ST_Buffer',
  'ST_MakePoint', 'ST_SetSRID', 'ST_Distance', 'ST_AsGeoJSON', 'ST_Transform',
];

/**
 * 校验 SQL。
 * @param sql 待校验 SQL
 * @param allowedTables 白名单表（默认 DEFAULT_ALLOWED_TABLES）
 */
export function validateSql(sql: string, allowedTables: string[] = DEFAULT_ALLOWED_TABLES): ValidationResult {
  const issues: ValidationIssue[] = [];
  const upper = sql.toUpperCase().trim();

  // 1) 非空
  if (!sql.trim()) {
    issues.push({ severity: 'error', rule: 'non_empty', message: 'SQL 不能为空' });
    return { valid: false, issues };
  }

  // 2) 必须以 SELECT 开头（只读）
  if (!upper.startsWith('SELECT')) {
    issues.push({ severity: 'error', rule: 'read_only', message: '仅允许 SELECT 只读查询' });
  }

  // 3) 危险操作拦截
  for (const kw of DANGEROUS_KEYWORDS) {
    // 用词边界匹配，避免误伤字段名（如 "status" 含 "set" 的误判）
    const re = new RegExp(`\\b${kw}\\b`, 'i');
    if (re.test(sql) && !(kw === 'SET' && /ST_SetSRID/i.test(sql))) {
      issues.push({ severity: 'error', rule: 'dangerous_keyword', message: `检测到危险关键字 ${kw}` });
    }
  }

  // 4) 注入特征拦截
  for (const p of INJECTION_PATTERNS) {
    if (p.test(sql)) {
      issues.push({ severity: 'error', rule: 'injection', message: '检测到 SQL 注入特征' });
    }
  }

  // 5) 白名单表检查
  const fromMatch = upper.match(/FROM\s+([A-Za-z_][\w]*)/);
  if (fromMatch) {
    const table = fromMatch[1].toLowerCase();
    if (!allowedTables.includes(table)) {
      issues.push({ severity: 'error', rule: 'table_whitelist', message: `表 ${table} 不在授权白名单内` });
    }
  }

  // 6) 引号/括号配对
  const singleQuotes = (sql.match(/'/g) ?? []).length;
  if (singleQuotes % 2 !== 0) {
    issues.push({ severity: 'error', rule: 'syntax', message: '单引号未配对' });
  }
  const openParen = (sql.match(/\(/g) ?? []).length;
  const closeParen = (sql.match(/\)/g) ?? []).length;
  if (openParen !== closeParen) {
    issues.push({ severity: 'error', rule: 'syntax', message: '括号未配对' });
  }

  // 7) 空间函数白名单检查（若用到空间函数）
  for (const fn of ['ST_']) {
    const fnMatch = sql.match(/ST_(\w+)/g) ?? [];
    for (const m of fnMatch) {
      if (!ALLOWED_SPATIAL_FUNCTIONS.includes(m)) {
        issues.push({ severity: 'error', rule: 'spatial_whitelist', message: `空间函数 ${m} 不在白名单内` });
      }
    }
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

/** 参数化：把 SQL 中的字符串字面量替换为 $n 占位符（防注入） */
export function parameterize(sql: string): { sql: string; params: string[] } {
  const params: string[] = [];
  const out = sql.replace(/'([^']*)'/g, (_m, v: string) => {
    params.push(v);
    return `$${params.length}`;
  });
  return { sql: out, params };
}
