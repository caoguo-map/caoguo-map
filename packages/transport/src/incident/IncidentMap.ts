/**
 * IncidentMap 事件响应组件（地图集成层）
 *
 * 功能点：
 * - IM-1 事件标记（renderIncidents）
 * - IM-2 影响范围（renderImpact：影响半径圆 + 受影响路段高亮）
 * - IM-3 附近资源（renderNearbyResources：摄像头/救援站/医院）
 * - IM-4 绕行方案（renderDetour：绕行路径折线）
 * - IM-5 事件时间线（timeline）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { RoadNetworkDataset, Incident, RoadNode } from '../types';
import { analyzeIncident, buildIncidentTimeline } from './incidentCore';
import { detourToPolyline, circleRing } from './detour';
import { INCIDENT_TYPE_COLORS, INCIDENT_SEVERITY_COLORS } from '../style/transportTheme';

export interface IncidentMapOptions {
  map: CaoguoMap;
  dataset: RoadNetworkDataset;
  layerPrefix?: string;
}

/** 附近资源分组（渲染与 UI 共用） */
export interface NearbyResourceGroups {
  cameras: RoadNode[];
  rescue: RoadNode[];
  hospitals: RoadNode[];
}

/** 附近资源配色 */
export const RESOURCE_COLORS = {
  camera: '#38bdf8',
  rescue: '#f97316',
  hospital: '#ef4444',
} as const;

/**
 * IncidentMap 组件
 */
