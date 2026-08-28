/**
 * LoadHeatmap 核心算法（纯函数）
 *
 * PRD phase-2-grid-water §3.3：
 * - 台区/线路负荷着色（绿→黄→红渐变）
 * - 过载预警（负荷率 > 80% 自动告警）
 * - 时序预测：未来 24h 负荷预测（简化模型，PRD §3.3.2）
 *
 * 负荷预测简化模型：
 *   predict = base × tempFactor × holidayFactor × eventFactor
 */

import type { GridTopologyDataset, GridDevice } from '../types';

/** 负荷着色阈值（PRD §3.3.1 / LH-5） */
export const OVERLOAD_THRESHOLD = 0.8;

/** 负荷率着色（绿→黄→红） */
export function loadRateColor(loadRate: number): string {
  if (loadRate >= OVERLOAD_THRESHOLD) return '#ef4444'; // 过载 红
  if (loadRate >= 0.6) return '#fbbf24'; // 偏高 黄
  if (loadRate >= 0.4) return '#4ade80'; // 正常 绿
  return '#22c55e'; // 轻载 深绿
}

/** 判断是否过载 */
export function isOverloaded(loadRate: number): boolean {
  return loadRate >= OVERLOAD_THRESHOLD;
}

/** 过载设备列表（LH-5 告警） */
export function overloadedDevices(dataset: GridTopologyDataset): GridDevice[] {
  return dataset.devices.filter((d) => {
    const lr = d.properties?.loadRate;
    return lr !== undefined && isOverloaded(lr);
  });
}

export interface LoadForecastInput {
  /** 历史同时段基准负荷（MW） */
  base: number;
  /** 未来气温（℃） */
  temperature: number;
  /** 是否节假日 */
  isHoliday?: boolean;
  /** 特殊事件修正因子 */
  eventFactor?: number;
}

/**
 * 负荷预测（简化模型，PRD §3.3.2）
 *
 * @returns 预测负荷（MW）
 */
export function predictLoad(input: LoadForecastInput): number {
  const tempFactor = 1.0 + 0.02 * Math.max(0, input.temperature - 26); // 高温每度 +2%
  const holidayFactor = input.isHoliday ? 0.7 : 1.0;
  const eventFactor = input.eventFactor ?? 1.0;
  return input.base * tempFactor * holidayFactor * eventFactor;
}

/**
 * 未来 N 小时负荷预测序列
 * @param base 基准负荷
 * @param temps 未来各小时气温数组
 * @param isHoliday 是否节假日
 */
export function predictLoadSeries(
  base: number,
  temps: number[],
  isHoliday = false
): number[] {
  return temps.map((t) =>
    predictLoad({ base, temperature: t, isHoliday })
  );
}

/** 负荷预测序列的单个点（带时间戳，供图表层直接消费） */
export interface LoadForecastPoint {
  /** 时间戳（ms） */
  t: number;
  /** 预测负荷（MW） */
  load: number;
  /** 标记：恒为 true，便于与实测序列区分渲染（如实线/虚线） */
  predicted: true;
}

/**
 * 未来 N 小时负荷预测序列（**带时间戳**，PRD §3.3.2 LH-2 的图表数据层）
 *
 * `predictLoadSeries` 只返回裸数值数组，无法直接画时间序列图；
 * 本函数补齐时间轴（默认从当前时间起，逐点 +1 小时）。
 *
 * @param input.startTime 起点时间戳（默认 `Date.now()`）
 * @param input.stepMs    步长（默认 3600_000 = 1 小时）
 * @param input.eventFactor 特殊事件修正因子
 */
export function forecastLoadSeries(input: {
  base: number;
  temps: number[];
  isHoliday?: boolean;
  eventFactor?: number;
  startTime?: number;
  stepMs?: number;
}): LoadForecastPoint[] {
  const stepMs = input.stepMs ?? 3_600_000;
  const start = input.startTime ?? Date.now();
  return input.temps.map((t, i) => ({
    t: start + (i + 1) * stepMs,
    load: predictLoad({
      base: input.base,
      temperature: t,
      ...(input.isHoliday !== undefined ? { isHoliday: input.isHoliday } : {}),
      ...(input.eventFactor !== undefined ? { eventFactor: input.eventFactor } : {}),
    }),
    predicted: true as const,
  }));
}

/** 台区负荷聚合（按区域汇总平均负荷率） */
export function aggregateLoadByRegion(
  dataset: GridTopologyDataset
): Map<string, { count: number; totalLoadRate: number; avgLoadRate: number }> {
  const map = new Map<string, { count: number; totalLoadRate: number; avgLoadRate: number }>();
  for (const d of dataset.devices) {
    const lr = d.properties?.loadRate;
    if (lr === undefined) continue;
    const region = d.region ?? 'default';
    const cur = map.get(region) ?? { count: 0, totalLoadRate: 0, avgLoadRate: 0 };
    cur.count += 1;
    cur.totalLoadRate += lr;
    cur.avgLoadRate = cur.totalLoadRate / cur.count;
    map.set(region, cur);
  }
  return map;
}


/**
 * LH-4 图表数据转换：预测序列（可混合实测）→ ECharts / Chart.js 直接可用的结构。
 *
 * @param forecast `forecastLoadSeries()` 的结果
 * @param actual 可选的实测序列（与预测同时间轴对齐绘制）
 */
export function loadForecastToChartDataset(
  forecast: LoadForecastPoint[],
  actual?: Array<{ t: number; load: number }>
): {
  xAxis: string[];
  series: Array<{ name: string; data: Array<number | null> }>;
} {
  const fmt = (t: number) => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // 时间轴 = 预测 ∪ 实测，升序去重
  const tSet = new Set<number>([...forecast.map((p) => p.t), ...(actual ?? []).map((a) => a.t)]);
  const axis = [...tSet].sort((a, b) => a - b);
  const idx = new Map(axis.map((t, i) => [t, i] as const));

  const forecastData: Array<number | null> = axis.map(() => null);
  for (const p of forecast) forecastData[idx.get(p.t)!] = Math.round(p.load * 100) / 100;

  const actualData: Array<number | null> = axis.map(() => null);
  for (const a of actual ?? []) actualData[idx.get(a.t)!] = Math.round(a.load * 100) / 100;

  const series = [{ name: '预测负荷 (MW)', data: forecastData }];
  if (actual && actual.length > 0) series.push({ name: '实测负荷 (MW)', data: actualData });
  return { xAxis: axis.map(fmt), series };
}
