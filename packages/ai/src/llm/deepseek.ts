/**
 * DeepSeek LLM 客户端（PRD phase-0 §5.5 / §5.7 的 v1 后端能力）
 *
 * DeepSeek API 与 OpenAI Chat Completions 协议兼容：
 *   base_url: https://api.deepseek.com
 *   模型:     deepseek-chat（通用对话）/ deepseek-reasoner（深度推理）
 *   鉴权:     Authorization: Bearer <API_KEY>
 *
 * 设计：
 *   - 依赖注入的 fetch（浏览器/Node 均可运行，Node 18+ 原生 fetch）
 *   - 自动重试（指数退避）
 *   - 失败降级（可传入 fallback，规则引擎兜底）
 *   - 支持流式（onChunk 回调）与 JSON 输出
 */

export interface DeepSeekConfig {
  /** API Key */
  apiKey: string;
  /** 基础地址，默认 https://api.deepseek.com */
  baseUrl?: string;
  /** 模型，默认 deepseek-chat */
  model?: 'deepseek-chat' | 'deepseek-reasoner' | (string & {});
  /** 温度 0-2 */
  temperature?: number;
  /** 最大 token */
  maxTokens?: number;
  /** 超时（ms），默认 30s */
  timeoutMs?: number;
  /** 重试次数，默认 2 */
  retries?: number;
  /** 注入 fetch（测试/Node 环境），默认 globalThis.fetch */
  fetchImpl?: typeof fetch;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  /** 是否启用 JSON 模式（要求模型返回纯 JSON） */
  json?: boolean;
  /** 流式回调 */
  onChunk?: (delta: string) => void;
}

export interface ChatResult {
  /** 完整回复文本 */
  content: string;
  /** 消耗 token */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  /** 使用的模型 */
  model: string;
}

/** 已解析的 JSON 回复 */
export interface JsonChatResult<T> {
  /** 解析出的 JSON 对象 */
  data: T;
  /** 原始文本 */
  raw: string;
  model: string;
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

/** 把中文异常文案简化为错误码 */
function normalizeError(body: string): Error {
  const err = new Error(body || 'DeepSeek API 请求失败');
  err.name = 'DeepSeekError';
  return err;
}

export class DeepSeekClient {
  private config: Required<Omit<DeepSeekConfig, 'fetchImpl'>> & { fetchImpl: typeof fetch };
  private lastRequestId = 0;

  constructor(config: DeepSeekConfig) {
    if (!config.apiKey) throw new Error('DeepSeekClient: apiKey 不能为空');
    this.config = {
      apiKey: config.apiKey,
      baseUrl: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
      model: config.model ?? DEFAULT_MODEL,
      temperature: config.temperature ?? 0.3,
      maxTokens: config.maxTokens ?? 2048,
      timeoutMs: config.timeoutMs ?? 30000,
      retries: config.retries ?? 2,
      fetchImpl: config.fetchImpl ?? ((globalThis as { fetch?: typeof fetch }).fetch ?? fetch),
    };
  }

  /** 发起一次聊天补全 */
  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
    return this.requestWithRetry(messages, opts);
  }

  /** 聊天 + JSON 解析 */
  async chatJson<T>(messages: ChatMessage[]): Promise<JsonChatResult<T>> {
    const result = await this.chat(messages, { json: true });
    const raw = result.content.trim();
    // 去除可能的 ```json 围栏
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let data: T;
    try {
      data = JSON.parse(cleaned) as T;
    } catch (e) {
      // 尝试从文本中提取首个 JSON 对象
      const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        data = JSON.parse(match[0]) as T;
      } else {
        throw new Error(`DeepSeek 返回了非 JSON 内容: ${raw.slice(0, 200)}`);
      }
    }
    return { data, raw, model: result.model };
  }

  private async requestWithRetry(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        return await this.requestOnce(messages, opts);
      } catch (e) {
        lastError = e as Error;
        // 仅对可重试错误（网络/429/5xx）重试
        const retryable = !(e instanceof Error) || !e.name.includes('DeepSeek') || this.isRetryable(e as Error);
        if (!retryable && !this.isRetryable(e as Error)) break;
        if (attempt < this.config.retries) {
          await this.sleep(Math.min(1000 * 2 ** attempt, 8000));
        }
      }
    }
    throw lastError ?? new Error('DeepSeek 请求失败');
  }

  private isRetryable(err: Error): boolean {
    const msg = err.message ?? '';
    return /429|500|502|503|504|timeout|network|ECONN|abort|fetch failed/i.test(msg);
  }

  private async requestOnce(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    const { fetchImpl } = this.config;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: Boolean(opts.onChunk),
    };
    if (opts.json) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const res = await fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw normalizeError(`DeepSeek HTTP ${res.status}: ${text}`);
      }

      // 流式
      if (opts.onChunk && res.body) {
        return this.parseStream(res.body, opts.onChunk);
      }

      // 非流式
      const json = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        model?: string;
      };
      const content = json.choices?.[0]?.message?.content ?? '';
      return {
        content,
        model: json.model ?? this.config.model,
        usage: json.usage
          ? { promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens, totalTokens: json.usage.total_tokens }
          : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** 解析 SSE 流式响应 */
  private async parseStream(
    body: ReadableStream<Uint8Array>,
    onChunk: (delta: string) => void
  ): Promise<ChatResult> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            content += delta;
            onChunk(delta);
          }
        } catch {
          // 忽略无法解析的行
        }
      }
    }
    return { content, model: this.config.model };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

/** 便捷工厂：创建默认配置的客户端 */
export function createDeepSeekClient(config: DeepSeekConfig): DeepSeekClient {
  return new DeepSeekClient(config);
}
