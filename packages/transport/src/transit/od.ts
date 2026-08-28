/**
 * 公共交通 OD 纯函数（PRD phase-3 §3.4 `<TransitHeatmap>`）
 *
 *  - aggregateOd：把原始 OD 记录聚合为「站点吞吐」与「OD 连线权重」
 *  - predictOd：客流预测（简单增长率外推 + 置信度）
 *  - suggestLineOptimization：线路优化建议（高 OD 但无直达 → 建议加线）
 *
 * 纯函数，不依赖地图渲染，便于单测与上游调用。
 */

import type {
  OdRecord,
  StationThroughput,
  LineOptimizationSuggestion,
} from './types';

/** 聚合结果 */
export interface OdAggregation {
  /** 各站点吞吐（board/alight 累计） */
  throughput: Record<string, StationThroughput>;
  /** 各 OD 对的累计流量 */
  odWeights: Record<string, number>;
  /** 全局最大 OD 流量（用于渲染归一化） */
  maxOd: number;
  /** 全局最大站点吞吐（board+alight 最大者） */
  maxThroughput: number;
}

/** OD 对 key */
export function odKey(origin: string, dest: string): string {
  return `${origin}->${dest}`;
}

/**
 * 聚合 OD 记录：统计站点进出量、OD 连线权重，并给出全局极值。
 */
export function aggregateOd(records: OdRecord[]): OdAggregation {
  const throughput: Record<string, StationThroughput> = {};
  const odWeights: Record<string, number> = {};
  let maxOd = 0;
  let maxThroughput = 0;

  const ensure = (id: string): StationThroughput => {
    if (!throughput[id]) throughput[id] = { stationId: id, board: 0, alight: 0 };
    return throughput[id];
  };

  for (const r of records) {
    ensure(r.origin).board += r.volume;
    ensure(r.dest).alight += r.volume;
    const key = odKey(r.origin, r.dest);
    odWeights[key] = (odWeights[key] ?? 0) + r.volume;
    if (odWeights[key] > maxOd) maxOd = odWeights[key];
  }

  for (const t of Object.values(throughput)) {
    const total = t.board + t.alight;
    if (total > maxThroughput) maxThroughput = total;
  }

  return { throughput, odWeights, maxOd, maxThroughput };
}

/**
 * 客流预测：对聚合后的 OD 权重按增长率外推未来时段。
 * @param odWeights 当前 OD 权重（odKey → volume）
 * @param growthRate 增长率（默认 0.1 = +10%）
 * @param confidence 置信度（默认 0.8）
 */
export interface OdPrediction {
  odWeights: Record<string, number>;
  growthRate: number;
  confidence: number;
}

export function predictOd(
  odWeights: Record<string, number>,
  growthRate = 0.1,
  confidence = 0.8
): OdPrediction {
  const predicted: Record<string, number> = {};
  for (const [key, v] of Object.entries(odWeights)) {
    predicted[key] = Math.round(v * (1 + growthRate));
  }
  return { odWeights: predicted, growthRate, confidence };
}

/**
 * 线路优化建议：找出「高 OD 流量但当前没有直达线路」的站点对。
 * @param records 原始 OD（含 volume）
 * @param directPairs 当前已开通直达的 OD 对集合（odKey 形式）；为空表示全部视为无直达
 * @param threshold 触发建议的 OD 流量阈值（默认 1000）
 */
export function suggestLineOptimization(
  records: OdRecord[],
  directPairs: Set<string> = new Set(),
  threshold = 1000
): LineOptimizationSuggestion[] {
  // 按 OD 对累计流量
  const pairVolume: Record<string, number> = {};
  const pairStations: Record<string, { from: string; to: string }> = {};
  for (const r of records) {
    const key = odKey(r.origin, r.dest);
    pairVolume[key] = (pairVolume[key] ?? 0) + r.volume;
    pairStations[key] = { from: r.origin, to: r.dest };
  }

  const suggestions: LineOptimizationSuggestion[] = [];
  for (const [key, vol] of Object.entries(pairVolume)) {
    if (directPairs.has(key)) continue;
    if (vol < threshold) continue;
    const { from, to } = pairStations[key];
    suggestions.push({
      from,
      to,
      unservedVolume: vol,
      suggestion: `站点 ${from} ↔ ${to} 间存在约 ${vol} 人/时段的直达需求缺口，建议新增直达线路或加密班次`,
    });
  }
  // 按缺口流量降序
  return suggestions.sort((a, b) => b.unservedVolume - a.unservedVolume);
}
