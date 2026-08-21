import { describe, it, expect, vi } from 'vitest';
import { DeepSeekClient } from '../../llm/deepseek';
import { LlmMapCopilot } from '../llmCopilot';

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

describe('LlmMapCopilot LLM 优先', () => {
  it('LLM 返回有效代码时直接采用', async () => {
    const client = makeClient({
      intent: 'add_marker',
      code: "map.addLayer({ type: 'circle' })",
      description: 'LLM 生成',
    });
    const copilot = new LlmMapCopilot({ client });
    const r = await copilot.generate('加个点');
    expect(r.code).toContain('circle');
    expect(r.confidence).toBe(0.9);
  });

  it('LLM 返回 unknown 时降级规则引擎', async () => {
    const client = makeClient({ intent: 'unknown', code: '' });
    const copilot = new LlmMapCopilot({ client });
    const r = await copilot.generate('创建一个武汉地图');
    // 规则引擎应识别 create_map
    expect(r.intent).toBe('create_map');
    expect(r.code).toContain('CaoguoMap.Map');
  });

  it('LLM 抛错时降级规则引擎', async () => {
    const client = makeClient(null, false);
    const copilot = new LlmMapCopilot({ client });
    const r = await copilot.generate('在光谷加个红色标记');
    expect(r.intent).toBe('add_marker');
    expect(r.code).toContain('circle');
  });

  it('disabled 时纯规则引擎', async () => {
    const client = makeClient({ intent: 'add_marker', code: 'fake' });
    const copilot = new LlmMapCopilot({ client, enabled: false });
    const r = await copilot.generate('创建地图');
    expect(r.intent).toBe('create_map');
    expect(r.code).toContain('CaoguoMap.Map');
  });
});
