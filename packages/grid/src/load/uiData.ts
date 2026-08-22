/**
 * 负荷折线图数据层（P2-c UI 数据层，纯函数）
 *
 * 为业务层 Vue/Web 折线图提供结构化时序序列，不依赖任何框架。
 */

import type { GridDeviceStatus } from '../types';

/** 单点时序点位 */
export interface LoadPoint {
  /** 时间戳（ms） */
  t: number;
  /** 负荷率 0-1 */
  loadRate: number;
  /** 状态（可选） */
  status?: GridDeviceStatus;
}

/** 折线图序列（标签 + 数值，便于直接喂给图表库） */
export interface ChartSeries {
  labels: string[];
  values: number[];
  /** 是否过载标记（与 values 对齐，便于折线着色） */
  overloaded: boolean[];
}

/** 生成负荷折线序列 */
export function buildLoadSeries(deviceId: string, points: LoadPoint[]): ChartSeries {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  return {
    labels: sorted.map((p) => new Date(p.t).toLocaleTimeString()),
    values: sorted.map((p) => Math.round(p.loadRate * 100) / 100),
    overloaded: sorted.map((p) => p.loadRate >= 0.8),
  };
}

/** 多设备负荷折线（多序列合并，按统一时间轴） */
export function buildMultiLoadSeries(
  series: Array<{ deviceId: string; points: LoadPoint[] }>,
): { devices: string[]; labels: string[]; values: Record<string, number[]> } {
  const allTs = new Set<number>();
  for (const s of series) for (const p of s.points) allTs.add(p.t);
  const labels = [...allTs].sort((a, b) => a - b).map((t) => new Date(t).toLocaleTimeString());
  const byDevice: Record<string, number[]> = {};
  for (const s of series) {
    const map = new Map(s.points.map((p) => [p.t, p.loadRate]));
    byDevice[s.deviceId] = labels.map((_, i) => map.get([...allTs].sort((a, b) => a - b)[i]) ?? NaN);
  }
  return { devices: series.map((s) => s.deviceId), labels, values: byDevice };
}
