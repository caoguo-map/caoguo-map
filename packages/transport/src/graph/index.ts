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

// ============================================================
// A* 最短路径（PRD phase-3 §3.1.7）
// ============================================================

/** A* 节点启发式函数：地理距离（h(n) = 直线距离） */
export type AStarHeuristic = (lng1: number, lat1: number, lng2: number, lat2: number) => number;

/** 默认启发式：Haversine 距离（admissible，保证最短） */
export const haversineHeuristic: AStarHeuristic = haversine;

/**
 * A* 最短路径算法。
 *
 * 与 Dijkstra 对比：用启发式 h(n) 引导搜索方向，对地理坐标图效率显著优于 Dijkstra。
 *
 * @param adj         邻接表
 * @param start       起点 id
 * @param end         终点 id
 * @param nodes       节点坐标表（id → {lng, lat}），用于启发式
 * @param heuristic   启发式函数（默认 Haversine）
 */
export function aStar(
  adj: RoadAdjacency,
  start: string,
  end: string,
  nodes: Map<string, { lng: number; lat: number }>,
  heuristic: AStarHeuristic = haversineHeuristic
): { distance: number; path: string[]; found: boolean } {
  if (!adj.has(start) || !adj.has(end)) {
    return { distance: Infinity, path: [], found: false };
  }
  const startNode = nodes.get(start);
  const endNode = nodes.get(end);
  if (!startNode || !endNode) {
    return { distance: Infinity, path: [], found: false };
  }

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const parents = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of adj.keys()) {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
    parents.set(id, null);
  }
  gScore.set(start, 0);
  fScore.set(start, heuristic(startNode.lng, startNode.lat, endNode.lng, endNode.lat));

  // openSet 用数组实现优先队列（f-score 升序），小图够用
  const open: Array<{ id: string; f: number }> = [{ id: start, f: fScore.get(start) ?? 0 }];

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    if (cur.id === end) break;

    const curNode = nodes.get(cur.id);
    if (!curNode) continue;
    const gCur = gScore.get(cur.id) ?? Infinity;

    for (const e of adj.get(cur.id) ?? []) {
      if (visited.has(e.to)) continue;
      const toNode = nodes.get(e.to);
      if (!toNode) continue;
      const tentativeG = gCur + e.length;
      if (tentativeG < (gScore.get(e.to) ?? Infinity)) {
        gScore.set(e.to, tentativeG);
        parents.set(e.to, cur.id);
        const f = tentativeG + heuristic(toNode.lng, toNode.lat, endNode.lng, endNode.lat);
        fScore.set(e.to, f);
        open.push({ id: e.to, f });
      }
    }
  }

  if ((gScore.get(end) ?? Infinity) === Infinity) {
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
  return { distance: gScore.get(end) ?? 0, path, found: true };
}

// ============================================================
// 多目标调度 VRP（PRD phase-3 §3.1.7，简版最近邻 VRP）
// ============================================================

/** VRP 调度输入：配送点 */
export interface VrpStop {
  /** 配送点 id */
  id: string;
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
  /** 需求量（capacity 单位） */
  demand?: number;
}

/** 单条配送路径 */
export interface VrpRoute {
  /** 路径节点序列（含起点，配送点，未含返回起点） */
  path: string[];
  /** 总距离（m） */
  distance: number;
  /** 累计需求 */
  totalDemand: number;
}

/** VRP 输入 */
export interface VrpInput {
  /** 起点（车队起点/仓库） */
  depotId: string;
  /** 配送点列表 */
  stops: VrpStop[];
  /** 车辆最大载重 */
  capacity: number;
}

/** VRP 输出 */
export interface VrpSolution {
  /** 多条路径 */
  routes: VrpRoute[];
  /** 未配送点（无法满足容量约束） */
  undelivered: VrpStop[];
}

/**
 * 简版 VRP（最近邻贪心 + 容量约束）：
 *  1. 从起点出发，按最近邻贪心选择下一个配送点
 *  2. 累计 demand 超过车辆容量则结束当前路径，回起点出发新路径
 *  3. 所有配送点处理完返回起点
 *
 * @param vrp         VRP 输入
 * @param adj         邻接表
 * @param nodes       节点坐标表（id → {lng, lat}）
 *
 * 算法复杂度：O(k * n^2)，k=路径数，n=配送点数（适合中小规模 n<200）
 */
export function nearestNeighborVrp(
  vrp: VrpInput,
  adj: RoadAdjacency,
  nodes: Map<string, { lng: number; lat: number }>
): VrpSolution {
  const routes: VrpRoute[] = [];
  const undelivered: VrpStop[] = [];
  const remaining = new Map(vrp.stops.map((s) => [s.id, s] as const));

  // 把 depot 和 stops 都注入 nodes 表（虚拟节点）
  const allNodes = new Map(nodes);
  allNodes.set(vrp.depotId, {
    lng: allNodes.get(vrp.depotId)?.lng ?? 0,
    lat: allNodes.get(vrp.depotId)?.lat ?? 0,
  });
  for (const stop of vrp.stops) {
    allNodes.set(stop.id, { lng: stop.lng, lat: stop.lat });
  }

  while (remaining.size > 0) {
    const path: string[] = [vrp.depotId];
    let curId = vrp.depotId;
    let curLoad = 0;
    let curDist = 0;

    while (true) {
      const curNode = allNodes.get(curId);
      if (!curNode) break;

      let nearest: { stop: VrpStop; d: number } | null = null;
      for (const stop of remaining.values()) {
        const d = haversine(curNode.lng, curNode.lat, stop.lng, stop.lat);
        const need = stop.demand ?? 1;
        if (curLoad + need > vrp.capacity) continue;
        if (!nearest || d < nearest.d) nearest = { stop, d };
      }
      if (!nearest) break;
      path.push(nearest.stop.id);
      curDist += nearest.d;
      curLoad += nearest.stop.demand ?? 1;
      curId = nearest.stop.id;
      remaining.delete(nearest.stop.id);
    }
    path.push(vrp.depotId);
    routes.push({ path, distance: curDist, totalDemand: curLoad });
  }

  for (const stop of remaining.values()) undelivered.push(stop);
  return { routes, undelivered };
}
