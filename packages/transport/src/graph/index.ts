/**
 * 交通网图算法工具
 *
 * 复用的轻量图算法：邻接表、BFS、Dijkstra、缓冲查询。
 * 保持交通网包独立（不依赖 @caoguo/maplibre-pipeline）。
 */

import type { RoadNetworkDataset, RoadEdge } from '../types';

/** 邻接表：Map<nodeId, Edge[]> */
export type RoadAdjacency = Map<string, Array<{ edgeId: string; to: string; length: number }>>;

/** 构建路网邻接表（双向） */
export function buildRoadAdjacency(dataset: RoadNetworkDataset): RoadAdjacency {
  const adj: RoadAdjacency = new Map();
  for (const n of dataset.nodes) {
    if (!adj.has(n.id)) adj.set(n.id, []);
  }
  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n] as const));
  for (const e of dataset.edges) {
    const len = e.length ?? straightLine(e, nodeById) ?? 0;
    const from = adj.get(e.fromNode) ?? [];
    from.push({ edgeId: e.id, to: e.toNode, length: len });
    adj.set(e.fromNode, from);
    const to = adj.get(e.toNode) ?? [];
    to.push({ edgeId: e.id, to: e.fromNode, length: len });
    adj.set(e.toNode, to);
  }
  return adj;
}

function straightLine(
  e: RoadEdge,
  nodeById: Map<string, { lng: number; lat: number }>
): number {
  if (e.geometry && e.geometry.length >= 2) {
    let total = 0;
    for (let i = 1; i < e.geometry.length; i++) {
      total += haversine(
        e.geometry[i - 1][0],
        e.geometry[i - 1][1],
        e.geometry[i][0],
        e.geometry[i][1]
      );
    }
    return total;
  }
  const from = nodeById.get(e.fromNode);
  const to = nodeById.get(e.toNode);
  if (!from || !to) return 0;
  return haversine(from.lng, from.lat, to.lng, to.lat);
}

/** Haversine 距离（m） */
export function haversine(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface BfsResult {
  visited: string[];
  parents: Map<string, string | null>;
  start: string;
}

/** 标准 BFS */
export function bfs(
  adj: RoadAdjacency,
  start: string,
  opts: {
    maxDepth?: number;
    allowEdge?: (edgeId: string, to: string) => boolean;
  } = {}
): BfsResult {
  const visited: string[] = [];
  const parents = new Map<string, string | null>();
  const visitedSet = new Set<string>();

  if (!adj.has(start)) return { visited, parents, start };

  const queue: Array<{ id: string; depth: number }> = [{ id: start, depth: 0 }];
  parents.set(start, null);
  visitedSet.add(start);
  visited.push(start);

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (opts.maxDepth !== undefined && depth >= opts.maxDepth) continue;
    const edges = adj.get(id) ?? [];
    for (const e of edges) {
      if (opts.allowEdge && !opts.allowEdge(e.edgeId, e.to)) continue;
      if (visitedSet.has(e.to)) continue;
      visitedSet.add(e.to);
      parents.set(e.to, id);
      visited.push(e.to);
      queue.push({ id: e.to, depth: depth + 1 });
    }
  }
  return { visited, parents, start };
}

/** Dijkstra 最短路径（按长度） */
export function dijkstra(
  adj: RoadAdjacency,
  start: string,
  end: string
): { distance: number; path: string[]; found: boolean } {
  if (!adj.has(start) || !adj.has(end)) {
    return { distance: Infinity, path: [], found: false };
  }
  const dist = new Map<string, number>();
  const parents = new Map<string, string | null>();
  const visited = new Set<string>();
  const pq: Array<{ id: string; d: number }> = [{ id: start, d: 0 }];
  for (const n of adj.keys()) {
    dist.set(n, Infinity);
    parents.set(n, null);
  }
  dist.set(start, 0);
  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const cur = pq.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    if (cur.id === end) break;
    for (const e of adj.get(cur.id) ?? []) {
      if (visited.has(e.to)) continue;
      const alt = (dist.get(cur.id) ?? Infinity) + e.length;
      if (alt < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, alt);
        parents.set(e.to, cur.id);
        pq.push({ id: e.to, d: alt });
      }
    }
  }
  if ((dist.get(end) ?? Infinity) === Infinity) {
    return { distance: Infinity, path: [], found: false };
  }
  const path: string[] = [];
  let cur: string | null = end;
  while (cur) {
    path.unshift(cur);
    const p = parents.get(cur);
    if (p === undefined) break;
    cur = p;
  }
  return { distance: dist.get(end) ?? 0, path, found: true };
}

/**
 * 空间缓冲查询：找到距 (lng, lat) 半径 radius 米内的节点
 */
export function nodesWithinRadius(
  nodes: Array<{ id: string; lng: number; lat: number }>,
  lng: number,
  lat: number,
  radius: number
): Array<{ id: string; lng: number; lat: number; distance: number }> {
  return nodes
    .map((n) => ({ ...n, distance: haversine(lng, lat, n.lng, n.lat) }))
    .filter((n) => n.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}
