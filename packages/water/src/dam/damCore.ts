/**
 * DamOperation 核心算法（纯函数）
 *
 * PRD phase-2-grid-water §4.3：
 * - 多水库状态面板（水位/库容/入库/出库）
 * - 调度方案编辑器（调整各水库泄量）
 * - 下游水位影响推演（根据调度方案计算下游水位变化）
 * - 多方案对比
 */

import type { DamScheduleInput, DamScheduleResult, WaterDataset } from '../types';

/** 蓄水率更新（根据出库流量变化） */
export function updateStorageRate(
  currentRate: number,
  outflowDelta: number,
  timeStep = 1
): number {
  // 出库增加 → 蓄水率下降；出库减少 → 蓄水率上升（简化线性）
  const next = currentRate - outflowDelta * 0.01 * timeStep;
  return Math.max(0, Math.min(1, next));
}

/** 蓄泄状态判断 */
export function reservoirStatus(storageRate: number): 'storing' | 'discharging' | 'balanced' {
  if (storageRate >= 0.9) return 'discharging'; // 满库需泄洪
  if (storageRate <= 0.3) return 'storing';     // 低库容蓄水
  return 'balanced';
}

/**
 * 下游水位影响推演
 *
 * 简化：某水库出库流量增加 ΔQ，下游水位站水位按比例上升。
 * 传播系数沿河道递减（越下游影响越小）。
 */
export function downstreamLevelChange(
  outflowDelta: number,
  distanceKm: number
): number {
  // 简化模型：每 10km 衰减 20%，最小影响 0.05m
  const decay = Math.max(0.1, Math.pow(0.8, distanceKm / 10));
  return outflowDelta * 0.01 * decay;
}

/**
 * 主入口：水库联合调度推演
 *
 * @param dataset 水网数据集（含水库 + 水位站）
 * @param schedule 调度方案（各水库出库流量调整）
 */
export function simulateDamSchedule(
  dataset: WaterDataset,
  schedule: DamScheduleInput
): DamScheduleResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const reservoirs = dataset.features.filter((f) => f.kind === 'reservoir');
  const waterStations = dataset.features.filter((f) => f.kind === 'waterStation');

  // 更新各水库蓄水率
  const reservoirStates = reservoirs.map((r) => {
    const curRate = r.properties?.storageRate ?? 0.5;
    const delta = schedule.outflows[r.id] ?? 0;
    const newRate = updateStorageRate(curRate, delta);
    return {
      reservoirId: r.id,
      storageRate: newRate,
      status: reservoirStatus(newRate),
    };
  });

  // 下游水位变化
  const downstreamLevels = waterStations.map((ws) => {
    let totalChange = 0;
    for (const r of reservoirs) {
      const delta = schedule.outflows[r.id] ?? 0;
      // 距离（简化 haversine）
      const dist = haversine(r.lng, r.lat, ws.lng, ws.lat) / 1000; // km
      totalChange += downstreamLevelChange(delta, dist);
    }
    const curLevel = ws.properties?.waterLevel ?? 0;
    return {
      stationId: ws.id,
      levelChange: totalChange,
      level: curLevel + totalChange,
    };
  });

  const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  return { downstreamLevels, reservoirStates, durationMs };
}

export function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
