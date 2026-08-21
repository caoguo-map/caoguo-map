/**
 * 影响区域 helpers
 *
 * 把 BurstSimulator 输出的受影响节点+管段渲染成 MapLibre 图层用的 GeoJSON。
 */

import type { BurstSimulateResult } from './burstCore';
import type { PipelineNode, PipelinePipe } from '../types';

export interface MapLayerData {
  /** 受影响区域凸包多边形（用于高亮） */
  hullPolygon: GeoJSON.Feature<
    GeoJSON.Polygon,
    { score: number; affected: number }
  > | null;
  /** 受影响管段 LineString 集合（用于粗化红色线） */
  affectedPipes: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { pipeId: string; scenario: string }
  >;
  /** 受影响节点 Point 集合 */
  affectedNodes: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    { nodeId: string; kind: string }
  >;
}

/**
 * 把 BurstSimulateResult 映射为地图图层数据
 */
export function toMapLayerData(result: BurstSimulateResult): MapLayerData {
  const hull = result.impactArea.hull;
  const hullPolygon: MapLayerData['hullPolygon'] = hull.length >= 3
    ? {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [hull] },
        properties: { score: 1, affected: result.affectedUserCount },
      }
    : null;

  // 构造 node 坐标索引以便退化几何
  const nodeCoords = new Map<string, { lng: number; lat: number }>();
  for (const n of result.affectedNodes) nodeCoords.set(n.id, n);

  const affectedPipes: GeoJSON.FeatureCollection<GeoJSON.LineString, { pipeId: string; scenario: string }> = {
    type: 'FeatureCollection',
    features: result.affectedPipes
      .map((p) => ({
        type: 'Feature' as const,
        geometry: pipeToLineString(p, nodeCoords),
        properties: { pipeId: p.id, scenario: 'affected' },
      }))
      .filter((f) => f.geometry.coordinates.length >= 2),
  };

  const affectedNodes: GeoJSON.FeatureCollection<GeoJSON.Point, { nodeId: string; kind: string }> = {
    type: 'FeatureCollection',
    features: result.affectedNodes.map((n) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
      properties: { nodeId: n.id, kind: n.kind },
    })),
  };

  return { hullPolygon, affectedPipes, affectedNodes };
}

function pipeToLineString(p: PipelinePipe, nodes: Map<string, { lng: number; lat: number }>): GeoJSON.LineString {
  if (p.geometry && p.geometry.length >= 2) {
    return { type: 'LineString', coordinates: p.geometry as [number, number][] };
  }
  // 退化：从端点拉直线
  const from = nodes.get(p.fromNode);
  const to = nodes.get(p.toNode);
  if (from && to) {
    return {
      type: 'LineString',
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    };
  }
  return { type: 'LineString', coordinates: [] };
}

/** 计算受影响区域总面积（使用 shoelace 公式） */
export function impactAreaSquareMeters(hull: [number, number][]): number {
  if (hull.length < 3) return 0;
  // 把经纬度局部转米（以第一个点为原点，使用等距近似）
  const refLat = hull[0][1];
  const mPerDegLat = 110_540;
  const mPerDegLng = 111_320 * Math.cos((refLat * Math.PI) / 180);

  const pts = hull.map(([lng, lat]) => [
    (lng - hull[0][0]) * mPerDegLng,
    (lat - hull[0][1]) * mPerDegLat,
  ]);

  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** 估算受影响节点的"中心点"（用于地图 flyTo） */
export function impactCenter(nodes: PipelineNode[]): [number, number] | null {
  if (!nodes.length) return null;
  let lng = 0;
  let lat = 0;
  for (const n of nodes) {
    lng += n.lng;
    lat += n.lat;
  }
  return [lng / nodes.length, lat / nodes.length];
}

/** 从管段上取最近的节点（用于点击管线后弹出该节点信息卡） */
export function nearestNodeOnPipe(
  pipe: PipelinePipe,
  nodes: PipelineNode[],
  lng: number,
  lat: number
): PipelineNode | null {
  const a = nodes.find((n) => n.id === pipe.fromNode);
  const b = nodes.find((n) => n.id === pipe.toNode);
  if (!a || !b) return null;
  const da = haversineApprox(a.lng, a.lat, lng, lat);
  const db = haversineApprox(b.lng, b.lat, lng, lat);
  return da < db ? a : b;
}

function haversineApprox(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const dx = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
  const dy = (lat2 - lat1) * 110_540;
  return Math.sqrt(dx * dx + dy * dy);
}
