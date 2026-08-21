/**
 * DFS（深度优先遍历）
 *
 * 用途：
 * - 管线编辑后构建新的连通分量
 * - 环检测（爆管推演风险评估）
 * - 上游路径追踪
 */

import type { AdjacencyList, AdjEdge } from './adjacency';

export interface DfsOptions {
  /** 最大深度，默认无限制 */
  maxDepth?: number;
  /** 邻居过滤（在遍历孩子前判断） */
  allowEdge?: (edge: AdjEdge, from: string, to: string) => boolean;
  /** 起点过滤器 */
  allowStart?: (node: string) => boolean;
}

export interface DfsResult {
  visited: string[];
  parents: Map<string, string | null>;
  /** 是否触发了 maxDepth 截断（true=未完全遍历） */
  truncated: boolean;
}

/**
 * 深度优先遍历
 */
export function dfs(
  adj: AdjacencyList,
  start: string,
  opts: DfsOptions = {}
): DfsResult {
  const visited: string[] = [];
  const parents = new Map<string, string | null>();
  const visitedSet = new Set<string>();
  let truncated = false;

  if (!adj.has(start)) {
    return { visited, parents, truncated };
  }
  if (opts.allowStart && !opts.allowStart(start)) {
    return { visited, parents, truncated };
  }

  const stack: Array<{ id: string; depth: number }> = [{ id: start, depth: 0 }];
  parents.set(start, null);
  visitedSet.add(start);

  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    visited.push(id);

    if (opts.maxDepth !== undefined && depth >= opts.maxDepth) {
      truncated = true;
      continue;
    }

    const edges = adj.get(id) ?? [];
    // 倒序遍历以保持"原本右子树先访问"的 DFS 直观
    for (let i = edges.length - 1; i >= 0; i--) {
      const e = edges[i];
      if (opts.allowEdge && !opts.allowEdge(e, id, e.to)) continue;
      if (visitedSet.has(e.to)) continue;
      visitedSet.add(e.to);
      parents.set(e.to, id);
      stack.push({ id: e.to, depth: depth + 1 });
    }
  }

  return { visited, parents, truncated };
}

/**
 * 检测有向图中的所有环（基于 Tarjan 算法的简化版本）。
 * 返回包含环的所有节点集合（连通分量内存在环时整分量被标记）。
 */
export function detectCycles(adj: AdjacencyList): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const onStack = new Set<string>();
  const stack: Array<{ id: string; iter: Iterator<AdjEdge> }> = [];

  for (const node of adj.keys()) {
    if (visited.has(node)) continue;
    const localCycle: string[] = [];
    stack.push({
      id: node,
      iter: (adj.get(node) ?? [])[Symbol.iterator](),
    });
    onStack.add(node);
    visited.add(node);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const next = top.iter.next();
      if (next.done) {
        onStack.delete(top.id);
        stack.pop();
        continue;
      }
      const nextId = next.value.to;
      if (onStack.has(nextId)) {
        // 找到环：提取 onStack 中从 nextId 到 top.id 的所有节点
        const cycle: string[] = [nextId];
        for (let i = stack.length - 1; i >= 0; i--) {
          cycle.push(stack[i].id);
          if (stack[i].id === nextId) break;
        }
        cycle.reverse();
        // 双向建表会把 s->v1->s 视为 2 节点"环"（实质是同一物理边的双向表示），
        // 只保留 ≥3 个不同节点的"真环"
        if (new Set(cycle).size >= 3) cycles.push(cycle);
      } else if (!visited.has(nextId)) {
        visited.add(nextId);
        onStack.add(nextId);
        stack.push({
          id: nextId,
          iter: (adj.get(nextId) ?? [])[Symbol.iterator](),
        });
      }
    }
  }

  return cycles;
}
