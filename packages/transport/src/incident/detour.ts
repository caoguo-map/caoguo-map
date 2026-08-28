/**
 * 绕行路径几何（PRD phase-3 §3.3.2 IM-4 的数据层）
 *
 * `analyzeIncident()` 已能算出绕行方案的**节点 id 序列**（`detour.path`），
 * 但节点序列无法直接渲染 —— 需要还原成折线坐标。
 * 本模块负责「节点路径 → 折线几何」，并顺带给出影响范围圆的 GeoJSON。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { RoadEdge, RoadNetworkDataset } from '../types';

/** 绕行折线（可直接渲染为 line 图层） */
export interface DetourPolyline {
  /** 折线坐标 [[lng, lat], ...] */
  coordinates: [number, number][];
  /** 总长度（m）：优先累加路段 length，缺失时用相邻节点直线距离 */
  lengthM: number;
  /** 经过的路段 id 列表（顺序与节点序列对应） */
  edgeIds: string[];
}

/**
 * 把节点 id 序列还原为折线几何
 *
 * 逐段查找连接两节点的路段：优先取该路段自带的 `geometry`（保留真实走向），
 * 否则退化为节点直线。找不到连接路段时该段以直线相连（不中断整条路径）。
 *
 * @returns 节点数 < 2 或节点缺失时返回空几何
 */
export function detourToPolyline(
  dataset: RoadNetworkDataset,
  path: string[]
): DetourPolyline {
  if (!path || path.length < 2) {
    return { coordinates: [], lengthM: 0, edgeIds: [] };
  }

  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n]));
  const coords: [number, number][] = [];
  const edgeIds: string[] = [];
  let lengthM = 0;

  for (let i = 0; i < path.length - 1; i += 1) {
    const from = nodeById.get(path[i]);
    const to = nodeById.get(path[i + 1]);
    if (!from || !to) continue;

    const edge = findConnectingEdge(dataset.edges, path[i], path[i + 1]);
    if (edge) edgeIds.push(edge.id);

    // 首段先压入起点，后续段只压入段内剩余点（避免重复）
    if (i === 0) coords.push([from.lng, from.lat]);

    if (edge?.geometry && edge.geometry.length >= 2) {
      // 保证接入方向与遍历方向一致（geometry 可能是反向存储的）
      const g = alignGeometry(edge.geometry, from.lng, from.lat, to.lng, to.lat);
      for (let k = 1; k < g.length; k += 1) coords.push(g[k]);
    } else {
      coords.push([to.lng, to.lat]);
    }

    lengthM += edge?.length ?? straightDistanceM(from.lng, from.lat, to.lng, to.lat);
  }

  return { coordinates: coords, lengthM, edgeIds };
}

/** 查找连接两节点的路段（双向） */
export function findConnectingEdge(
  edges: RoadEdge[],
  fromId: string,
  toId: string
): RoadEdge | undefined {
  return edges.find(
    (e) =>
      (e.fromNode === fromId && e.toNode === toId) ||
      (e.fromNode === toId && e.toNode === fromId)
  );
}

/** 把路段几何对齐到 from → to 方向（需要时反转） */
function alignGeometry(
  geometry: [number, number][],
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): [number, number][] {
  const first = geometry[0];
  const last = geometry[geometry.length - 1];
  const dStartForward = haversineM(first[0], first[1], fromLng, fromLat);
  const dEndForward = haversineM(last[0], last[1], toLng, toLat);
  const dStartBackward = haversineM(last[0], last[1], fromLng, fromLat);
  const dEndBackward = haversineM(first[0], first[1], toLng, toLat);
  const forwardCost = dStartForward + dEndForward;
  const backwardCost = dStartBackward + dEndBackward;
  return backwardCost < forwardCost ? [...geometry].reverse() : geometry;
}

/** 两点距离（m，简化球面） */
function haversineM(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 直线距离（m，与 detourToPolyline 内退化逻辑保持一致） */
function straightDistanceM(lng1: number, lat1: number, lng2: number, lat2: number): number {
  return haversineM(lng1, lat1, lng2, lat2);
}

/** 圆的多边形近似（GeoJSON ring，顺时针闭合） */
export function circleRing(
  lng: number,
  lat: number,
  radiusM: number,
  steps = 64
): [number, number][] {
  const ring: [number, number][] = [];
  const dLat = radiusM / 110_540;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  return ring;
}
