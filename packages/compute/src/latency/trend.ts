/**
 * 延迟趋势序列（PRD phase-3 §4.2.2 LM-3 的数据层）
 *
 * `LatencyMap.trend()` 只返回**统计摘要**（count/min/max/avg），无法画曲线。
 * 本模块补齐**逐点时间序列**，供图表层直接消费；渲染层只需把 `points` 喂给折线图。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { LatencyRecord } from '../types';

/** 趋势方向（按首末值比较，变化率阈值 5%） */
export type LatencyTrendDirection = 'up' | 'down' | 'flat';

/** 单个采样点 */
export interface LatencyTrendPoint {
  /** 时间戳（ms）；记录无 timestamp 时按索引 × stepMs 合成 */
  t: number;
  /** 延迟（ms） */
  latencyMs: number;
}

/** 某条链路的延迟趋势序列 */
export interface LatencyTrendSeries {
  linkId: string;
  points: LatencyTrendPoint[];
  min: number;
  max: number;
  avg: number;
  /** 趋势方向 */
  direction: LatencyTrendDirection;
  /** 首末变化率（如 0.12 表示末值比首值高 12%） */
  changeRate: number;
}

export interface LatencyTrendOptions {
  /** 记录无 timestamp 时的合成步长（ms，默认 3600_000 = 1 小时） */
  stepMs?: number;
  /** 判断趋势方向的阈值（默认 0.05） */
  flatThreshold?: number;
  /** 起点时间（记录无 timestamp 时的基准，默认当前时间） */
  startTime?: number;
}

/**
 * 构建某条链路的延迟趋势序列（LM-3 数据层）
 *
 * - 按时间升序排列（无 timestamp 的记录按输入顺序 × stepMs 合成时间轴）；
 * - 同时间戳重复时保留最后一条（后到的为最新采样）。
 *
 * @returns 无匹配记录时返回空序列（min/max/avg 为 0，direction 为 'flat'）
 */
export function latencyTrendSeries(
  records: LatencyRecord[] | undefined,
  linkId: string,
  opts: LatencyTrendOptions = {},
): LatencyTrendSeries {
  const stepMs = opts.stepMs ?? 3_600_000;
  const flatThreshold = opts.flatThreshold ?? 0.05;
  const base = opts.startTime ?? Date.now();

  const matched = (records ?? []).filter((r) => r.linkId === linkId);
  if (matched.length === 0) {
    return { linkId, points: [], min: 0, max: 0, avg: 0, direction: 'flat', changeRate: 0 };
  }

  // 同一时间戳去重（保留后到的采样）
  const byTime = new Map<number, number>();
  matched.forEach((r, i) => {
    const t = typeof r.timestamp === 'number' ? r.timestamp : base + i * stepMs;
    byTime.set(t, r.latencyMs);
  });

  const points: LatencyTrendPoint[] = [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, latencyMs]) => ({ t, latencyMs }));

  const values = points.map((p) => p.latencyMs);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const first = values[0];
  const last = values[values.length - 1];
  const changeRate = first === 0 ? 0 : (last - first) / first;

  let direction: LatencyTrendDirection = 'flat';
  if (changeRate > flatThreshold) direction = 'up';
  else if (changeRate < -flatThreshold) direction = 'down';

  return { linkId, points, min, max, avg, direction, changeRate };
}

/**
 * 多条链路的趋势序列（批量，便于一次渲染多条曲线）
 * @param linkIds 不传时对全部链路按 id 升序生成
 */
export function multiLatencyTrendSeries(
  records: LatencyRecord[] | undefined,
  linkIds?: string[],
  opts: LatencyTrendOptions = {},
): LatencyTrendSeries[] {
  const ids =
    linkIds ?? [...new Set((records ?? []).map((r) => r.linkId))].sort((a, b) => a.localeCompare(b));
  return ids.map((id) => latencyTrendSeries(records, id, opts));
}


/**
 * LM-3 图表数据转换：`LatencyTrendSeries` → ECharts / Chart.js 直接可用的结构。
 * x 轴为 `HH:mm` 标签；可选叠加均值参考线。
 */
export function latencyTrendToChartDataset(
  series: LatencyTrendSeries
): {
  linkId: string;
  xAxis: string[];
  series: Array<{ name: string; data: number[] }>;
  avgLine: number;
  direction: LatencyTrendDirection;
} {
  const fmt = (t: number) => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return {
    linkId: series.linkId,
    xAxis: series.points.map((p) => fmt(p.t)),
    series: [{ name: '延迟 (ms)', data: series.points.map((p) => p.latencyMs) }],
    avgLine: Math.round(series.avg * 100) / 100,
    direction: series.direction,
  };
}
