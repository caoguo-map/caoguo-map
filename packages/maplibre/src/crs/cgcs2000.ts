/**
 * WGS84 <-> CGCS2000 转换。
 *
 * 说明：CGCS2000 与 WGS84 采用近似相同的参考椭球（扁率/长半轴差异极小，
 * 历元差异仅导致 cm~dm 级点位偏移），在 Web Mercator 显示尺度下等价于一致。
 * 因此 Phase 0 默认实现为恒等变换（残差 < 0.5m，满足 PRD 验收 F-1.1）。
 *
 * 测绘级高精度需求：可注入 `GridShiftProvider`（区域 7 参数 / 格网平移），
 * 见 types.ts。本文件保留可扩展入口。
 */

import type { GridShiftProvider, LngLat } from './types';

let gridShift: GridShiftProvider | null = null;

/** 注册 CGCS2000 偏移提供方（可选，测绘级） */
export function setCgcs2000GridShift(provider: GridShiftProvider | null): void {
  gridShift = provider;
}

/** WGS84 -> CGCS2000 */
export function wgs84ToCgcs2000(lng: number, lat: number): LngLat {
  if (!gridShift) return [lng, lat];
  const [dLng, dLat] = gridShift.shift(lng, lat);
  return [lng + dLng, lat + dLat];
}

/** CGCS2000 -> WGS84 */
export function cgcs2000ToWgs84(lng: number, lat: number): LngLat {
  if (!gridShift) return [lng, lat];
  const [dLng, dLat] = gridShift.shift(lng, lat);
  return [lng - dLng, lat - dLat];
}
