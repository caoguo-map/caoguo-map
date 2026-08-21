/**
 * PipelineNlp 组件类（占位 stub）
 *
 * 包装 parsePipelineQuery + 与 BurstSimulator 路由集成
 */

import { parsePipelineQuery, type PipelineNlpResult, type PipelineNlpIntent } from './pipelineNlp';
import type { BurstSimulator } from '../burst/burstClass';

export interface PipelineNlpOptions {
  burstSimulator?: BurstSimulator;
  onIntent?: (intent: PipelineNlpIntent, result: PipelineNlpResult) => void;
}

export class PipelineNlp {
  private burstSimulator?: BurstSimulator;
  private onIntent?: PipelineNlpOptions['onIntent'];

  constructor(options: PipelineNlpOptions = {}) {
    this.burstSimulator = options.burstSimulator;
    this.onIntent = options.onIntent;
  }

  /** 解析并按意图触发动作 */
  query(text: string): PipelineNlpResult {
    const result = parsePipelineQuery(text);
    if (this.onIntent) this.onIntent(result.intent, result);
    return result;
  }

  /** 仅解析不触发动作 */
  parse(text: string): PipelineNlpResult {
    return parsePipelineQuery(text);
  }

  /** 关联 BurstSimulator */
  setBurstSimulator(sim: BurstSimulator): void {
    this.burstSimulator = sim;
  }
}
