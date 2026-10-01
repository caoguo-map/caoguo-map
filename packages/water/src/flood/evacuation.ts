/**
 * 撤退路径推荐（PRD phase-2-grid-water §4.2 F-6）
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 *
 * 设计口径（与 F-4 `overlayFlood` 同构，引擎先行、数据由调用方注入）：
 * - 路网由调用方注入（`EvacuationGraph`），本模块只负责「淹没范围 × 路网」的通路计算；
 * - **不自动宣布最优路线**：等长候选可能存在多条，本模块按 Dijkstra 给出最近安全点，
 *   最终选哪条撤退由调用方决定；
 * - 被淹没判定：沿边**内部**采样（默认 3 点，不含两端），任一点落入淹没多边形即整条边禁行；
 *   不含两端是刻意的 —— 撤离起点本身就在淹没区内，把端点淹没也算禁行会把起点封死。
 */

import { pointInPolygon } from './scenarioCompare';

/** 路网节点 */
export interface EvacuationNode {
  id: string;
  lng: number;
  lat: number;
  name?: string;
}

/** 路网边（无向） */
export interface EvacuationEdge {
  from: string;
  to: string;
  /** 通行权重（米）；缺省按两端点球面距离计算 */
  weight?: number;
}

/** 注入式路网 */
export interface EvacuationGraph {
  nodes: EvacuationNode[];
  edges: EvacuationEdge[];
}

/** 单条撤退路线 */
export interface EvacuationRoute {
  /** 撤离起点（处于淹没区内的节点） */
  originId: string;
  /** 最近安全点；完全被洪水隔离时为 null */
  shelterId: string | null;
  /** 途经节点序列（起点 → 安全点） */
  path: string[];
  /** 与 path 对应的经纬度序列，便于直接渲染 */
  pathCoords: [number, number][];
  /** 路径总长度（米）；起点本身即安全点时为 0 */
  distanceM: number;
  /** 是否找到通往安全点的通路 */
  reachable: boolean;
}

export interface EvacuationPlanOptions {
  /** 淹没范围多边形（经纬度环）列表；缺省由调用方通过 originIds/shelterIds 直接指定 */
  floodPolygons?: [number, number][][];
  /** 撤离起点节点 id；缺省取「落在淹没区内」的全部节点 */
  originIds?: string[];
  /** 安全点（避难所）节点 id；缺省取「不在淹没区内」的全部节点 */
  shelterIds?: string[];
  /** 沿边内部采样点数（不含两端），用于判定边是否被淹没，默认 3 */
  samplesPerEdge?: number;
}

export interface EvacuationPlan {
  /** 每个撤离起点的推荐路线 */
  routes: EvacuationRoute[];
  /** 因淹没而禁行的边（无向键「a|b」，字典序拼接） */
  blockedEdges: string[];
  /** 判定为需要撤离的起点 */
  originIds: string[];
  /** 作为撤离目标的安全点 */
  shelterIds: string[];
}

/** 无向边键：字典序拼接，避免 from/to 顺序影响去重 */
export function edgeKey(from: string, to: string): string {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

const EARTH_RADIUS_M = 6371000;

/** 两点球面距离（米） */
export function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 沿边内部等距采样（**不含两端**）。
 *
 * 关键：端点落在淹没区不代表该边不可通行 —— 撤离起点本身就位于淹没区内，
 * 若把「端点淹没」也算作禁行，起点会被自己的出入口封死、永远无法撤离。
 * 因此只依据边的中段是否穿越淹没区来判定。
 */
function sampleInterior(a: EvacuationNode, b: EvacuationNode, samples: number): [number, number][] {
  const n = Math.max(1, Math.floor(samples));
  const pts: [number, number][] = [];
  for (let i = 1; i <= n; i += 1) {
    const t = i / (n + 1);
    pts.push([a.lng + (b.lng - a.lng) * t, a.lat + (b.lat - a.lat) * t]);
  }
  return pts;
}

function inAnyPolygon(lng: number, lat: number, polygons: [number, number][][]): boolean {
  return polygons.some((poly) => pointInPolygon(lng, lat, poly));
}

/**
 * 计算撤退路径：以全部安全点为源做一次多源 Dijkstra，
 * 遍历时跳过被淹没的边，再为每个撤离起点回溯出最近安全点的路线。
 */
export function planEvacuation(
  graph: EvacuationGraph,
  options: EvacuationPlanOptions = {},
): EvacuationPlan {
  const polygons = options.floodPolygons ?? [];
  const samples = options.samplesPerEdge ?? 3;
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // 1) 判定被淹没的边（整条禁行）
  const blocked = new Set<string>();
  for (const e of graph.edges) {
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b) continue;
    const hit = sampleInterior(a, b, samples).some(([lng, lat]) => inAnyPolygon(lng, lat, polygons));
    if (hit) blocked.add(edgeKey(e.from, e.to));
  }

  // 2) 起点与安全点
  const originIds = options.originIds
    ? options.originIds.filter((id) => nodeMap.has(id))
    : graph.nodes.filter((n) => inAnyPolygon(n.lng, n.lat, polygons)).map((n) => n.id);
  const shelterIds = options.shelterIds
    ? options.shelterIds.filter((id) => nodeMap.has(id))
    : graph.nodes.filter((n) => !inAnyPolygon(n.lng, n.lat, polygons)).map((n) => n.id);

  // 3) 邻接表（排除禁行边）
  const adj = new Map<string, { to: string; w: number }[]>();
  const push = (from: string, to: string, w: number) => {
    const list = adj.get(from) ?? [];
    list.push({ to, w });
    adj.set(from, list);
  };
  for (const e of graph.edges) {
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b || blocked.has(edgeKey(e.from, e.to))) continue;
    const w = e.weight ?? haversineMeters([a.lng, a.lat], [b.lng, b.lat]);
    push(e.from, e.to, w);
    push(e.to, e.from, w);
  }

  // 4) 多源 Dijkstra（从所有安全点同时出发；节点规模有限，取最小用线性扫描）
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const settled = new Set<string>();
  for (const s of shelterIds) dist.set(s, 0);

  for (;;) {
    let cur: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (!settled.has(id) && d < best) {
        best = d;
        cur = id;
      }
    }
    if (cur === null) break;
    settled.add(cur);
    for (const { to, w } of adj.get(cur) ?? []) {
      const nd = best + w;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, cur);
      }
    }
  }

  // 5) 为每个起点回溯路线
  const routes: EvacuationRoute[] = originIds.map((originId) => {
    if (!dist.has(originId)) {
      const n = nodeMap.get(originId)!;
      return {
        originId,
        shelterId: null,
        path: [originId],
        pathCoords: [[n.lng, n.lat]],
        distanceM: 0,
        reachable: false,
      };
    }
    const path = [originId];
    let cur = originId;
    while (prev.has(cur)) {
      cur = prev.get(cur)!;
      path.push(cur);
    }
    const coords: [number, number][] = [];
    for (const id of path) {
      const n = nodeMap.get(id)!;
      coords.push([n.lng, n.lat]);
    }
    return {
      originId,
      shelterId: path[path.length - 1],
      path,
      pathCoords: coords,
      distanceM: dist.get(originId)!,
      reachable: true,
    };
  });

  return {
    routes,
    blockedEdges: [...blocked].sort(),
    originIds,
    shelterIds,
  };
}
