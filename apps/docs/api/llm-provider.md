# LLM Provider（多 provider 扩展）

> 隶属 `@caoguo/ai` 包。来源：`packages/ai/src/llm/`

`DeepSeekClient` 仍是默认实现。`OpenAICompatibleClient` 用于对接任意遵循 OpenAI Chat Completions 协议的服务（OpenAI 官方、Azure OpenAI、SiliconFlow、Together、Groq、OpenRouter 等）。

---

## `LlmClient` 接口（统一 facade）

```ts
interface LlmClient {
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
  chatJson<T = unknown>(messages: ChatMessage[]): Promise<JsonChatResult<T>>;
}
```

任何实现该接口的对象都可被注入 ai 包的 Copilot / NLPG / 后续 LLM 增强模块。

## `OpenAICompatibleClient`

```ts
import { OpenAICompatibleClient } from '@caoguo/ai';

const client = new OpenAICompatibleClient({
  apiKey: 'sk-...',
  baseUrl: 'https://api.openai.com',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 2048,
  timeoutMs: 30000,
  retries: 2,
  // 可选：Azure 场景
  // authScheme: 'X-Api-Key',
  // extraHeaders: { 'api-version': '2024-02-15-preview' },
});

const r = await client.chat([
  { role: 'system', content: '你是助手' },
  { role: 'user', content: '你好' },
]);

const json = await client.chatJson<{ sql: string }>([
  { role: 'system', content: '...' },
  { role: 'user', content: '生成 SQL' },
]);
```

## 与 DeepSeek 互换

两者接口完全一致，可直接互换使用：

```ts
import { DeepSeekClient } from '@caoguo/ai';
import { LlmNlpg, LlmMapCopilot } from '@caoguo/ai';

const deepseek = new DeepSeekClient({ apiKey: 'sk-...' });
const openai = new OpenAICompatibleClient({
  apiKey: 'sk-...',
  baseUrl: 'https://api.openai.com',
  model: 'gpt-4o-mini',
});

// 都满足 LlmClient 接口
const nlpg = new LlmNlpg({ client: deepseek });      // 同样支持 openai
const copilot = new LlmMapCopilot({ client: openai });
```

## 重试 / 降级

两个客户端均内置：
- **指数退避重试**（默认 2 次）
- **超时**（默认 30s）
- **JSON 解析容错**（自动剥 ```json 围栏 + 容错提取首个 JSON 块）

## 流式输出

```ts
const result = await client.chat(
  [{ role: 'user', content: '流式输出' }],
  {
    onChunk: (delta) => console.log('增量:', delta),
  }
);
console.log('总内容:', result.content);
```