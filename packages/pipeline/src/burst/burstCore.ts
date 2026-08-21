/**
 * BurstSimulator 核心算法（纯函数）
 *
 * 模拟"故障管段"后：
 * 1. 找所有隔离候选阀门（沿故障 pipe 任意一端 BFS，候选上、下游最近阀门）
 * 2. 至少保留：上游最近阀门 + 下游最近阀门，确保"故障段完全与气源/水源分离"
 * 3. 下游 BFS（同时绕过被关闭阀门）找受影响节点
 * 4. 关联受影响用户（居民/商业/工业）
 * 5. 重要用户识别（医院/学校/工厂）
 * 6. 备选供气/供水路径（Dijkstra）
 *
 * 全部为纯函数,接收数据集返回结果,可在 Node/浏览器两侧运行。
 */

import type {
  PipelineTopologyDataset,
  PipelineNode,
  PipelinePipe,
  PipelineUser,
  UserKind,
} from '../types';
import {
  buildAdjacency,
  type AdjacencyList,
  haversine,
} from '../graph/adjacency';
import { bfs } from '../graph/bfs';
import { dijkstra } from '../graph/shortestPath';
import { findPaths } from '../graph/connectivity';

/** 阀门隔离方案 */
export interface ValvePlan {
  /** 需关闭的阀门（隔离故障段） */
  closeValves: PipelineNode[];
  /** 需打开的阀门（泄压/排水） */
  openValves: PipelineNode[];
  /** 备选供气/供水路径（多源时才有） */
  alternativePaths: string[][];
  /** 预计停气/停水时间字符串（如 "2h"、"45min"） */
  estimatedShutdownTime: string;
  /** 隔离方案的可读摘要 */
  summary: string;
}

/** 影响区域（受影响管段的几何范围） */
export interface ImpactArea {
  type: 'FeatureCollection';
  features: Array<
    | { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: { kind: 'node' } }
    | { type: 'Feature'; geometry: { type: 'LineString'; coordinates: [number, number][] }; properties: { kind: 'pipe' } }
  >;
  /** 凸包多边形（受影响区域外轮廓） */
  hull: [number, number][];
}

export interface BurstSimulateOptions {
  /** 风机等扩展参数：默认按气体泄漏 */
  scenario?: 'gas' | 'water' | 'drainage' | 'heating';
  /** 是否同时禁用"已关闭阀门"作为隔离点（推荐 true） */
  skipClosedValves?: boolean;
  /** 最大 alternative path 数 */
  maxAlternatives?: number;
}

export interface BurstSimulateResult {
  /** 故障管段 */
  pipe: PipelinePipe;
  /** 受影响节点列表（含故障管段两端） */
  affectedNodes: PipelineNode[];
  /** 受影响管段列表 */
  affectedPipes: PipelinePipe[];
  /** 受影响用户列表 */
  affectedUsers: PipelineUser[];
  /** 受影响用户总数 */
  affectedUserCount: number;
  /** 重要用户（医院/学校/政府） */
  importantUsers: PipelineUser[];
  /** 影响区域几何（GeoJSON FeatureCollection + 凸包） */
  impactArea: ImpactArea;
  /** 阀门隔离方案 */
  valvePlan: ValvePlan;
  /** 计算耗时（ms） */
  durationMs: number;
}

/**
 * 主入口：执行爆管推演
 */
