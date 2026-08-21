/**
 * 连通性分析
 *
 * 用途：
 * - P-4 连通性高亮：选中管线后高亮上下游连通路径
 * - 健康评估的影响范围计算
 * - 用户问"阀门X关闭后影响哪些小区？"
 */

import type { AdjacencyList, AdjEdge } from './adjacency';
import { bfs } from './bfs';
import type { PipelineNode, PipelineTopologyDataset, NodeKind } from '../types';

/**
 * 连通分量（连通子图）
 */
export interface ConnectedComponent {
  /** 节点集合 */
  nodes: string[];
  /** 节点数 */
  size: number;
  /** 是否包含 source 类型节点（影响气源/水源判定） */
  hasSource: boolean;
}

/**
 * 求所有连通分量
 */
export function findConnectedComponents(
  adj: AdjacencyList,
  nodes: PipelineNode[]
): ConnectedComponent[] {
  const visited = new Set<string>();
  const components: ConnectedComponent[] = [];

  const kindById = new Map<string, NodeKind>();
  for (const n of nodes) kindById.set(n.id, n.kind);

  for (const nodeId of adj.keys()) {
    if (visited.has(nodeId)) continue;
    const r = bfs(adj, nodeId);
    let hasSource = false;
    for (const id of r.visited) {
      visited.add(id);
      if (kindById.get(id) === 'source') hasSource = true;
    }
    components.push({
      nodes: r.visited,
      size: r.visited.length,
      hasSource,
    });
  }

  return components;
}

/**
 * 找到两个节点之间的所有路径（k 短路）
 *
 * 用途：阀门隔离方案中"备选路径"分析
 * NOTE：DFS+Yen's 算法简化版，路径数 < 10 适用。
 */
export function findPaths(
  adj: AdjacencyList,
  start: string,
  end: string,
  opts: { maxPaths?: number; maxDepth?: number } = {}
): string[][] {
  const maxPaths = opts.maxPaths ?? 3;
  const maxDepth = opts.maxDepth ?? 20;

  const all: string[][] = [];
  const path: string[] = [];
  const onPath = new Set<string>();

  const dfsLocal = (cur: string) => {
    if (all.length >= maxPaths) return;
    if (cur === end) {
      all.push([...path]);
      return;
    }
    if (path.length >= maxDepth) return;
    onPath.add(cur);
    path.push(cur);
    const edges = adj.get(cur) ?? [];
    for (const e of edges) {
      if (onPath.has(e.to)) continue;
      dfsLocal(e.to);
      if (all.length >= maxPaths) return;
    }
    path.pop();
    onPath.delete(cur);
  };

  dfsLocal(start);
  return all;
}

/**
 * 沿拓扑向上游找到最近的指定类型节点（默认阀门）
 *
 * 用途：爆管推演自动定位隔离点（PRD §4.2.4 step 1）
 */
export function findUpstreamNode(
  adj: AdjacencyList,
  startPipeId: string,
  dataset: PipelineTopologyDataset,
  predicate: (n: PipelineNode) => boolean
): PipelineNode | null {
  const pipe = dataset.pipes.find((p) => p.id === startPipeId);
  if (!pipe) return null;

  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n]));

  // 起始：pipe 任意一端的"非故障方向" → 选择 fromNode 作为查找起点
  const startId = pipe.fromNode;
  const startNode = nodeById.get(startId);
  if (!startNode) return null;

  // 反向游走：只允许沿"反向"（即 from 是 to，to 是 from）前进
  const allowEdge = (e: AdjEdge, _from: string, to: string) => {
    // 边界：pipe 同时含 startId 端则允许从 startId 反向走
    const targetPipe = dataset.pipes.find((p) => p.id === e.pipeId);
    if (!targetPipe) return false;
    // 始终允许走（无向图）
    return true;
  };

  // BFS 到上层直到命中 predicate
  const r = bfs(adj, startId, {
    allowEdge,
    until: (n) => {
      const node = nodeById.get(n);
      return node ? predicate(node) : false;
    },
    maxDepth: 50,
  });

  if (!r.end) return null;
  return nodeById.get(r.end) ?? null;
}

/**
 * 高亮连通路径（从起点 BFS，把沿途所有 pipe 收集起来）
 *
 * 用途：选中管段/节点 → 高亮上下游
 */
export function highlightConnectivity(
  adj: AdjacencyList,
  start: string
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const r = bfs(adj, start, { maxDepth: 64 });
  const nodeIds = new Set(r.visited);
  const edgeIds = new Set<string>();

  for (const n of r.visited) {
    const edges = adj.get(n) ?? [];
    for (const e of edges) {
      // 只高亮两端都已访问的边
      if (nodeIds.has(e.to)) edgeIds.add(e.pipeId);
    }
  }

  return { nodeIds, edgeIds };
}
