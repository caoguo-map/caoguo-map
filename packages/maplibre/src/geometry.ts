/**
 * 通用几何工具（跨包共用）
 *
 * 背景：射线法「点是否在多边形内」此前在 water（2 处）、pipeline、telecom 共 4 份实现，
 * 算法相同但细节已出现漂移（部分实现缺少退化多边形守卫）。按本仓约定
 * （跨包共用能力下沉到 `@caoguo/maplibre`，如 `cardFields.ts` / `overlay.ts`），此处统一。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

/**
 * 射线法：点 (lng, lat) 是否落在多边形内（含边界）。
 *
 * 与旧实现的两点差异（均为严格改进，已同步到各业务包）：
 * 1. 统一补 `polygon.length < 3` 守卫 —— 少于 3 点不构成多边形，一律返回 false
 *    （此前 telecom 与水网 floodCore 缺此守卫，2 点「多边形」可能误判为 true）；
 * 2. 多边形**无需预先闭合**，首尾点由算法自行闭合处理。
 */
export function pointInPolygon(
  lng: number,
  lat: number,
  polygon: [number, number][],
): boolean {
  if (!polygon || polygon.length < 3) return false;
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

/** `pointInPolygon` 的数组点便捷重载（供水网 `floodCore` 等按 [lng, lat] 传参处使用） */
export function pointInPolygonXY(p: [number, number], polygon: [number, number][]): boolean {
  return pointInPolygon(p[0], p[1], polygon);
}
