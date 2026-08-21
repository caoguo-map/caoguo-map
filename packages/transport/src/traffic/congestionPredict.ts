/**
 * 拥堵预测核心算法（纯函数，PRD §3.2.2）
 *
 * 基于历史同时段基准 + 实时趋势线性回归的简单预测：
 *   predicted = hist + trend * minutes_ahead
 *
 * 全部为纯函数，可在 Node / 浏览器两侧运行。
 */

import type { CongestionLevel } from '../types';
import { classifySpeed } from '../style/transportTheme';

/** 预测结果（PRD §3.2.2 返回结构） */
export interface CongestionPrediction {
  /** 预测速度（km/h，下限 0） */
  speed: number;
  /** 置信度 0-1（随预测时长衰减） */
  confidence: number;
  /** 拥堵等级 */
  congestionLevel: CongestionLevel;
}

/**
 * 线性回归斜率（最小二乘）
 * @param values 按时间顺序的速度序列
 */
export function linearRegressionSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** 历史同时段速度统计 */
export interface HistoricalStats {
  /** 平均速度 */
  mean: number;
  /** 标准差 */
  std: number;
}

/** 计算历史速度序列的均值和标准差 */
export function historicalStats(values: number[]): HistoricalStats {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

export interface PredictCongestionOptions {
  /** 历史同时段速度序列（如上周同一时段每分钟速度） */
  historicalSpeeds?: number[];
  /** 实时最近 30 分钟速度序列 */
  recentSpeeds?: number[];
  /** 预测时长（分钟） */
  minutesAhead?: number;
}

/**
 * 拥堵预测（PRD §3.2.2 predict_congestion）
 */
export function predictCongestion(
  opts: PredictCongestionOptions
): CongestionPrediction {
  const minutesAhead = opts.minutesAhead ?? 30;
  const hist = historicalStats(opts.historicalSpeeds ?? []).mean;
  const trend = linearRegressionSlope(opts.recentSpeeds ?? []);
  const predicted = hist + trend * minutesAhead;
  const std = historicalStats(opts.historicalSpeeds ?? []).std;

  const speed = Math.max(0, predicted);
  const confidence = Math.max(0, 1 - minutesAhead / 60);

  return {
    speed,
    confidence,
    congestionLevel: classifySpeed(speed),
    // 附赠标准差，便于上层展示置信区间
  } as CongestionPrediction & { std: number };
}
