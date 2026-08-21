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
