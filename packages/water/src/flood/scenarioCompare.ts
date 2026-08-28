/**
 * 淹没叠加与多情景对比（PRD phase-2-grid-water §4.2 F-4 / F-5 的数据层）
 *
 * - F-4 叠加分析：淹没范围多边形 × 人口/建筑/耕地等点要素 → 影响统计。
 *   数据由调用方注入（与管网 L-4 `overlayUsers` 同构），引擎先行。
 * - F-5 多情景对比：对多个降雨情景的 `FloodResult` 做矩阵对比与排序。
 *   **不自动宣布最优**——防汛语境下"面积最小"（最安全）与"面积最大"（最极端）
 *   都是合法的关注口径，由调用方选择。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { FloodResult, WaterFeature } from '../types';

// ============================================================
// F-4 淹没范围 × 点要素叠加
// ============================================================

/** 注入的叠加目标点（人口聚集点/建筑/耕地地块中心等） */
export interface FloodOverlayTarget {
  id: string;
  /** 类型标签（调用方自定义，如 'population' | 'building' | 'farmland'） */
  kind: string;
  lng: number;
  lat: number;
  /** 规模（人口数/建筑面积/耕地亩数，可选） */
  scale?: number;
  name?: string;
}

/** 叠加统计结果 */
export interface FloodOverlayResult {
  total: number;
  byKind: Record<string, number>;
  scaleAffected: number;
  affected: FloodOverlayTarget[];
}

/** 射线法：点是否在多边形内 */
export function pointInPolygon(lng: number, lat: number, polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * 淹没范围 × 点要素叠加（F-4 数据层）
 * @param polygon 淹没范围（`FloodResult.inundationPolygon`）
 */
export function overlayFlood(
  polygon: [number, number][],
  targets: FloodOverlayTarget[] | undefined
): FloodOverlayResult {
  const affected = (targets ?? [])
    .filter((t) => pointInPolygon(t.lng, t.lat, polygon))
    .sort((a, b) => (b.scale ?? 0) - (a.scale ?? 0));

  const byKind: Record<string, number> = {};
  let scaleAffected = 0;
  for (const t of affected) {
    byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
    scaleAffected += t.scale ?? 0;
  }

  return { total: affected.length, byKind, scaleAffected, affected };
}

/**
 * 从 WaterDataset 要素批量构造叠加目标（便捷入口）
 * 只取有坐标的要素，kind 即 `WaterFeature.kind`。
 */
export function featuresToOverlayTargets(
  features: WaterFeature[] | undefined
): FloodOverlayTarget[] {
  return (features ?? [])
    .filter((f) => Number.isFinite(f.lng) && Number.isFinite(f.lat))
    .map((f) => ({
      id: f.id,
      kind: f.kind,
      lng: f.lng,
      lat: f.lat,
      ...(f.properties?.extra ? { } : {}),
      name: f.name,
    }));
}

// ============================================================
// F-5 多情景对比
// ============================================================

/** 单个情景（调用方自行跑 `simulateFlood`） */
export interface FloodScenario {
  name: string;
  result: FloodResult;
}

/** 情景对比结果 */
export interface FloodScenarioComparison {
  plans: Array<{ name: string; result: FloodResult }>;
  /** 矩阵：inundatedArea（km²）/ maxDepth（m）/ peakFlow（m³/s） × 情景 */
  matrix: {
    inundatedArea: number[];
    maxDepth: number[];
    peakFlow: number[];
  };
  /** 排序后的情景名 */
  ranking: Array<{ name: string; inundatedArea: number; maxDepth: number }>;
}

/**
 * 多情景对比（F-5）
 * @param scenarios 各降雨情景的推演结果（调用方跑 `simulateFlood` 后传入）
 * @param orderBy 排序口径：`smallest`（淹没面积最小，最安全）或 `largest`（最极端）
 */
export function compareFloodScenarios(
  scenarios: FloodScenario[],
  orderBy: 'smallest' | 'largest' = 'smallest'
): FloodScenarioComparison {
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const matrix = {
    inundatedArea: scenarios.map((s) => round(s.result.inundatedArea)),
    maxDepth: scenarios.map((s) => round(s.result.maxDepth)),
    peakFlow: scenarios.map((s) => round(s.result.peakFlow)),
  };
  const ranking = scenarios
    .map((s) => ({
      name: s.name,
      inundatedArea: round(s.result.inundatedArea),
      maxDepth: round(s.result.maxDepth),
    }))
    .sort((a, b) => (orderBy === 'largest' ? b.inundatedArea - a.inundatedArea : a.inundatedArea - b.inundatedArea));

  return {
    plans: scenarios.map((s) => ({ name: s.name, result: s.result })),
    matrix,
    ranking,
  };
}
