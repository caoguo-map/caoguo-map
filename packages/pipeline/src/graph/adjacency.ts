/**
 * 图邻接表构建（管线拓扑 → 双向邻接表）
 *
 * 输入：管网拓扑数据集（节点 + 管段）
 * 输出：邻接表 Map<nodeId, Edge[]>
 *
 * Phase 1 图遍历的入口：把物理拓扑转换为图论可用的数据结构。
 */

import type {
  PipelineNode,
  PipelinePipe,
  PipelineTopologyDataset,
} from '../types';

/**
 * 邻接表中的"边"
 *  - 物理上一条 pipe 是两个 node 之间的连接
 *  - 邻接表中记录：pipeId、邻居节点 id、长度等
 */
export interface AdjEdge {
  pipeId: string;
  /** 邻居节点 id（沿此边走一步到达） */
  to: string;
  /** 长度（m），无则 0 */
  length: number;
  /** 阻力/权重（用于复杂路径优选，可选） */
  weight?: number;
}

/** 邻接表：Map<nodeId, AdjEdge[]> */
export type AdjacencyList = Map<string, AdjEdge[]>;

/**
 * 从 PipelineTopologyDataset 构建邻接表
 */
export function buildAdjacency(dataset: PipelineTopologyDataset): AdjacencyList {
  const adj: AdjacencyList = new Map();

  // 初始化所有节点（防止孤立点不出现）
  for (const node of dataset.nodes) {
    if (!adj.has(node.id)) adj.set(node.id, []);
  }

  for (const pipe of dataset.pipes) {
    const len = pipe.length ?? pipeLengthFromGeometry(pipe, dataset.nodes) ?? 0;

    const fromList = adj.get(pipe.fromNode) ?? [];
    fromList.push({
      pipeId: pipe.id,
      to: pipe.toNode,
      length: len,
    });
    adj.set(pipe.fromNode, fromList);

    const toList = adj.get(pipe.toNode) ?? [];
    toList.push({
      pipeId: pipe.id,
      to: pipe.fromNode,
      length: len,
    });
    adj.set(pipe.toNode, toList);
  }

  return adj;
}

/**
 * 计算单条 pipe 长度（haversine）
 * 若 pipe 提供 geometry 则累计几何点距离，否则按 from-to 直线长度。
 */
export function pipeLengthFromGeometry(
  pipe: PipelinePipe,
  nodes: PipelineNode[]
): number {
  if (pipe.length && pipe.length > 0) return pipe.length;
  if (pipe.geometry && pipe.geometry.length >= 2) {
    let total = 0;
    for (let i = 1; i < pipe.geometry.length; i++) {
      total += haversine(
        pipe.geometry[i - 1][0],
        pipe.geometry[i - 1][1],
        pipe.geometry[i][0],
        pipe.geometry[i][1]
      );
    }
    return total;
  }
  const from = nodes.find((n) => n.id === pipe.fromNode);
  const to = nodes.find((n) => n.id === pipe.toNode);
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
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 从邻接表拿指定节点的邻居 id 列表（去重） */
export function neighborIds(adj: AdjacencyList, nodeId: string): string[] {
  const list = adj.get(nodeId) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of list) {
    if (!seen.has(e.to)) {
      seen.add(e.to);
      out.push(e.to);
    }
  }
  return out;
}

/** 取出指定节点的所有边 */
export function edgesOf(adj: AdjacencyList, nodeId: string): AdjEdge[] {
  return adj.get(nodeId) ?? [];
}