export class IncidentMap {
  private map: CaoguoMap;
  private dataset: RoadNetworkDataset;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: IncidentMapOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-incident';
  }

  /** 渲染事件标记 */
  renderIncidents(incidents: Incident[]): void {
    const mlMap = this.ml();
    const prefix = this.layerPrefix;

    const features = incidents.map((inc) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [inc.lng, inc.lat] },
      properties: {
        id: inc.id,
        type: inc.type,
        severity: inc.properties?.severity ?? 'medium',
      },
    }));

    upsertSource(mlMap, `${prefix}-src`, {
      type: 'FeatureCollection',
      features,
    } as never);
    this.addLayerOnce(`${prefix}-pt`, {
      id: `${prefix}-pt`,
      type: 'circle',
      source: `${prefix}-src`,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 0, 5, 1, 12],
        'circle-color': [
          'match',
          ['get', 'severity'],
          ...Object.entries(INCIDENT_SEVERITY_COLORS).flatMap(([k, v]) => [k, v]),
          '#6b7280',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  /**
   * IM-2 渲染事件影响范围：影响半径圆 + 受影响路段高亮
   * @param incident 事件
   * @param opts.highlightEdges 是否高亮受影响路段（默认 true）
   * @returns 影响分析结果
   */
  renderImpact(
    incident: Incident,
    opts: { highlightEdges?: boolean; fillColor?: string } = {}
  ) {
    const impact = analyzeIncident(this.dataset, incident);
    const mlMap = this.ml();
    const prefix = this.layerPrefix;
    const fillColor = opts.fillColor ?? '#f97316';

    // 影响半径圆
    upsertSource(mlMap, `${prefix}-impact-src`, {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [circleRing(incident.lng, incident.lat, impact.radiusMeters)],
          },
          properties: { incidentId: incident.id, radiusMeters: impact.radiusMeters },
        },
      ],
    } as never);
    this.addLayerOnce(`${prefix}-impact-fill`, {
      id: `${prefix}-impact-fill`,
      type: 'fill',
      source: `${prefix}-impact-src`,
      paint: { 'fill-color': fillColor, 'fill-opacity': 0.15 },
    });
    this.addLayerOnce(`${prefix}-impact-line`, {
      id: `${prefix}-impact-line`,
      type: 'line',
      source: `${prefix}-impact-src`,
      paint: { 'line-color': fillColor, 'line-width': 1.5, 'line-dasharray': [2, 2] },
    });

    // 受影响路段高亮
    if (opts.highlightEdges !== false && impact.affectedEdges.length > 0) {
      const idSet = new Set(impact.affectedEdges);
      const features = this.dataset.edges
        .filter((e) => idSet.has(e.id))
        .flatMap((e) => {
          const from = this.dataset.nodes.find((n) => n.id === e.fromNode);
          const to = this.dataset.nodes.find((n) => n.id === e.toNode);
          if (!from || !to) return [];
          return [
            {
              type: 'Feature' as const,
              geometry: {
                type: 'LineString' as const,
                coordinates:
                  e.geometry && e.geometry.length >= 2
                    ? (e.geometry as [number, number][])
                    : ([
                        [from.lng, from.lat],
                        [to.lng, to.lat],
                      ] as [number, number][]),
              },
              properties: { edgeId: e.id },
            },
          ];
        });
      upsertSource(mlMap, `${prefix}-affected-src`, {
        type: 'FeatureCollection',
        features,
      } as never);
      this.addLayerOnce(`${prefix}-affected-line`, {
        id: `${prefix}-affected-line`,
        type: 'line',
        source: `${prefix}-affected-src`,
        paint: { 'line-color': fillColor, 'line-width': 5, 'line-opacity': 0.7 },
      });
    }

    return impact;
  }

  /**
   * IM-3 渲染附近资源（摄像头 / 救援站 / 医院）
   * @param groups 资源分组；不传时由事件自动分析（半径取事件严重度）
   * @returns 已渲染的资源分组
   */
  renderNearbyResources(incident: Incident, groups?: NearbyResourceGroups) {
    const resolved =
      groups ?? analyzeIncident(this.dataset, incident).nearbyResources;
    const mlMap = this.ml();
    const prefix = this.layerPrefix;

    const features = [
      ...resolved.cameras.map((n) => this.resourceFeature(n, 'camera')),
      ...resolved.rescue.map((n) => this.resourceFeature(n, 'rescue')),
      ...resolved.hospitals.map((n) => this.resourceFeature(n, 'hospital')),
    ];

    upsertSource(mlMap, `${prefix}-res-src`, {
      type: 'FeatureCollection',
      features,
    } as never);
    this.addLayerOnce(`${prefix}-res-pt`, {
      id: `${prefix}-res-pt`,
      type: 'circle',
      source: `${prefix}-res-src`,
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'match',
          ['get', 'resourceType'],
          'camera', RESOURCE_COLORS.camera,
          'rescue', RESOURCE_COLORS.rescue,
          'hospital', RESOURCE_COLORS.hospital,
          '#6b7280',
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    return resolved;
  }

  /**
   * IM-4 渲染绕行路径（折线）
   * @param incident 事件（需关联 edgeId 才能算绕行）
   * @param opts.color 折线颜色（默认绿色）
   * @returns 绕行折线；无绕行方案时返回空几何
   */
  renderDetour(incident: Incident, opts: { color?: string; width?: number } = {}) {
    const impact = analyzeIncident(this.dataset, incident);
    const prefix = this.layerPrefix;
    if (!impact.detour?.found || impact.detour.path.length < 2) {
      // 无绕行方案时清空旧折线，避免残留误导
      this.clearLayer(`${prefix}-detour-line`);
      return { coordinates: [], lengthM: 0, edgeIds: [] };
    }

    const polyline = detourToPolyline(this.dataset, impact.detour.path);
    upsertSource(this.ml(), `${prefix}-detour-src`, {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: polyline.coordinates },
          properties: { incidentId: incident.id, lengthM: polyline.lengthM },
        },
      ],
    } as never);
    this.addLayerOnce(`${prefix}-detour-line`, {
      id: `${prefix}-detour-line`,
      type: 'line',
      source: `${prefix}-detour-src`,
      paint: {
        'line-color': opts.color ?? '#22c55e',
        'line-width': opts.width ?? 5,
        'line-opacity': 0.9,
      },
    });
    return polyline;
  }

  /** 分析事件并返回影响范围（供上层高亮 + 展示） */
  analyze(incident: Incident) {
    return analyzeIncident(this.dataset, incident);
  }

  /** 事件时间线 */
  timeline(incident: Incident) {
    return buildIncidentTimeline(incident);
  }

  /** 事件类型颜色（供 UI 用） */
  colorFor(type: Incident['type']): string {
    return INCIDENT_TYPE_COLORS[type] ?? '#6b7280';
  }

  /**
   * 一键渲染事件全要素（标记 + 影响范围 + 附近资源 + 绕行），
   * 便于上层「选中事件即出图」。
   */
  renderAll(incident: Incident) {
    this.renderIncidents([incident]);
    const impact = this.renderImpact(incident);
    this.renderNearbyResources(incident, impact.nearbyResources);
    const detour = this.renderDetour(incident);
    return { impact, detour };
  }

  // --------------------------------------------------
  // 内部工具
  // --------------------------------------------------

  /** 取底层 maplibre 实例 */
  private ml() {
    return (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
  }

  /** 幂等加层：图层已存在时忽略，避免重渲染抛错 */
  private addLayerOnce(id: string, layer: Record<string, unknown>): void {
    try {
      this.ml().addLayer(layer);
      this.layerIds.push(id);
    } catch {
      // 图层已存在（重渲染）：只确保 id 被记录
      if (!this.layerIds.includes(id)) this.layerIds.push(id);
    }
  }

  /** 移除单个图层（不存在时静默） */
  private clearLayer(id: string): void {
    try {
      this.map.removeLayer(id);
    } catch {
      // ignore
    }
    this.layerIds = this.layerIds.filter((x) => x !== id);
  }

  /** 构造资源要素 */
  private resourceFeature(n: RoadNode, type: 'camera' | 'rescue' | 'hospital') {
    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
      properties: {
        nodeId: n.id,
        resourceType: type,
        name: n.properties?.name ?? n.id,
      },
    };
  }

  clear(): void {
    for (const id of this.layerIds) {
      try {
        this.map.removeLayer(id);
      } catch {
        // ignore
      }
    }
    this.layerIds = [];
  }

  destroy(): void {
    this.clear();
  }
}
