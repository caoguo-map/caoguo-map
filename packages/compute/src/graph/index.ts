/**
 * 算力网图算法工具（轻量，独立于其他包）
 */

import type { ComputeTopologyDataset } from '../types';

export type ComputeAdjacency = Map<string, Array<{ linkId: string; to: string; latencyMs: number }>>;

/** 构建算力拓扑邻接表（双向） */
export function buildComputeAdjacency(dataset: ComputeTopologyDataset): ComputeAdjacency {
  const adj: ComputeAdjacency = new Map();
  for (const n of dataset.nodes) {
    if (!adj.has(n.id)) adj.set(n.id, []);
  }
  for (const l of dataset.links) {
    const latency = l.properties?.latencyMs ?? 0;
    const from = adj.get(l.fromNode) ?? [];
    from.push({ linkId: l.id, to: l.toNode, latencyMs: latency });
    adj.set(l.fromNode, from);
    const to = adj.get(l.toNode) ?? [];
    to.push({ linkId: l.id, to: l.fromNode, latencyMs: latency });
    adj.set(l.toNode, to);
  }
  return adj;
}

/** Haversine 距离（m） */
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

/**
 * 最优接入推荐（LM-2）：按延迟排序推荐最近可用算力节点
 */
export function recommendBestNode(
  nodes: Array<{ id: string; lng: number; lat: number; online?: boolean }>,
  userLng: number,
  userLat: number
): Array<{ id: string; distance: number; latencyMs: number }> {
  return nodes
    .filter((n) => n.online !== false)
    .map((n) => {
      const distance = haversine(userLng, userLat, n.lng, n.lat);
      // 粗略延迟估算：光速 + 传输/处理开销（~1ms/100km）
      const latencyMs = distance / 100_000 + 1;
      return { id: n.id, distance, latencyMs };
    })
    .sort((a, b) => a.latencyMs - b.latencyMs);
}

/**
 * 拓扑路径分析（NLPG 6.2 "北京到上海之间有哪些光缆路由？"）
 * 返回两节点间所有简单路径（k 短路简化版）
 */
export function findRoutes(
  adj: ComputeAdjacency,
  start: string,
  end: string,
  opts: { maxRoutes?: number; maxDepth?: number } = {}
): string[][] {
  const maxRoutes = opts.maxRoutes ?? 3;
  const maxDepth = opts.maxDepth ?? 20;
  const all: string[][] = [];
  const path: string[] = [];
  const onPath = new Set<string>();

  const dfsLocal = (cur: string) => {
    if (all.length >= maxRoutes) return;
    onPath.add(cur);
    path.push(cur);
    if (cur === end) {
      all.push([...path]);
      path.pop();
      onPath.delete(cur);
      return;
    }
    if (path.length >= maxDepth) {
      path.pop();
      onPath.delete(cur);
      return;
    }
    for (const e of adj.get(cur) ?? []) {
      if (onPath.has(e.to)) continue;
      dfsLocal(e.to);
      if (all.length >= maxRoutes) break;
    }
    path.pop();
    onPath.delete(cur);
  };
  dfsLocal(start);
  return all;
}

/** 最低延迟路径（Dijkstra，权重=latencyMs） */
export function lowestLatencyPath(
  adj: ComputeAdjacency,
  start: string,
  end: string
): { latencyMs: number; path: string[]; found: boolean } {
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
      const alt = (dist.get(cur.id) ?? Infinity) + e.latencyMs;
      if (alt < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, alt);
        parents.set(e.to, cur.id);
        pq.push({ id: e.to, d: alt });
      }
    }
  }
  if ((dist.get(end) ?? Infinity) === Infinity) {
    return { latencyMs: Infinity, path: [], found: false };
  }
  const path: string[] = [];
  let cur: string | null = end;
  while (cur) {
    path.unshift(cur);
    const p = parents.get(cur);
    if (p === undefined) break;
    cur = p;
  }
  return { latencyMs: dist.get(end) ?? 0, path, found: true };
}
