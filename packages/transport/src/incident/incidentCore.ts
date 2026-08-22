/**
 * IncidentMap 事件响应核心算法（纯函数，PRD §3.3）
 *
 * 功能点：
 * - IM-1 事件标记
 * - IM-2 影响范围：自动计算事件对路网的影响区域
 * - IM-3 附近资源：事件周边摄像头/救援站/医院
 * - IM-4 绕行方案：自动推荐替代路径
 * - IM-5 事件时间线
 */

import type {
  RoadNetworkDataset,
  Incident,
  RoadNode,
  RoadEdge,
  IncidentSeverity,
} from '../types';
import { buildRoadAdjacency, dijkstra, haversine, bfs } from '../graph';
import { INCIDENT_TYPE_LABELS } from '../style/transportTheme';

/** 影响范围结果 */
export interface IncidentImpact {
  /** 受影响路段 id 列表 */
  affectedEdges: string[];
  /** 影响半径（米，按严重程度） */
  radiusMeters: number;
  /** 附近资源 */
  nearbyResources: {
    cameras: RoadNode[];
    rescue: RoadNode[];
    hospitals: RoadNode[];
  };
  /** 绕行方案（替代路径） */
  detour: {
    found: boolean;
    path: string[];
    distance: number;
  } | null;
}

/** 事件时间线 */
export interface IncidentTimelineStep {
  status: 'occurred' | 'dispatched' | 'handling' | 'resolved';
  label: string;
  time?: string;
}

/** 严重程度 → 影响半径（米） */
const SEVERITY_RADIUS: Record<IncidentSeverity, number> = {
  low: 500,
  medium: 1000,
  high: 2000,
  critical: 5000,
};

/**
 * 查找中心半径内的附近资源（IM-3）。PRD §3.3「事故点 3 公里内摄像头」。
 * 纯函数：返回按类型分组的节点，便于 NLPG 与 IncidentMap 复用。
 */
export function findNearbyResources(
  dataset: RoadNetworkDataset,
  lng: number,
  lat: number,
  radius: number
): { cameras: RoadNode[]; rescue: RoadNode[]; hospitals: RoadNode[] } {
  const inRange = (n: RoadNode) => haversine(lng, lat, n.lng, n.lat) <= radius;
  return {
    cameras: dataset.nodes.filter((n) => n.kind === 'camera' && inRange(n)),
    rescue: dataset.nodes.filter((n) => n.kind === 'rescue' && inRange(n)),
    hospitals: dataset.nodes.filter((n) => n.kind === 'hospital' && inRange(n)),
  };
}

/**
 * 计算事件影响范围 + 附近资源 + 绕行方案
 */
export function analyzeIncident(
  dataset: RoadNetworkDataset,
  incident: Incident
): IncidentImpact {
  const severity = incident.properties?.severity ?? 'medium';
  const radius = SEVERITY_RADIUS[severity];

  // 影响范围：半径内直接受影响 + 沿拓扑扩散
  const directEdges = dataset.edges.filter((e) => {
    const from = dataset.nodes.find((n) => n.id === e.fromNode);
    const to = dataset.nodes.find((n) => n.id === e.toNode);
    if (!from || !to) return false;
    // 路段中点距事件点距离
    const midLng = (from.lng + to.lng) / 2;
    const midLat = (from.lat + to.lat) / 2;
    return haversine(incident.lng, incident.lat, midLng, midLat) <= radius;
  });

  // 附近资源
  const { cameras, rescue, hospitals } = findNearbyResources(
    dataset,
    incident.lng,
    incident.lat,
    radius
  );

  // 绕行方案：若事件关联路段，找该路段两端点绕行路径
  let detour: IncidentImpact['detour'] = null;
  if (incident.edgeId) {
    const edge = dataset.edges.find((e) => e.id === incident.edgeId);
    if (edge) {
      const adj = buildRoadAdjacency(dataset);
      // 绕过事件路段：禁用它
      const blocked = new Set([edge.id]);
      const r = dijkstraAvoid(adj, dataset, edge.fromNode, edge.toNode, blocked);
      if (r.found) {
        detour = { found: true, path: r.path, distance: r.distance };
      } else {
        detour = { found: false, path: [], distance: Infinity };
      }
    }
  }

  return {
    affectedEdges: directEdges.map((e) => e.id),
    radiusMeters: radius,
    nearbyResources: { cameras, rescue, hospitals },
    detour,
  };
}

/** Dijkstra 绕行（避开指定路段） */
function dijkstraAvoid(
  adj: ReturnType<typeof buildRoadAdjacency>,
  dataset: RoadNetworkDataset,
  start: string,
  end: string,
  blocked: Set<string>
): { distance: number; path: string[]; found: boolean } {
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
      if (blocked.has(e.edgeId)) continue;
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
 * 生成事件时间线（事件发生→处置→解除）
 */
export function buildIncidentTimeline(incident: Incident): IncidentTimelineStep[] {
  const steps: IncidentTimelineStep[] = [
    {
      status: 'occurred',
      label: `${INCIDENT_TYPE_LABELS[incident.type] ?? '事件'}发生`,
      time: incident.properties?.occurredAt,
    },
  ];
  if (incident.properties?.dispatchedAt) {
    steps.push({ status: 'dispatched', label: '已派单处置', time: incident.properties.dispatchedAt });
  }
  if (incident.properties?.status === 'handling' || incident.properties?.resolvedAt) {
    steps.push({ status: 'handling', label: '处置中', time: incident.properties.resolvedAt });
  }
  if (incident.properties?.status === 'resolved') {
    steps.push({ status: 'resolved', label: '已解除', time: incident.properties.resolvedAt });
  }
  return steps;
}
