/**
 * PipelineNlp 组件类
 *
 * 包装 parsePipelineQuery + 与 BurstSimulator 联动推演。
 * 当识别为爆管意图且已关联 BurstSimulator 时，自动触发空间推演。
 */

import { parsePipelineQuery, type PipelineNlpResult, type PipelineNlpIntent } from './pipelineNlp';
import type { BurstSimulator } from '../burst/burstClass';
import type { PipelineTopologyDataset } from '../types';

export interface PipelineNlpOptions {
  burstSimulator?: BurstSimulator;
  dataset?: PipelineTopologyDataset;
  onIntent?: (intent: PipelineNlpIntent, result: PipelineNlpResult) => void;
  onBurst?: (result: ReturnType<BurstSimulator['simulate']>) => void;
}

export class PipelineNlp {
  private burstSimulator?: BurstSimulator;
  private dataset?: PipelineTopologyDataset;
  private onIntent?: PipelineNlpOptions['onIntent'];
  private onBurst?: PipelineNlpOptions['onBurst'];
  private lastResult: PipelineNlpResult | null = null;
  private lastBurst: ReturnType<BurstSimulator['simulate']> | null = null;

  constructor(options: PipelineNlpOptions = {}) {
    this.burstSimulator = options.burstSimulator;
    this.dataset = options.dataset;
    this.onIntent = options.onIntent;
    this.onBurst = options.onBurst;
  }

  /** 解析并按意图触发动作（爆管意图自动联动推演） */
  query(text: string): PipelineNlpResult {
    const result = parsePipelineQuery(text);
    this.lastResult = result;
    if (this.onIntent) this.onIntent(result.intent, result);

    if (result.intent === 'burst' && this.burstSimulator) {
      const pipeId = this.resolveBurstPipeId(text);
      if (pipeId) {
        this.lastBurst = this.burstSimulator.simulate(pipeId);
        if (this.onBurst) this.onBurst(this.lastBurst);
      }
    }
    return result;
  }

  /** 仅解析不触发动作 */
  parse(text: string): PipelineNlpResult {
    return parsePipelineQuery(text);
  }

  /** 关联 BurstSimulator 与数据集（联动推演用） */
  setBurstSimulator(sim: BurstSimulator, dataset?: PipelineTopologyDataset): void {
    this.burstSimulator = sim;
    if (dataset) this.dataset = dataset;
  }

  /** 取最近一次联动推演结果 */
  getLastBurst(): ReturnType<BurstSimulator['simulate']> | null {
    return this.lastBurst;
  }

  /**
   * 从查询文本解析爆管管段 id。
   * 优先匹配「pipe-xxx / 管段xxx」显式编号；否则回退到数据集首条管段。
   */
  private resolveBurstPipeId(text: string): string | null {
    const m = text.match(/管段\s*([A-Za-z0-9_\-]+)|pipe[-\s]*([A-Za-z0-9_\-]+)/i);
    if (m) return (m[1] ?? m[2]) || null;
    if (this.dataset?.pipes?.length) return this.dataset.pipes[0].id;
    return null;
  }
}
