/**
 * BFS（广度优先遍历）
 *
 * 用途：
 * - 爆管推演：下游影响范围（沿拓扑扩散）
 * - 连通性查询：在指定层级内查找可达节点
 *
 * 实现要点：
 * - 支持 visited / parents 记录
 * - 支持 maxDepth 限制（避免极大连通分量过长）
 * - 支持 predicate 过滤可继续遍历的邻居
 * - 可返回"沿途经过的管段"列表（用于前端高亮）
 */

import type { AdjacencyList, AdjEdge } from './adjacency';

export interface BfsResult {
  /** 访问过的节点（不重复） */
  visited: string[];
  /** 父节点表：node -> 上一步到达的 node（首节点为自身） */
  parents: Map<string, string | null>;
  /** 起点 节点 */
  start: string;
  /** 终点节点（搜到即停，返回时 visited 是到终点为止的节点） */
  end?: string;
}

export interface BfsOptions {
  /** 最大深度（边数），默认无限制 */
  maxDepth?: number;
  /** 是否指定终点（BFS 找到则停止） */
  until?: (node: string) => boolean;
  /** 在扩展邻居前过滤：false 则该方向不继续遍历 */
  allowEdge?: (edge: AdjEdge, from: string, to: string) => boolean;
  /** 起点本身的过滤器（如只走下游/上游） */
  allowStart?: (node: string) => boolean;
}

/**
 * 标准 BFS，可指定"任意邻居是否可达"
 *
 * 用法：
 *   const r = bfs(adj, 'node-A');
 *   bfs(adj, 'start', { until: (n) => n === 'target' }); // 找终点
 *   bfs(adj, 'start', { allowEdge: (_, __, to) => to !== 'forbidden' });
 */
export function bfs(
  adj: AdjacencyList,
  start: string,
  opts: BfsOptions = {}
): BfsResult {
  const visited: string[] = [];
  const parents = new Map<string, string | null>();
  const visitedSet = new Set<string>();

  if (!adj.has(start)) {
    parents.set(start, null);
    return { visited, parents, start };
  }

  if (opts.allowStart && !opts.allowStart(start)) {
    return { visited: [], parents, start };
  }

  const queue: Array<{ id: string; depth: number }> = [{ id: start, depth: 0 }];
  parents.set(start, null);
  visitedSet.add(start);
  visited.push(start);

  let foundEnd: string | undefined;
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (opts.until && opts.until(id)) {
      foundEnd = id;
      break;
    }

    // maxDepth 语义：最多走 N 条边，到达节点的最短路径长度为 N
    // 当前节点 depth=d = 经过 d 条边到达，扩展邻居须 depth+1 <= maxDepth
    if (opts.maxDepth !== undefined && depth >= opts.maxDepth) continue;

    const edges = adj.get(id) ?? [];
    for (const e of edges) {
      if (opts.allowEdge && !opts.allowEdge(e, id, e.to)) continue;
      if (visitedSet.has(e.to)) continue;
      visitedSet.add(e.to);
      parents.set(e.to, id);
      visited.push(e.to);
      queue.push({ id: e.to, depth: depth + 1 });
    }
  }

  return { visited, parents, start, end: foundEnd };
}

/**
 * 多源 BFS（同时从多个起点扩散）
 *
 * 用法：爆管分析的下游影响可从多点同时推演（如多个隔离阀门的下游剩余服务区）
 */
export function multiSourceBfs(
  adj: AdjacencyList,
  starts: string[],
  opts: BfsOptions = {}
): BfsResult & { sourceMap: Map<string, string> } {
  const visited: string[] = [];
  const parents = new Map<string, string | null>();
  const sourceMap = new Map<string, string>();
  const visitedSet = new Set<string>();

  const queue: Array<{ id: string; depth: number }> = [];

  for (const s of starts) {
    if (!adj.has(s)) continue;
    if (opts.allowStart && !opts.allowStart(s)) continue;
    if (!visitedSet.has(s)) {
      visitedSet.add(s);
      parents.set(s, null);
      sourceMap.set(s, s);
      visited.push(s);
      queue.push({ id: s, depth: 0 });
    }
  }

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    // 同单源 BFS：depth=d 时扩展邻居；maxDepth=N 表示最多 N 条边
    if (opts.maxDepth !== undefined && depth >= opts.maxDepth) continue;

    const edges = adj.get(id) ?? [];
    for (const e of edges) {
      if (opts.allowEdge && !opts.allowEdge(e, id, e.to)) continue;
      if (visitedSet.has(e.to)) continue;
      visitedSet.add(e.to);
      parents.set(e.to, id);
      sourceMap.set(e.to, sourceMap.get(id)!);
      visited.push(e.to);
      queue.push({ id: e.to, depth: depth + 1 });
    }
  }

  return { visited, parents, start: starts[0] ?? '', sourceMap };
}

/**
 * 反向 BFS（沿父指针回溯）
 *
 * 给定终点 + parents Map，可还原 BFS 路径（用于"找到的最短路径"）。
 */
export function reconstructPath(
  parents: Map<string, string | null>,
  end: string
): string[] {
  const path: string[] = [];
  let cur: string | null = end;
  while (cur) {
    path.unshift(cur);
    const p = parents.get(cur);
    cur = p ?? null;
    if (cur === null && p === null) {
      // 起点到达
      if (parents.get(end) === null && path.length === 1) break;
      break;
    }
  }
  if (path[0] !== end) {
    // already include end correctly
  }
  return path;
}
