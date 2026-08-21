/**
 * 阀门规划（valve planner）
 *
 * 在已知故障管段的前提下，候选出最优的"关闭+打开"组合。
 * 评估指标：
 *  - 隔离完整性：关闭阀门后故障段必须与气源/水源完全分离
 *  - 影响最小：关闭数量最小，受影响用户最少
 *  - 操作便利：按操作顺序列出阀门编号
 */

import type { PipelineNode, PipelineTopologyDataset, PipelinePipe } from '../types';
import { buildAdjacency, type AdjacencyList } from '../graph/adjacency';
import { bfs } from '../graph/bfs';
import { dijkstra } from '../graph/shortestPath';

export interface CandidateValveSet {
  valves: PipelineNode[];
  /** 完整性：关闭后故障段到最近 source 的最短距离（Infinity = 完全隔离） */
  isolationCompleteness: number;
  /** 受影响用户数（关闭阀门后的下游覆盖） */
  impactUserCount: number;
  /** 阀门操作顺序（按节点编号字典序，仅辅助） */
  operationOrder: string[];
}

export interface PlannerOptions {
  /** 最大候选组合数（指数爆炸时截断） */
  maxCombinations?: number;
  /** 阀门过滤：仅考虑状态/类型匹配的 */
  filter?: (valve: PipelineNode) => boolean;
}

/**
 * 列出上游候选阀门（沿故障 pipe 两端 BFS 找到的所有阀门，按距离排序）
 */
export function listCandidateValves(
  dataset: PipelineTopologyDataset,
  pipeId: string,
  filter?: (valve: PipelineNode) => boolean
): PipelineNode[] {
  const pipe = dataset.pipes.find((p) => p.id === pipeId);
  if (!pipe) return [];
  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n] as const));
  const adj = buildAdjacency(dataset);

  const visited = new Set<string>();
  const valveCandidates: Array<{ n: PipelineNode; dist: number }> = [];

  for (const startId of [pipe.fromNode, pipe.toNode]) {
    const queue: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }];
    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const n = nodeById.get(id);
      if (!n) continue;
      // 端点本身如果是阀门, 也算候选
      if (n.kind === 'valve' && (!filter || filter(n))) {
        valveCandidates.push({ n, dist: d });
        // 第一个阀门已找到, 不必继续扩展 (但允许从端点继续找其它)
        if (d > 0) continue;
      }

      const edges = adj.get(id) ?? [];
      for (const e of edges) {
        if (e.pipeId === pipeId) continue; // 不穿过故障 pipe
        if (visited.has(e.to)) continue;
        queue.push({ id: e.to, d: d + 1 });
      }
    }
  }

  valveCandidates.sort((a, b) => a.dist - b.dist);
  return valveCandidates.map((v) => v.n);
}

/**
 * 评估某组阀门关闭后的隔离完整性与受影响用户数
 */
export function evaluateValvePlan(
  dataset: PipelineTopologyDataset,
  pipeId: string,
  valvesToClose: PipelineNode[]
): CandidateValveSet {
  const pipe = dataset.pipes.find((p) => p.id === pipeId);
  if (!pipe) {
    return {
      valves: valvesToClose,
      isolationCompleteness: Infinity,
      impactUserCount: 0,
      operationOrder: [],
    };
  }

  // 模拟"关闭阀门 = 在邻接表中标记为不可通过"，重新计算下游覆盖
  const adj = buildAdjacency(dataset);
  const closedSet = new Set(valvesToClose.map((v) => v.id));
  const pipeById = new Map(dataset.pipes.map((p) => [p.id, p] as const));

  const affectedNodes = bfs(adj, pipe.toNode, {
    allowEdge: (_e, _f, to) => !closedSet.has(to),
    maxDepth: 1000,
  }).visited;

  // 受影响用户数
  const users = (dataset.users ?? []).filter((u) => {
    if (!u.nodeId) return false;
    return affectedNodes.includes(u.nodeId);
  });

  // 隔离完整性：source → 故障段 任一端 的可达性
// 语义：所有 source 都不能绕过 closedSet 抵达 fromNode/toNode → Infinity（完全隔离）
// 否则：completeness = source 到故障段最近的可达距离（米）
  const sources = dataset.nodes.filter((n) => n.kind === 'source');
  let completeness = Infinity;
  for (const s of sources) {
    const rTo = dijkstra(adj, s.id, pipe.toNode, {
      weight: (e) => (closedSet.has(e.to) ? Infinity : e.length || 1),
    });
    const rFrom = dijkstra(adj, s.id, pipe.fromNode, {
      weight: (e) => (closedSet.has(e.to) ? Infinity : e.length || 1),
    });
    const reachable =
      rTo.found ? rTo.distance : Infinity;
    const reachableFrom =
      rFrom.found ? rFrom.distance : Infinity;
    const nearest = Math.min(reachable, reachableFrom);
    if (nearest < completeness) completeness = nearest;
  }

  const order = valvesToClose
    .map((v) => v.properties?.code ?? v.id)
    .sort();

  return {
    valves: valvesToClose,
    isolationCompleteness: completeness,
    impactUserCount: users.length,
    operationOrder: order,
  };
}
