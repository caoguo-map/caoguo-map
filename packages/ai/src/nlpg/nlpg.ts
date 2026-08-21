/**
 * NLPG v1 主入口（PRD phase-0 §5.7）
 *
 * 自然语言 → PostGIS SQL → 安全校验 → 可执行结果。
 *
 * 用法：
 *   const result = nlpgQuery('查出使用超过 20 年的铸铁燃气管');
 *   result.sql         // 生成的 SQL
 *   result.valid       // 是否通过安全校验
 *   result.validation  // 校验详情
 */

import { generatePostGISQuery, type GeneratedQuery, type GenerateOptions } from './sqlGenerator';
import { validateSql, parameterize, type ValidationResult } from './sqlValidator';

export interface NlpgResult {
  /** 生成的查询 */
  query: GeneratedQuery;
  /** 是否通过安全校验 */
  valid: boolean;
  /** 校验详情 */
  validation: ValidationResult;
  /** 参数化后的 SQL（$n 占位符） */
  parameterized?: { sql: string; params: string[] };
}

/**
 * 自然语言查询入口。
 */
export function nlpgQuery(text: string, opts: GenerateOptions = {}): NlpgResult {
  const query = generatePostGISQuery(text, opts);
  const validation = validateSql(query.sql);
  const valid = validation.valid;
  const parameterized = valid ? parameterize(query.sql) : undefined;

  return { query, valid, validation, parameterized };
}

export type { GeneratedQuery, GenerateOptions };
export { generatePostGISQuery, validateSql, parameterize };
