/**
 * 通信网拓扑分析核心算法（纯函数，PRD phase-3 §5.4）
 *
 * 功能点：
 * - TC-1.1 最近邻基站搜索（基于 Haversine 距离）
 * - TC-1.2 连通分量分析（基站是否在同覆盖/邻近距离内构成集群）
 * - TC-1.3 度中心性（基于最近邻图的连接数）
 * - TC-1.4 拓扑邻接图构建
 *
 * 设计原则：纯函数 + 类型导出，零依赖 maplibre。
 */

import type { BaseStation, TelecomTopologyDataset, CoverageArea } from '../types';
import { haversine } from '../coverage/coverageCore';

// ============================================================
// 一、类型
// ============================================================

/** 基站邻接关系 */
export interface StationAdjacency {
  /** 源基站 id */
  from: string;
  /** 目标基站 id */
  to: string;
  /** 物理距离（m） */
  distance: number;
}

/** 基站邻接图（邻接表） */
export type StationAdjacencyGraph = Map<string, StationAdjacency[]>;

/** 连通分量 */
export interface ConnectivityComponent {
  /** 分量 id（0-based） */
  id: number;
  /** 分量内基站 ids */
  stationIds: string[];
  /** 分量基站数 */
  size: number;
}

/** 基站中心性 */
export interface StationCentrality {
  stationId: string;
  /** 度中心性（0-1） */
  degree: number;
  /** 邻居数 */
  neighborCount: number;
}

// ============================================================
// 二、最近邻搜索
// ============================================================

/**
 * TC-1.1 查找某基站最近的 K 个邻居基站
 *
 * @param stationId  源基站 id（不在结果中返回）
 * @param dataset    数据集
 * @param k          邻居数（默认 3）
 * @param maxRadius  最大搜索半径（m），默认 50km（过滤掉过远基站）
 */
export function findNeighborStations(
  stationId: string,
  dataset: TelecomTopologyDataset,
  options: { k?: number; maxRadius?: number } = {}
): StationAdjacency[] {
  const k = options.k ?? 3;
  const maxRadius = options.maxRadius ?? 50_000;
  const src = dataset.baseStations.find((s) => s.id === stationId);
  if (!src) return [];

  const dists: StationAdjacency[] = [];
  for (const other of dataset.baseStations) {
    if (other.id === stationId) continue;
    const d = haversine(src.lng, src.lat, other.lng, other.lat);
    if (d > maxRadius) continue;
    dists.push({ from: stationId, to: other.id, distance: d });
  }
  dists.sort((a, b) => a.distance - b.distance);
  return dists.slice(0, k);
}

// ============================================================
// 三、邻接图构建
// ============================================================

/**
 * TC-1.4 构建全网基站邻接图（基于最近邻 K 个 + 距离阈值）
 *
 * @param dataset 数据集
 * @param k       每个基站保留的最近邻数
 * @param maxRadius 邻居距离阈值（m）
 */
export function buildAdjacencyGraph(
  dataset: TelecomTopologyDataset,
  options: { k?: number; maxRadius?: number } = {}
): StationAdjacencyGraph {
  const k = options.k ?? 3;
  const maxRadius = options.maxRadius ?? 50_000;
  const graph: StationAdjacencyGraph = new Map();

  for (const s of dataset.baseStations) {
    graph.set(s.id, findNeighborStations(s.id, dataset, { k, maxRadius }));
  }

  // 双向化：A→B 也加入 B→A（保证对称性，便于中心性计算）
  for (const [aId, adj] of graph) {
    for (const e of adj) {
      const reverse = graph.get(e.to);
      if (reverse && !reverse.some((r) => r.to === aId)) {
        reverse.push({ from: e.to, to: aId, distance: e.distance });
      }
    }
  }
  return graph;
}

// ============================================================
// 四、连通分量分析
// ============================================================

/**
 * TC-1.2 连通分量：基于邻接图分析基站集群
 *
 * 使用并查集（Union-Find）实现，时间复杂度接近 O(n α(n))
 */
function unionFind(n: number): {
  parent: number[];
  find: (x: number) => number;
  union: (a: number, b: number) => void;
} {
  const parent = new Array<number>(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // 路径压缩
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  return { parent, find, union };
}

/**
 * 求邻接图的连通分量
 *
 * @param graph 邻接图
 * @returns 分量数组，按 size 降序排列
 */
export function connectivityComponents(graph: StationAdjacencyGraph): ConnectivityComponent[] {
  const ids = Array.from(graph.keys());
  const idxById = new Map(ids.map((id, i) => [id, i] as const));
  const uf = unionFind(ids.length);

  for (const [aId, adj] of graph) {
    const ai = idxById.get(aId);
    if (ai === undefined) continue;
    for (const e of adj) {
      const bi = idxById.get(e.to);
      if (bi !== undefined) uf.union(ai, bi);
    }
  }

  const buckets = new Map<number, string[]>();
  for (let i = 0; i < ids.length; i++) {
    const root = uf.find(i);
    const list = buckets.get(root) ?? [];
    list.push(ids[i]);
    buckets.set(root, list);
  }

  const comps: ConnectivityComponent[] = [];
  let cid = 0;
  for (const [, stationIds] of buckets) {
    comps.push({ id: cid++, stationIds, size: stationIds.length });
  }
  return comps.sort((a, b) => b.size - a.size);
}

// ============================================================
// 五、中心性
// ============================================================

/**
 * TC-1.3 度中心性：基于邻接图的连接数归一化
 *
 * degree = (neighborCount) / (n - 1)
 *   - n=1 时 degree=0（无可对比）
 */
export function stationCentrality(graph: StationAdjacencyGraph): StationCentrality[] {
  const ids = Array.from(graph.keys());
  const n = ids.length;
  return ids.map((id) => {
    const adj = graph.get(id) ?? [];
    const neighborCount = adj.length;
    const degree = n > 1 ? neighborCount / (n - 1) : 0;
    return { stationId: id, degree, neighborCount };
  }).sort((a, b) => b.degree - a.degree);
}

// ============================================================
// 六、覆盖重叠拓扑
// ============================================================

/**
 * 判断两基站是否在覆盖上"重叠"（任一覆盖区域相交）
 *
 * 简化策略：两基站的覆盖多边形中心点距离 < 任一覆盖多边形最大半径之和
 *（精确求交需 O(n²)，简化为近似判断）
 */
export function areStationsOverlapping(
  a: BaseStation,
  b: BaseStation,
  coverageAreas: CoverageArea[]
): boolean {
  const aAreas = coverageAreas.filter((c) => c.stationId === a.id);
  const bAreas = coverageAreas.filter((c) => c.stationId === b.id);
  if (aAreas.length === 0 || bAreas.length === 0) return false;

  const polyRadius = (geom: [number, number][]): number => {
    const cx = geom.reduce((s, p) => s + p[0], 0) / geom.length;
    const cy = geom.reduce((s, p) => s + p[1], 0) / geom.length;
    let max = 0;
    for (const [x, y] of geom) {
      const d = haversine(cx, cy, x, y);
      if (d > max) max = d;
    }
    return max;
  };
  const ra = Math.max(...aAreas.map((a) => polyRadius(a.geom)));
  const rb = Math.max(...bAreas.map((b) => polyRadius(b.geom)));
  const d = haversine(a.lng, a.lat, b.lng, b.lat);
  return d <= ra + rb;
}