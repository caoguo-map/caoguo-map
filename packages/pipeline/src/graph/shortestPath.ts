/**
 * 最短路径（Dijkstra）
 *
 * 用途：
 * - 上游距离最近的阀门定位
 * - 备选供气/供水路径（按管径/压力选优）
 */

import type { AdjacencyList, AdjEdge } from './adjacency';

export interface ShortestPathResult {
  distance: number;
  path: string[];
  found: boolean;
}

export interface ShortestPathOptions {
  /** 边权重函数：默认 1 */
  weight?: (edge: AdjEdge) => number;
  /** 提前终止：找到满足条件的节点立即返回 */
  until?: (node: string, dist: number) => boolean;
}

/**
 * Dijkstra 最短路径
 *
 * 注意：当存在负权边时不可用；管网场景边权重非负，管长/管径均适用。
 */
export function dijkstra(
  adj: AdjacencyList,
  start: string,
  end: string,
  opts: ShortestPathOptions = {}
): ShortestPathResult {
  if (!adj.has(start) || !adj.has(end)) {
    return { distance: Infinity, path: [], found: false };
  }

  const weight = opts.weight ?? ((e: AdjEdge) => e.length || 1);

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
    // 简化：线性查找最小值（小图足够；大规模可换二叉堆）
    pq.sort((a, b) => a.d - b.d);
    const cur = pq.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    if (cur.id === end) break;

    const edges = adj.get(cur.id) ?? [];
    for (const e of edges) {
      if (visited.has(e.to)) continue;
      const w = weight(e);
      const alt = (dist.get(cur.id) ?? Infinity) + w;
      if (alt < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, alt);
        parents.set(e.to, cur.id);
        pq.push({ id: e.to, d: alt });
      }
    }

    if (opts.until && opts.until(cur.id, cur.d)) break;
  }

  if ((dist.get(end) ?? Infinity) === Infinity) {
    return { distance: Infinity, path: [], found: false };
  }

  // 回溯路径
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
