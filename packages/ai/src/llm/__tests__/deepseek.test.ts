import { describe, it, expect, vi } from 'vitest';
import { DeepSeekClient } from '../deepseek';

/** 构造 mock fetch，返回指定 JSON */
function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

describe('DeepSeekClient 基础', () => {
  it('缺少 apiKey 抛错', () => {
    expect(() => new DeepSeekClient({ apiKey: '' })).toThrow();
  });

  it('非流式聊天返回内容', async () => {
    const client = new DeepSeekClient({
      apiKey: 'test-key',
      fetchImpl: mockFetch({
        choices: [{ message: { content: '你好' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'deepseek-chat',
      }),
    });
    const r = await client.chat([{ role: 'user', content: 'hi' }]);
    expect(r.content).toBe('你好');
    expect(r.usage?.totalTokens).toBe(15);
  });

  it('请求体包含正确的 headers 和 model', async () => {
    const fetchMock = mockFetch({ choices: [{ message: { content: 'ok' } }] });
    const client = new DeepSeekClient({
      apiKey: 'secret',
      model: 'deepseek-reasoner',
      fetchImpl: fetchMock,
    });
    await client.chat([{ role: 'user', content: 'x' }]);

    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer secret');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('deepseek-reasoner');
  });
});

describe('DeepSeekClient JSON 模式', () => {
  it('解析 JSON 回复', async () => {
    const client = new DeepSeekClient({
      apiKey: 'k',
      fetchImpl: mockFetch({ choices: [{ message: { content: '{"a":1}' } }] }),
    });
    const r = await client.chatJson<{ a: number }>([{ role: 'user', content: 'x' }]);
    expect(r.data.a).toBe(1);
  });

  it('去除 ```json 围栏', async () => {
    const client = new DeepSeekClient({
      apiKey: 'k',
      fetchImpl: mockFetch({ choices: [{ message: { content: '```json\n{"b":2}\n```' } }] }),
    });
    const r = await client.chatJson<{ b: number }>([{ role: 'user', content: 'x' }]);
    expect(r.data.b).toBe(2);
  });
});

describe('DeepSeekClient 错误处理', () => {
  it('非 200 抛错', async () => {
    const client = new DeepSeekClient({
      apiKey: 'k',
      fetchImpl: mockFetch({ error: 'invalid key' }, 401),
      retries: 0,
    });
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/401/);
  });

  it('超时抛错', async () => {
    const slowFetch = vi.fn(async () => {
      return new Promise((_r, reject) => {
        setTimeout(() => reject(new Error('abort')), 50);
      });
    }) as unknown as typeof fetch;
    const client = new DeepSeekClient({
      apiKey: 'k',
      fetchImpl: slowFetch,
      timeoutMs: 10,
      retries: 0,
    });
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toThrow();
  });
});

describe('DeepSeekClient 流式', () => {
  it('SSE 流式累积内容', async () => {
    // 构造 SSE 流
    const streamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        const chunks = [
          'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
          'data: [DONE]\n\n',
        ];
        for (const c of chunks) {
          controller.enqueue(new TextEncoder().encode(c));
        }
        controller.close();
      },
    });
    const fetchMock = vi.fn(async () => new Response(streamBody, { status: 200 })) as unknown as typeof fetch;

    const client = new DeepSeekClient({ apiKey: 'k', fetchImpl: fetchMock });
    const deltas: string[] = [];
    const r = await client.chat([{ role: 'user', content: 'x' }], { onChunk: (d) => deltas.push(d) });
    expect(r.content).toBe('你好');
    expect(deltas).toEqual(['你', '好']);
  });
});