export function simulateBurst(
  dataset: PipelineTopologyDataset,
  pipeId: string,
  opts: BurstSimulateOptions = {}
): BurstSimulateResult {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const scenario = opts.scenario ?? 'gas';
  const skipClosed = opts.skipClosedValves ?? true;
  const maxAlt = opts.maxAlternatives ?? 2;

  const pipe = dataset.pipes.find((p) => p.id === pipeId);
  if (!pipe) {
    throw new Error(`BurstSimulator: pipe '${pipeId}' not found in dataset`);
  }
  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n] as const));
  const adj = buildAdjacency(dataset);

  // 1) 沿故障 pipe 两端都搜索最近阀门（上下游）
  const upstreamValves = findValvesFromEndpoint(adj, pipe, dataset, pipe.fromNode, skipClosed);
  const downstreamValves = findValvesFromEndpoint(adj, pipe, dataset, pipe.toNode, skipClosed);
  // 合并（按距离排序去重）
  const candidateClose = mergeCandidateValves(upstreamValves, downstreamValves);

  // 2) 下游 BFS（PRD step 2）：跳过关闭的阀门
  const closedSet = new Set(candidateClose.map((v) => v.id));
  const downstream = bfs(adj, pipe.toNode, {
    allowEdge: (_e, _f, to) => {
      if (closedSet.has(to)) return false;
      return true;
    },
    maxDepth: 1_000,
  });

  const affectedSet = new Set(downstream.visited);
  // 故障 pipe from/to 节点也要纳入受影响范围（事件源）
  affectedSet.add(pipe.fromNode);

  const affectedNodes: PipelineNode[] = [];
  for (const id of affectedSet) {
    const n = nodeById.get(id);
    if (n) affectedNodes.push(n);
  }

  // 受影响管段：所有至少一端在 affectedNodes 的管段
  const affectedPipes: PipelinePipe[] = dataset.pipes.filter(
    (p) => affectedSet.has(p.fromNode) || affectedSet.has(p.toNode)
  );

  // 3) 查询受影响用户
  const users = dataset.users ?? [];
  const affectedUsers = users.filter((u) => {
    if (!u.nodeId) return false;
    return affectedSet.has(u.nodeId);
  });
  const importantUsers = affectedUsers.filter((u) => u.kind === 'important');

  // 4) 影响区域几何
  const impactArea = computeImpactArea(affectedNodes, affectedPipes);

  // 5) 阀门隔离方案
  const valvePlan = buildValvePlan(
    adj,
    dataset,
    pipe,
    candidateClose,
    affectedNodes,
    maxAlt,
    scenario
  );

  const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  return {
    pipe,
    affectedNodes,
    affectedPipes,
    affectedUsers,
    affectedUserCount: affectedUsers.length,
    importantUsers,
    impactArea,
    valvePlan,
    durationMs,
  };
}

// ============================================================
// 内部辅助
// ============================================================

interface ValveCandidate {
  node: PipelineNode;
  /** 距起点跳数 */
  hops: number;
  /** 距起点物理距离 */
  distance: number;
  /** 来源端 fromNode/toNode */
  endpoint: 'from' | 'to';
}

/** 从指定端点出发 BFS，沿拓扑找最近的阀门
 *
 * 关键规则：
 *  - 端点本身如果是阀门 → 直接作为最近阀门返回，不再扩展
 *  - 否则 BFS 找最近的阀门（找到立即停止）
 */
function findValvesFromEndpoint(
  adj: AdjacencyList,
  pipe: PipelinePipe,
  dataset: PipelineTopologyDataset,
  startId: string,
  skipClosed: boolean
): ValveCandidate[] {
  const faultPipeId = pipe.id;
  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n] as const));
  const out: ValveCandidate[] = [];
  const endpoint = startId === pipe.fromNode ? 'from' : 'to';

  const startNode = nodeById.get(startId);
  if (!startNode) return [];

  // 0) 端点本身就是阀门 → 立即返回
  if (startNode.kind === 'valve') {
    if (!skipClosed || startNode.properties?.valveStatus !== 'closed') {
      out.push({ node: startNode, hops: 0, distance: 0, endpoint });
    }
    return out;
  }

  // 1) 否则 BFS 找最近的阀门
  const visited = new Set<string>();
  const queue: Array<{ id: string; hops: number; dist: number }> = [
    { id: startId, hops: 0, dist: 0 },
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);

    const n = nodeById.get(cur.id);
    if (!n) continue;

    if (n.kind === 'valve' && (!skipClosed || n.properties?.valveStatus !== 'closed')) {
      out.push({ node: n, hops: cur.hops, distance: cur.dist, endpoint });
      return out; // 找最近的，返回
    }

    const edges = adj.get(cur.id) ?? [];
    for (const e of edges) {
      if (e.pipeId === faultPipeId) continue;
      if (visited.has(e.to)) continue;
      queue.push({
        id: e.to,
        hops: cur.hops + 1,
        dist: cur.dist + (e.length || 0),
      });
    }
  }

  return out;
}

/** 合并上下游阀门候选（按距离排重） */
function mergeCandidateValves(
  upstream: ValveCandidate[],
  downstream: ValveCandidate[]
): PipelineNode[] {
  const seen = new Set<string>();
  const all = [...upstream, ...downstream].sort((a, b) => a.distance - b.distance);
  const out: PipelineNode[] = [];
  for (const c of all) {
    if (seen.has(c.node.id)) continue;
    seen.add(c.node.id);
    out.push(c.node);
  }
  return out;
}

/**
 * 构造影响区域
 *  - features: 受影响节点（Point） + 受影响管段（LineString）
 *  - hull: 节点集的凸包（用于地图高亮"受影响地理范围"）
 */
