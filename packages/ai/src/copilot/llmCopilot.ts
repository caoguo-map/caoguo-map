/**
 * MapCopilot LLM 模式（PRD phase-0 §5.5 I-6「LLM 增强」）
 *
 * 在规则引擎（copilot.ts）基础上，接入 DeepSeek 大模型实现：
 *   - 自然语言 → 地图代码生成的「自由意图」支持（突破 5 类模板限制）
 *   - LLM 优先，失败自动降级到规则引擎
 *
 * 安全设计：
 *   - 生成的代码片段仅返回文本，由上层决定是否执行（不在本模块 eval）
 *   - 通过 system prompt 约束输出格式与 API 白名单
 */

import type { DeepSeekClient, ChatMessage } from '../llm/deepseek';
import { generateFromQuery, type CopilotResult, type CopilotIntent } from './copilot';

export interface LlmCopilotConfig {
  /** DeepSeek 客户端 */
  client: DeepSeekClient;
  /** 是否启用 LLM（false 则退化为纯规则引擎） */
  enabled?: boolean;
}

/** LLM 返回的代码生成结果结构 */
interface LlmCopilotOutput {
  intent?: string;
  code: string;
  description?: string;
}

/** 系统提示词：约束模型只生成草果地图 API 代码 */
const SYSTEM_PROMPT = `你是"草果地图"(CaoguoMap) 的地图代码生成助手。用户用自然语言描述地图需求，你生成对应的 MapLibre GL JS 代码片段。

草果地图 API 约定：
- 地图实例：new CaoguoMap.Map({ container, center, zoom, style })
- 添加点：map.addSource + map.addLayer({ type: 'circle' })
- 添加线：map.addLayer({ type: 'line' })
- 热力图：map.addLayer({ type: 'heatmap' })
- 弹窗：map.on('click', layerId, cb) + new maplibregl.Popup()

要求：
1. 只返回 JSON，格式：{"intent":"create_map|add_marker|add_line_polygon|heatmap|popup_interaction","code":"...","description":"..."}
2. code 必须是可直接运行的 JavaScript 代码片段（不含 import），禁止包含任何 fetch/网络请求/文件系统/危险操作。
3. 若需求超出地图代码范畴，返回 {"intent":"unknown","code":"","description":"无法识别的需求"}。
4. 不要输出 JSON 以外的任何文字。`;

export class LlmMapCopilot {
  private client: DeepSeekClient;
  private enabled: boolean;

  constructor(config: LlmCopilotConfig) {
    this.client = config.client;
    this.enabled = config.enabled ?? true;
  }

  /** 生成代码：LLM 优先，失败降级规则引擎 */
  async generate(query: string): Promise<CopilotResult> {
    if (!this.enabled) {
      return generateFromQuery(query);
    }
    try {
      return await this.generateWithLlm(query);
    } catch {
      // LLM 失败降级到规则引擎
      return generateFromQuery(query);
    }
  }

  private async generateWithLlm(query: string): Promise<CopilotResult> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: query },
    ];
    const { data } = await this.client.chatJson<LlmCopilotOutput>(messages);

    const intent = (data.intent ?? 'unknown') as CopilotIntent;
    const code = data.code ?? '';
    // 若 LLM 返回未知意图或空代码，降级规则引擎
    if (intent === 'unknown' || !code.trim()) {
      return generateFromQuery(query);
    }
    return {
      intent,
      params: {},
      code,
      confidence: 0.9,
      description: data.description ?? `LLM 生成（${intent}）`,
    };
  }
}
