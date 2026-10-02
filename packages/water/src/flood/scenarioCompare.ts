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

import { assignKindColor, buildOverlayGeoJSON } from '@caoguo/maplibre';
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

// ============================================================
// F-4 叠加渲染数据层（把统计结果转成可直接渲染的 GeoJSON）
// ============================================================

/** 常见叠加类型的配色；未列出的类型按名称稳定散列到色板，保证同类型同色 */
const OVERLAY_KIND_COLORS: Record<string, string> = {
  population: '#f87171',
  building: '#fbbf24',
  farmland: '#4ade80',
  school: '#60a5fa',
  hospital: '#f472b6',
};

/** 叠加类型 → 配色（未知类型按名称稳定散列取色板，委托 `@caoguo/maplibre` 通用实现） */
export function overlayKindColor(kind: string): string {
  return assignKindColor(kind, OVERLAY_KIND_COLORS);
}

/**
 * 淹没叠加渲染 GeoJSON（F-4 渲染数据层，纯函数）
 *
 * 输出：淹没范围多边形（线框，作底图参照）+ 受影响的点要素（按类型着色、按规模定半径）。
 * 配色写进 `properties.color`，渲染层用 data-driven `['get','color']`，
 * 使**图层数恒定**（1 个圆点层 + 1 个线层），与要素数量无关。
 */
export function buildFloodOverlayGeoJSON(
  overlay: FloodOverlayResult,
  polygon: [number, number][] = [],
): GeoJSON.FeatureCollection {
  return buildOverlayGeoJSON({
    points: (overlay.affected ?? []).map((t) => ({
      id: t.id,
      kind: t.kind,
      lng: t.lng,
      lat: t.lat,
      scale: t.scale,
      name: t.name,
    })),
    polygon,
    colorOf: overlayKindColor,
    polygonRole: 'flood-outline',
    pointRole: 'target',
  });
}

/** 情景配色板（按顺序循环取用，保证多情景叠加时颜色可区分） */
export const SCENARIO_COLORS = ['#38bdf8', '#f59e0b', '#f472b6', '#a78bfa', '#4ade80', '#fb7185'];

/** 第 i 个情景的配色（超出色板长度则循环） */
export function scenarioColor(index: number): string {
  return SCENARIO_COLORS[((index % SCENARIO_COLORS.length) + SCENARIO_COLORS.length) % SCENARIO_COLORS.length];
}

/**
 * 多情景叠加 GeoJSON（F-5 渲染数据层，纯函数）
 *
 * 每个情景输出一个多边形，`properties.color` 已带配色，
 * 渲染层可直接用 `['get', 'color']` 做 data-driven 着色。
 * 点数不足 3 的退化情景会被跳过。
 */
export function buildScenarioComparisonGeoJSON(
  comparison: FloodScenarioComparison,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  comparison.plans.forEach((plan, i) => {
    const src = plan.result?.inundationPolygon ?? [];
    if (src.length < 3) return;
    const ring = src.map(([x, y]) => [x, y] as [number, number]);
    ring.push(ring[0]); // 闭合
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: {
        scenarioIndex: i,
        name: plan.name,
        color: scenarioColor(i),
        inundatedArea: plan.result.inundatedArea,
        maxDepth: plan.result.maxDepth,
      },
    });
  });
  return { type: 'FeatureCollection', features };
}