function computeImpactArea(
  nodes: PipelineNode[],
  pipes: PipelinePipe[]
): ImpactArea {
  const features: ImpactArea['features'] = [];
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));

  for (const n of nodes) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
      properties: { kind: 'node' },
    });
  }
  for (const p of pipes) {
    let coords: [number, number][] = [];
    if (p.geometry && p.geometry.length >= 2) {
      coords = p.geometry as [number, number][];
    } else {
      const from = nodeById.get(p.fromNode);
      const to = nodeById.get(p.toNode);
      if (from && to) coords = [[from.lng, from.lat], [to.lng, to.lat]];
    }
    if (coords.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { kind: 'pipe' },
      });
    }
  }

  const hull = convexHull(nodes.map((n) => [n.lng, n.lat] as [number, number]));

  return { type: 'FeatureCollection', features, hull };
}

/**
 * 构造阀门隔离方案
 */
function buildValvePlan(
  adj: AdjacencyList,
  dataset: PipelineTopologyDataset,
  pipe: PipelinePipe,
  closeValves: PipelineNode[],
  _affectedNodes: PipelineNode[],
  maxAlt: number,
  scenario: string
): ValvePlan {
  const closeSet = new Set(closeValves.map((v) => v.id));

  // 找泄压点：受影响区域内"开放"且"不在关闭列表"的阀门
  const openValves: PipelineNode[] = [];
  for (const n of _affectedNodes) {
    if (n.kind !== 'valve') continue;
    if (closeSet.has(n.id)) continue;
    if (n.properties?.valveStatus !== 'open') continue;
    const from = dataset.nodes.find((m) => m.id === pipe.fromNode);
    const to = dataset.nodes.find((m) => m.id === pipe.toNode);
    if (!from || !to) continue;
    const d1 = haversine(n.lng, n.lat, from.lng, from.lat);
    const d2 = haversine(n.lng, n.lat, to.lng, to.lat);
    if (Math.min(d1, d2) < 1000) openValves.push(n);
  }

  // 备选路径：从关闭阀门出发 → 其它 source（隔离后备用气源/水源）
  const alternativePaths: string[][] = [];
  if (closeValves.length) {
    const sources = dataset.nodes.filter((n) => n.kind === 'source');
    for (const s of sources) {
      // 选最接近关闭阀门的 source 寻路（确保目标非 closed 阀门）
      const r = dijkstra(adj, closeValves[0].id, s.id, {
        weight: (e) => (closeSet.has(e.to) ? Infinity : e.length || 1),
      });
      if (r.found) {
        const paths = findPaths(adj, closeValves[0].id, s.id, {
          maxPaths: maxAlt,
          maxDepth: 20,
        });
        for (const p of paths) alternativePaths.push(p);
        break;
      }
    }
  }

  // 估算停气/停水时间（基于受影响用户数和场景）
  const userCount = (dataset.users ?? []).filter((u) =>
    _affectedNodes.some((n) => n.id === u.nodeId)
  ).length;
  const baseHours = userCount / 200;
  const scenarioFactor = scenario === 'water' ? 1.5 : scenario === 'heating' ? 2 : 1;
  const hours = Math.max(0.5, Math.min(8, baseHours * scenarioFactor));
  const estimatedShutdownTime = hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}min`;

  const summary = buildSummary(closeValves, openValves, userCount, scenario);

  return {
    closeValves,
    openValves,
    alternativePaths,
    estimatedShutdownTime,
    summary,
  };
}

function buildSummary(
  closeValves: PipelineNode[],
  openValves: PipelineNode[],
  userCount: number,
  scenario: string
): string {
  const labels: Record<string, string> = {
    gas: '停气',
    water: '停水',
    drainage: '排水中断',
    heating: '停热',
  };
  const label = labels[scenario] ?? '受影响';
  const parts: string[] = [];
  parts.push(`预计${label}${userCount}户`);
  if (closeValves.length) {
    parts.push(`关闭阀门 ${closeValves.map((v) => v.properties?.code ?? v.id).join(', ')}`);
  } else {
    parts.push('未找到上游隔离阀门（建议人工指定）');
  }
  if (openValves.length) {
    parts.push(`打开阀门 ${openValves.map((v) => v.properties?.code ?? v.id).join(', ')}（泄压）`);
  }
  return parts.join('；');
}

// ============================================================
// 凸包（Andrew's monotone chain，O(n log n)）
// ============================================================

/** Andrew's monotone chain，返回逆时针凸包顶点（首尾不重复） */
export function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return [...points];
  const pts = [...points];
  pts.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number]
  ): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** 用户严重程度打分（用于"优先通告"列表） */
export function userSeverity(kind: UserKind, scale = 1): number {
  const base: Record<UserKind, number> = {
    important: 100,
    industrial: 50,
    commercial: 20,
    residential: 1,
  };
  return (base[kind] ?? 1) * (scale ?? 1);
}
