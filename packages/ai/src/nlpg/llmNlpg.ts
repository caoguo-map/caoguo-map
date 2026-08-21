/**
 * NLPG LLM 模式（PRD phase-0 §5.7 N-6「LLM 生成 SQL」）
 *
 * 在规则引擎（sqlGenerator.ts）基础上，接入 DeepSeek 实现：
 *   - 复杂自然语言 → PostGIS SQL（突破固定字段/空间模板）
 *   - LLM 优先，失败自动降级规则引擎
 *   - 生成的 SQL 必经 sqlValidator 安全校验层方可执行
 */

import type { DeepSeekClient, ChatMessage } from '../llm/deepseek';
import { generatePostGISQuery, type GeneratedQuery } from './sqlGenerator';
import { validateSql, parameterize, DEFAULT_ALLOWED_TABLES } from './sqlValidator';

export interface LlmNlpgConfig {
  client: DeepSeekClient;
  enabled?: boolean;
  /** 授权表白名单（传给校验层） */
  allowedTables?: string[];
}

interface LlmSqlOutput {
  sql?: string;
  table?: string;
  intent?: string;
}

const SYSTEM_PROMPT = `你是"草果地图"管网自然语言查询助手。用户用中文描述数据查询需求，你生成 PostGIS SQL（仅 SELECT）。

规则：
1. 只返回 JSON：{"sql":"SELECT ...","table":"...","intent":"..."}
2. 表名只能来自以下白名单：${DEFAULT_ALLOWED_TABLES.join(', ')}
3. 空间查询可用 ST_DWithin / ST_Within / ST_Intersects / ST_Contains / ST_Buffer / ST_MakePoint / ST_SetSRID / ST_Distance / ST_AsGeoJSON / ST_Transform
4. 只生成 SELECT 语句，禁止 DROP/DELETE/UPDATE/INSERT/ALTER 等写操作
5. 字段名使用 snake_case，坐标使用 WGS84（SRID 4326）
6. 不要输出 JSON 以外的任何文字。`;

export class LlmNlpg {
  private client: DeepSeekClient;
  private enabled: boolean;
  private allowedTables: string[];

  constructor(config: LlmNlpgConfig) {
    this.client = config.client;
    this.enabled = config.enabled ?? true;
    this.allowedTables = config.allowedTables ?? DEFAULT_ALLOWED_TABLES;
  }

  /**
   * 自然语言查询。
   * LLM 优先，失败或校验不过时降级到规则引擎。
   */
  async query(text: string): Promise<{ query: GeneratedQuery; valid: boolean; parameterized?: { sql: string; params: string[] } }> {
    if (this.enabled) {
      try {
        const llmResult = await this.queryWithLlm(text);
        if (llmResult) return llmResult;
      } catch {
        // 降级规则引擎
      }
    }
    return this.queryWithRules(text);
  }

  private async queryWithLlm(
    text: string
  ): Promise<{ query: GeneratedQuery; valid: boolean; parameterized?: { sql: string; params: string[] } } | null> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ];
    const { data } = await this.client.chatJson<LlmSqlOutput>(messages);
    const sql = (data.sql ?? '').trim();
    if (!sql) return null;

    // 必经安全校验层
    const validation = validateSql(sql, this.allowedTables);
    if (!validation.valid) return null;

    const query: GeneratedQuery = {
      intent: 'mixed',
      table: data.table ?? 'pois',
      conditions: [],
      spatial: null,
      sql,
      confidence: 0.9,
    };
    return { query, valid: true, parameterized: parameterize(sql) };
  }

  private queryWithRules(
    text: string
  ): { query: GeneratedQuery; valid: boolean; parameterized?: { sql: string; params: string[] } } {
    const query = generatePostGISQuery(text);
    const validation = validateSql(query.sql, this.allowedTables);
    return {
      query,
      valid: validation.valid,
      parameterized: validation.valid ? parameterize(query.sql) : undefined,
    };
  }
}
