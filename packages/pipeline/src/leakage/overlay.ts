/**
 * 叠加分析（PRD phase-1-pipeline §4.3.3 L-4 的数据层）
 *
 * 危险区域（等值线多边形）× 用户/建筑点要素 → 影响统计。
 * **数据由调用方注入**（人口/建筑数据通常来自业务系统），本模块只做
 * 空间叠加与汇总 —— 引擎先行，数据源到位即可用。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { PipelineUser, UserKind } from '../types';

/** 叠加分析结果 */
export interface OverlayResult {
  /** 区域内受影响的用户/建筑总数 */
  total: number;
  /** 按类型汇总计数 */
  byKind: Record<UserKind, number>;
  /** 受影响人口/规模合计（`scale` 求和） */
  scaleAffected: number;
  /** 其中重要用户（医院/学校/政府/消防）数 */
  importantCount: number;
  /** 受影响的用户列表（按严重度降序） */
  affected: PipelineUser[];
}

/** 射线法：点是否在多边形内（含边界，多边形首尾无需闭合） */
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

/** UserKind 严重度权重（与 burstCore.userSeverity 同口径，避免跨模块循环依赖） */
const KIND_WEIGHT: Record<UserKind, number> = {
  important: 100,
  industrial: 50,
  commercial: 20,
  residential: 1,
};

/**
 * 危险区域 × 用户/建筑 叠加分析（L-4 数据层）
 *
 * @param polygon 危险区域多边形（取等值线最大一条，如 `result.contours` 中
 *                threshold 最小的 `polygon` —— 覆盖范围最大）
 * @param users 用户/建筑点要素（来自 `dataset.users` 或业务系统注入）
 */
export function overlayUsers(
  polygon: [number, number][],
  users: PipelineUser[] | undefined
): OverlayResult {
  const affected = (users ?? [])
    .filter((u) => pointInPolygon(u.lng, u.lat, polygon))
    .sort((a, b) => KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind]);

  const byKind: Record<UserKind, number> = {
    residential: 0,
    commercial: 0,
    industrial: 0,
    important: 0,
  };
  let scaleAffected = 0;
  for (const u of affected) {
    byKind[u.kind] = (byKind[u.kind] ?? 0) + 1;
    scaleAffected += u.scale ?? 0;
  }

  return {
    total: affected.length,
    byKind,
    scaleAffected,
    importantCount: byKind.important,
    affected,
  };
}
