import { describe, it, expect, vi } from 'vitest';
import { DeepSeekClient } from '../../llm/deepseek';
import { LlmNlpg } from '../llmNlpg';

function makeClient(respondWith: unknown, ok = true): DeepSeekClient {
  const fetchMock = vi.fn(async () => {
    if (!ok) return new Response('', { status: 500 });
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(respondWith) } }] }),
      { status: 200 }
    );
  }) as unknown as typeof fetch;
  return new DeepSeekClient({ apiKey: 'k', fetchImpl: fetchMock, retries: 0 });
}

describe('LlmNlpg LLM 优先', () => {
  it('LLM 返回合法 SQL 时采用并通过校验', async () => {
    const client = makeClient({
      sql: "SELECT * FROM pipelines WHERE material = 'cast_iron'",
      table: 'pipelines',
    });
    const nlpg = new LlmNlpg({ client });
    const r = await nlpg.query('查出铸铁管');
    expect(r.valid).toBe(true);
    expect(r.query.sql).toContain('pipelines');
    expect(r.parameterized).toBeDefined();
  });

  it('LLM 返回危险 SQL 时被校验层拒绝并降级', async () => {
    const client = makeClient({
      sql: 'DROP TABLE pipelines',
      table: 'pipelines',
    });
    const nlpg = new LlmNlpg({ client });
    const r = await nlpg.query('删掉管线表');
    // 降级到规则引擎，且规则引擎生成的是 SELECT
    expect(r.query.sql).toContain('SELECT');
    expect(r.valid).toBe(true);
  });

  it('LLM 返回非法表时被拒绝并降级', async () => {
    const client = makeClient({
      sql: 'SELECT * FROM secret_table',
      table: 'secret_table',
    });
    const nlpg = new LlmNlpg({ client });
    const r = await nlpg.query('查秘密表');
    expect(r.query.sql).toContain('SELECT');
  });

  it('LLM 抛错时降级规则引擎', async () => {
    const client = makeClient(null, false);
    const nlpg = new LlmNlpg({ client });
    const r = await nlpg.query('500 米内有几所学校');
    expect(r.valid).toBe(true);
    expect(r.query.sql).toContain('ST_DWithin');
  });

  it('disabled 时纯规则引擎', async () => {
    const client = makeClient({ sql: 'SELECT * FROM pipelines' });
    const nlpg = new LlmNlpg({ client, enabled: false });
    const r = await nlpg.query('查出使用超过 20 年的铸铁燃气管');
    expect(r.query.sql).toContain('pipelines');
    expect(r.query.sql).toContain('material');
  });
});
