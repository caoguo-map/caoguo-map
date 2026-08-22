/**
 * 统一 LLM 客户端接口（facade）
 *
 * 任何实现该接口的对象都可被注入到 ai 包的 Copilot / NLPG / 后续 LLM 增强模块。
 * 当前 ai 包内部默认实现：
 * - DeepSeekClient         （DeepSeek 官方 API）
 * - OpenAICompatibleClient （任意 OpenAI Chat Completions 兼容服务，含 OpenAI 官方、
 *                              Azure OpenAI、SiliconFlow、Together、Groq 等）
 *
 * 设计要点：
 *  1. 仅暴露与业务相关的最小表面（chat/chatJson），不暴露各家差异
 *  2. 流式通过 onChunk 回调注入，与 provider 无关
 *  3. JSON 解析容错（自动剥围栏、容错提取）作为接口约定，**所有实现都必须做**
 *  4. fetch 可注入，便于 Node 测试/SSR/CI 环境
 */
import type { ChatMessage, ChatOptions, ChatResult, JsonChatResult } from './deepseek';

export interface LlmClient {
  /** 发起一次聊天补全 */
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
  /** 聊天 + 自动 JSON 解析（自动剥 ```json 围栏、容错提取） */
  chatJson<T = unknown>(messages: ChatMessage[]): Promise<JsonChatResult<T>>;
}

/** 重新导出常用类型，便于用户统一从 llm/types 导入 */
export type { ChatMessage, ChatOptions, ChatResult, JsonChatResult };