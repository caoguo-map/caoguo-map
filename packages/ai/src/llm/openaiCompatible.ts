/**
 * 通用 OpenAI Chat Completions 兼容客户端（PRD phase-0 §5.5/§5.7 扩展）
 *
 * 任何遵循 OpenAI Chat Completions 协议的服务都可直接对接：
 *   - OpenAI 官方（https://api.openai.com）
 *   - Azure OpenAI
 *   - SiliconFlow、DeepSeek、Moonshot、Together、Groq、OpenRouter 等
 *
 * 与 DeepSeekClient 区别：base_url 与鉴权 header 可自定义；接口形态完全一致，
 * 均为 LlmClient 实现，可互换使用。
 *
 * 重试 / 超时 / JSON 解析策略与 DeepSeekClient 完全一致，确保 provider 切换零行为漂移。
 */

import type { LlmClient } from './types';
import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  JsonChatResult,
} from './deepseek';

export interface OpenAICompatibleConfig {
  /** API Key */
  apiKey: string;
  /** 基础地址（如 https://api.openai.com） */
  baseUrl: string;
  /** 模型名（必填，无默认以免误用 OpenAI gpt-4） */
  model: string;
  /** 温度 0-2，默认 0.3 */
  temperature?: number;
  /** 最大 token，默认 2048 */
  maxTokens?: number;
  /** 超时（ms），默认 30s */
  timeoutMs?: number;
  /** 重试次数，默认 2 */
  retries?: number;
  /** 注入 fetch（测试/Node 环境），默认 globalThis.fetch */
  fetchImpl?: typeof fetch;
  /** 鉴权 header 前缀，默认 'Bearer' */
  authScheme?: 'Bearer' | 'X-Api-Key';
  /** 自定义额外 headers（用于 Azure api-version 等） */
  extraHeaders?: Record<string, string>;
}

function normalizeError(body: string, provider: string): Error {
  const err = new Error(body || `${provider} API 请求失败`);
  err.name = `${provider}Error`;
  return err;
}

export class OpenAICompatibleClient implements LlmClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly authScheme: 'Bearer' | 'X-Api-Key';
  private readonly extraHeaders: Record<string, string>;
  private readonly providerLabel: string;

  constructor(config: OpenAICompatibleConfig) {
    if (!config.apiKey) throw new Error('OpenAICompatibleClient: apiKey 不能为空');
    if (!config.baseUrl) throw new Error('OpenAICompatibleClient: baseUrl 不能为空');
    if (!config.model) throw new Error('OpenAICompatibleClient: model 不能为空');
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.model = config.model;
    this.temperature = config.temperature ?? 0.3;
    this.maxTokens = config.maxTokens ?? 2048;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.retries = config.retries ?? 2;
    this.fetchImpl =
      config.fetchImpl ?? ((globalThis as { fetch?: typeof fetch }).fetch ?? fetch);
    this.authScheme = config.authScheme ?? 'Bearer';
    this.extraHeaders = config.extraHeaders ?? {};
    this.providerLabel = (() => {
      try {
        return new URL(this.baseUrl).hostname || 'LLM';
      } catch {
        return 'LLM';
      }
    })();
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
    return this.requestWithRetry(messages, opts);
  }

  async chatJson<T = unknown>(messages: ChatMessage[]): Promise<JsonChatResult<T>> {
    const result = await this.chat(messages, { json: true });
    const raw = result.content.trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let data: T;
    try {
      data = JSON.parse(cleaned) as T;
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        data = JSON.parse(match[0]) as T;
      } else {
        throw new Error(`${this.providerLabel} 返回了非 JSON 内容: ${raw.slice(0, 200)}`);
      }
    }
    return { data, raw, model: result.model };
  }

  private async requestWithRetry(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        return await this.requestOnce(messages, opts);
      } catch (e) {
        lastError = e as Error;
        if (attempt < this.retries) {
          await this.sleep(Math.min(1000 * 2 ** attempt, 8000));
        }
      }
    }
    throw lastError ?? new Error(`${this.providerLabel} 请求失败`);
  }

  private async requestOnce(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: Boolean(opts.onChunk),
    };
    if (opts.json) {
      body.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.extraHeaders,
    };
    if (this.authScheme === 'Bearer') {
      headers.Authorization = `Bearer ${this.apiKey}`;
    } else {
      headers['X-Api-Key'] = this.apiKey;
    }

    try {
      const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw normalizeError(`${this.providerLabel} HTTP ${res.status}: ${text}`, this.providerLabel);
      }
      if (opts.onChunk && res.body) {
        return this.parseStream(res.body, opts.onChunk);
      }
      const json = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        model?: string;
      };
      const content = json.choices?.[0]?.message?.content ?? '';
      return {
        content,
        model: json.model ?? this.model,
        usage: json.usage
          ? {
              promptTokens: json.usage.prompt_tokens,
              completionTokens: json.usage.completion_tokens,
              totalTokens: json.usage.prompt_tokens + json.usage.completion_tokens,
            }
          : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseStream(
    body: ReadableStream<Uint8Array>,
    onChunk: (delta: string) => void,
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
    return { content, model: this.model };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

/** 便捷工厂 */
export function createOpenAICompatibleClient(config: OpenAICompatibleConfig): OpenAICompatibleClient {
  return new OpenAICompatibleClient(config);
}