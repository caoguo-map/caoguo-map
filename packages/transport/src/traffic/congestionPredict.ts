/**
 * 拥堵预测核心算法（纯函数，PRD §3.2.2）
 *
 * 基于历史同时段基准 + 实时趋势线性回归的简单预测：
 *   predicted = hist + trend * minutes_ahead
 *
 * 全部为纯函数，可在 Node / 浏览器两侧运行。
 */

import type { CongestionLevel, SpeedTimeSeries, SpeedTimePoint } from '../types';
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

/**
 * 从时序中提取某路段在指定时间索引处的速度（T-4 时间轴切片）。
 * @returns 缺失或越界时返回 null
 */
export function speedAtTimeIndex(
  series: SpeedTimeSeries,
  edgeId: string,
  index: number
): number | null {
  const pts = series.series[edgeId];
  if (!pts || index < 0 || index >= pts.length) return null;
  return pts[index].speed;
}

/**
 * 选中路段的趋势聚合（TF-3 流量趋势图数据）。
 * 纯函数，返回该路段时序的：
 *  - timestamps：时间轴
 *  - speeds：逐点速度
 *  - flows：逐点流量（无则补 0）
 *  - avg / min / max：速度统计
 *  - congestionTrend：速度对应的拥堵等级序列（按点）
 */
export interface EdgeTrend {
  timestamps: number[];
  speeds: number[];
  flows: number[];
  avg: number;
  min: number;
  max: number;
  congestionTrend: CongestionLevel[];
}

export function edgeTrend(series: SpeedTimeSeries, edgeId: string): EdgeTrend | null {
  const pts: SpeedTimePoint[] | undefined = series.series[edgeId];
  if (!pts || pts.length === 0) return null;
  const speeds = pts.map((p) => p.speed);
  const flows = pts.map((p) => p.flow ?? 0);
  const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const min = Math.min(...speeds);
  const max = Math.max(...speeds);
  return {
    timestamps: series.timestamps,
    speeds,
    flows,
    avg,
    min,
    max,
    congestionTrend: speeds.map((s) => classifySpeed(s)),
  };
}

/**
 * 时间轴切片：取整个路网在 index 时刻的"路段 id → 速度"映射（T-4 回放着色）。
 */
export function speedSnapshotAt(
  series: SpeedTimeSeries,
  index: number
): Record<string, number> {
  const snap: Record<string, number> = {};
  for (const [edgeId, pts] of Object.entries(series.series)) {
    if (index >= 0 && index < pts.length) snap[edgeId] = pts[index].speed;
  }
  return snap;
}
