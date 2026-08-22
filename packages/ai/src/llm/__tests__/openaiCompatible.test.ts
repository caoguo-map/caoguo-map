import { describe, it, expect, vi } from 'vitest';
import { OpenAICompatibleClient } from '../openaiCompatible';

/** 构造 mock fetch */
function mockFetchOk(body: unknown): typeof fetch {
  return (async () => {
    const text = JSON.stringify(body);
    return new Response(text, { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

function mockFetchFail(status: number, text: string): typeof fetch {
  return (async () => new Response(text, { status })) as typeof fetch;
}

describe('OpenAICompatibleClient', () => {
  it('必填参数校验', () => {
    expect(() => new OpenAICompatibleClient({ apiKey: '', baseUrl: 'x', model: 'm' })).toThrow();
    expect(() => new OpenAICompatibleClient({ apiKey: 'k', baseUrl: '', model: 'm' })).toThrow();
    expect(() => new OpenAICompatibleClient({ apiKey: 'k', baseUrl: 'x', model: '' })).toThrow();
  });

  it('默认 Bearer 鉴权', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: 'hi' } }], model: 'm' })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://api.openai.com',
      model: 'gpt-4o-mini',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const r = await c.chat([{ role: 'user', content: 'hi' }]);
    expect(r.content).toBe('hi');
    const call = fetchMock.mock.calls[0];
    const opts = call[1] as RequestInit;
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer k');
  });

  it('X-Api-Key 鉴权（Anthropic-style 兼容）', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: 'hi' } }], model: 'm' })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'm',
      authScheme: 'X-Api-Key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await c.chat([{ role: 'user', content: 'hi' }]);
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect((opts.headers as Record<string, string>)['X-Api-Key']).toBe('k');
    expect((opts.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('extraHeaders 注入（Azure api-version 场景）', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: 'hi' } }], model: 'm' })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.azure.com',
      model: 'm',
      extraHeaders: { 'api-version': '2024-02-15-preview' },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await c.chat([{ role: 'user', content: 'hi' }]);
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect((opts.headers as Record<string, string>)['api-version']).toBe('2024-02-15-preview');
  });

  it('baseUrl 尾部斜杠自动剥离', () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: 'hi' } }] })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com///',
      model: 'm',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    return c.chat([{ role: 'user', content: 'x' }]).then(() => {
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toBe('https://example.com/chat/completions');
    });
  });

  it('JSON 模式自动剥围栏', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: '```json\n{"x":1}\n```' } }] })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'm',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const r = await c.chatJson<{ x: number }>([{ role: 'user', content: 'y' }]);
    expect(r.data.x).toBe(1);
  });

  it('JSON 模式容错提取（首对花括号）', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: '前缀文字 {\"x\":1} 尾文字' } }] })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'm',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const r = await c.chatJson<{ x: number }>([{ role: 'user', content: 'y' }]);
    expect(r.data.x).toBe(1);
  });

  it('JSON 模式无可解析内容抛错', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: '纯文本无 JSON' } }] })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'm',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(c.chatJson([{ role: 'user', content: 'y' }])).rejects.toThrow(/非 JSON/);
  });

  it('HTTP 错误抛错（带状态码与响应文本）', async () => {
    const fetchMock = vi.fn().mockImplementation(mockFetchFail(429, 'rate limited'));
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'm',
      retries: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(c.chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/HTTP 429/);
  });

  it('usage 字段正确解析（含 prompt/completion/total）', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({
        choices: [{ message: { content: 'hi' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'm',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const r = await c.chat([{ role: 'user', content: 'x' }]);
    expect(r.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
  });

  it('响应无 usage 字段时不抛错', async () => {
    const fetchMock = vi.fn().mockImplementation(
      mockFetchOk({ choices: [{ message: { content: 'hi' } }] })
    );
    const c = new OpenAICompatibleClient({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'm',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const r = await c.chat([{ role: 'user', content: 'x' }]);
    expect(r.usage).toBeUndefined();
  });
});