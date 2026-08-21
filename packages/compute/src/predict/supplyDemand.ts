/**
 * 算力供需预测核心算法（纯函数，PRD §4.1.2 C-5）
 *
 * 预测未来 7 天各区域算力需求（简化时间序列模型）。
 */

import type { ComputeTopologyDataset, ComputeNode } from '../types';

/** 算力缺口结果 */
export interface ComputeGap {
  region: string;
  /** 当前总利用率（0-1） */
  currentUtilization: number;
  /** 预测 7 天利用率（0-1） */
  predictedUtilization: number;
  /** 是否缺口（预测利用率 > 阈值） */
  isGap: boolean;
  /** 缺口程度 */
  gapLevel: 'none' | 'low' | 'medium' | 'high';
}

export interface SupplyDemandOptions {
  /** 预测天数 */
  daysAhead?: number;
  /** 每日增长率（如 0.05 = 每天 +5%） */
  growthRate?: number;
  /** 缺口阈值（利用率） */
  gapThreshold?: number;
}

/** 按区域聚合节点的利用率 */
function aggregateByRegion(nodes: ComputeNode[]): Map<string, { total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const n of nodes) {
    const region = n.properties?.region ?? 'default';
    const util = n.properties?.gpuUtilization ?? 0;
    const cur = map.get(region) ?? { total: 0, count: 0 };
    cur.total += util;
    cur.count += 1;
    map.set(region, cur);
  }
  return map;
}

/**
 * 供需预测（PRD §4.1.2 C-5）
 */
export function predictSupplyDemand(
  dataset: ComputeTopologyDataset,
  opts: SupplyDemandOptions = {}
): ComputeGap[] {
  const daysAhead = opts.daysAhead ?? 7;
  const growthRate = opts.growthRate ?? 0.05;
  const gapThreshold = opts.gapThreshold ?? 0.8;

  const byRegion = aggregateByRegion(dataset.nodes);
  const results: ComputeGap[] = [];

  for (const [region, { total, count }] of byRegion) {
    const currentUtilization = total / count;
    // 复合增长
    const predictedUtilization = Math.min(
      1,
      currentUtilization * Math.pow(1 + growthRate, daysAhead)
    );
    const isGap = predictedUtilization > gapThreshold;
    let gapLevel: ComputeGap['gapLevel'] = 'none';
    if (isGap) {
      if (predictedUtilization > 0.95) gapLevel = 'high';
      else if (predictedUtilization > 0.88) gapLevel = 'medium';
      else gapLevel = 'low';
    }
    results.push({
      region,
      currentUtilization,
      predictedUtilization,
      isGap,
      gapLevel,
    });
  }

  return results.sort((a, b) => b.predictedUtilization - a.predictedUtilization);
}
