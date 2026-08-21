/**
 * 坐标系变换组合器（以 WGS84 为枢纽）。
 *
 * 用法：
 *   const t = createTransformer('GCJ02', 'WGS84');
 *   const [lng, lat] = t.forward(114.30, 30.59); // GCJ-02 业务数据 -> 渲染基准
 */

import type { Bounds, CRS, LngLat, Transformer } from './types';
import { cgcs2000ToWgs84, wgs84ToCgcs2000 } from './cgcs2000';
import { gcj02ToWgs84, wgs84ToGcj02 } from './gcj02';

/** 把任意 CRS 的坐标转换到 WGS84 */
export function toWgs84(crs: CRS, lng: number, lat: number): LngLat {
  switch (crs) {
    case 'WGS84':
      return [lng, lat];
    case 'GCJ02':
      return gcj02ToWgs84(lng, lat);
    case 'CGCS2000':
      return cgcs2000ToWgs84(lng, lat);
  }
}

/** 把 WGS84 坐标转换到目标 CRS */
export function fromWgs84(crs: CRS, lng: number, lat: number): LngLat {
  switch (crs) {
    case 'WGS84':
      return [lng, lat];
    case 'GCJ02':
      return wgs84ToGcj02(lng, lat);
    case 'CGCS2000':
      return wgs84ToCgcs2000(lng, lat);
  }
}

export function createTransformer(from: CRS, to: CRS): Transformer {
  if (from === to) {
    const identity = (lng: number, lat: number): LngLat => [lng, lat];
    return { forward: identity, inverse: identity };
  }
  const forward = (lng: number, lat: number): LngLat => {
    const [wLng, wLat] = toWgs84(from, lng, lat);
    return fromWgs84(to, wLng, wLat);
  };
  const inverse = (lng: number, lat: number): LngLat => {
    const [wLng, wLat] = toWgs84(to, lng, lat);
    return fromWgs84(from, wLng, wLat);
  };
  return { forward, inverse };
}

/** 单点快捷转换 */
export function transformPoint(
  lng: number,
  lat: number,
  from: CRS,
  to: CRS
): LngLat {
  return createTransformer(from, to).forward(lng, lat);
}

/** 范围 [w, s, e, n] 转换（取四个角点极值） */
export function transformBounds(b: Bounds, from: CRS, to: CRS): Bounds {
  const t = createTransformer(from, to);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of [
    [b[0], b[1]],
    [b[2], b[1]],
    [b[0], b[3]],
    [b[2], b[3]],
  ]) {
    const [nx, ny] = t.forward(x, y);
    xs.push(nx);
    ys.push(ny);
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
