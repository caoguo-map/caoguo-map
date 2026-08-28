/**
 * RoadNetwork 组件类（地图集成层）
 *
 * 包装路网数据渲染 + 维护 MapLibre 图层状态。
 * 职责：
 *  - 路段按道路等级/速度/状态着色
 *  - 设施标注（收费站/服务区/枢纽/停车场）
 *  - 切换着色模式
 *
 * 注意：不依赖 Vue/React，可在任意框架实例化。
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { RoadNetworkDataset, RoadColorBy, RoadNodeKind } from '../types';
import { paintRoadBy, paintRoadWidthByClass } from '../style/paintRules';
import { FACILITY_COLORS } from '../style/transportTheme';
import { detourToPolyline, circleRing } from '../incident/detour';
import {
  buildRoadAdjacency,
  dijkstra,
  aStar,
  nodesWithinRadius,
  haversineHeuristic,
} from '../graph';

export interface RoadNetworkOptions {
  map: CaoguoMap;
  dataset: RoadNetworkDataset;
  /** 默认着色模式 */
  colorBy?: RoadColorBy;
  /** 设施节点类型（默认标注收费站/服务区/停车场） */
  facilityKinds?: RoadNodeKind[];
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

/**
 * RoadNetwork 组件
 *
 * 用法：
 *   const road = new RoadNetwork({ map, dataset, colorBy: 'roadClass' });
 *   road.render();
 *   road.setColorBy('speed');
 *   road.destroy();
 */
export class RoadNetwork {
  private map: CaoguoMap;
  private dataset: RoadNetworkDataset;
  private colorBy: RoadColorBy;
  private facilityKinds: RoadNodeKind[];
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: RoadNetworkOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? 'roadClass';
    this.facilityKinds = options.facilityKinds ?? ['toll', 'rest_area', 'service_area', 'parking'];
    this.layerPrefix = options.layerPrefix ?? 'cg-road';
  }

  /** 渲染路段 + 设施节点 */
  render(): void {
    this.clear();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const baseSpeeds = new Map((this.dataset.speeds ?? []).map((s) => [s.edgeId, s.speed] as const));
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));

    const edgeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: this.dataset.edges.flatMap((e) => {
        const from = nodeById.get(e.fromNode);
        const to = nodeById.get(e.toNode);
        if (!from || !to) return [];
        const coords: [number, number][] =
          e.geometry && e.geometry.length >= 2
            ? (e.geometry as [number, number][])
            : [
                [from.lng, from.lat],
                [to.lng, to.lat],
              ];
        return [
          {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: coords },
            properties: {
              edgeId: e.id,
              roadClass: e.roadClass,
              status: e.properties?.status ?? 'open',
              speed: baseSpeeds.get(e.id) ?? 60,
            },
          },
        ];
      }),
    };

    const facilityGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: this.dataset.nodes
        .filter((n) => this.facilityKinds.includes(n.kind))
        .map((n) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
          properties: {
            nodeId: n.id,
            kind: n.kind,
            name: n.properties?.name ?? '',
          },
        })),
    };

    // 幂等：层级/着色切换重渲染时 source 可能已存在，先判断避免抛 "already exists"
    upsertSource(mlMap, `${prefix}-edges-src`, edgeGeoJSON);
    upsertSource(mlMap, `${prefix}-facility-src`, facilityGeoJSON);

    mlMap.addLayer({
      id: `${prefix}-edges-line`,
      type: 'line',
      source: `${prefix}-edges-src`,
      paint: {
        'line-color': paintRoadBy(this.colorBy) as never,
        'line-width': paintRoadWidthByClass() as never,
        'line-opacity': 0.9,
      },
    });
    this.layerIds.push(`${prefix}-edges-line`);

    if (facilityGeoJSON.features.length > 0) {
      mlMap.addLayer({
        id: `${prefix}-facility-pt`,
        type: 'circle',
        source: `${prefix}-facility-src`,
        paint: {
          'circle-radius': 5,
          // T-3 设施标注：按节点类型配色（收费站/服务区/停车场…）
          'circle-color': [
            'match',
            ['get', 'kind'],
            ...Object.entries(FACILITY_COLORS).flatMap(([k, v]) => [k, v]),
            '#f59e0b',
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      this.layerIds.push(`${prefix}-facility-pt`);
    }
  }

  /** 更新实时速度数据并切换为路况模式 */
  setSpeeds(speeds: Array<{ edgeId: string; speed: number }>): void {
    const speedMap = new Map(speeds.map((s) => [s.edgeId, s.speed] as const));
    const baseSpeeds = new Map((this.dataset.speeds ?? []).map((s) => [s.edgeId, s.speed] as const));
    const mlMap = (this.map as unknown as {
      instance: {
        getSource: (id: string) => unknown;
        setData?: (id: string, data: unknown) => void;
      };
    }).instance;
    const src = mlMap.getSource(`${this.layerPrefix}-edges-src`) as
      | { setData?: (d: unknown) => void }
      | undefined;
    if (!src) return;
    // 重建 features（带速度字段）
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));
    const edgeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: this.dataset.edges.flatMap((e) => {
        const from = nodeById.get(e.fromNode);
        const to = nodeById.get(e.toNode);
        if (!from || !to) return [];
        const coords: [number, number][] =
          e.geometry && e.geometry.length >= 2
            ? (e.geometry as [number, number][])
            : [
                [from.lng, from.lat],
                [to.lng, to.lat],
              ];
        return [
          {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: coords },
            properties: {
              edgeId: e.id,
              roadClass: e.roadClass,
              status: e.properties?.status ?? 'open',
              speed: speedMap.get(e.id) ?? baseSpeeds.get(e.id) ?? 60,
            },
          },
        ];
      }),
    };
    if (src.setData) src.setData(edgeGeoJSON);
  }

  // ============================================================
  // 图算法接入（PRD T-4 路径规划 / T-5 缓冲查询）
  // ============================================================

  /**
   * T-4 路径规划：Dijkstra 最短路（按路段长度）
   * @returns 找不到路径时 `found: false`
   */
  planRoute(fromNodeId: string, toNodeId: string) {
    const adj = buildRoadAdjacency(this.dataset);
    return dijkstra(adj, fromNodeId, toNodeId);
  }

  /**
   * T-4 路径规划：A* 最短路（启发式用 haversine，比 Dijkstra 更快）
   */
  planRouteAStar(fromNodeId: string, toNodeId: string) {
    const adj = buildRoadAdjacency(this.dataset);
    const nodes = new Map(
      this.dataset.nodes.map((n) => [n.id, { lng: n.lng, lat: n.lat }] as const)
    );
    return aStar(adj, fromNodeId, toNodeId, nodes, haversineHeuristic);
  }

  /**
   * T-4 渲染路径规划结果：把节点序列画成折线（绿色高亮）
   * @param path 节点 id 序列（来自 `planRoute` / `planRouteAStar`）
   * @param opts.color / opts.width 可覆盖样式
   * @returns 折线坐标与长度；路径不足两点时返回空几何
   */
  renderRoute(
    path: string[],
    opts: { color?: string; width?: number } = {}
  ): { coordinates: [number, number][]; lengthM: number; edgeIds: string[] } {
    const prefix = this.layerPrefix;
    if (!path || path.length < 2) {
      this.removeLayerSafely(`${prefix}-route-line`);
      return { coordinates: [], lengthM: 0, edgeIds: [] };
    }
    const polyline = detourToPolyline(this.dataset, path);
    upsertSource(this.ml(), `${prefix}-route-src`, {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: polyline.coordinates },
          properties: { lengthM: polyline.lengthM },
        },
      ],
    } as never);
    this.addLayerOnce(`${prefix}-route-line`, {
      id: `${prefix}-route-line`,
      type: 'line',
      source: `${prefix}-route-src`,
      paint: {
        'line-color': opts.color ?? '#22c55e',
        'line-width': opts.width ?? 5,
        'line-opacity': 0.9,
      },
    });
    return polyline;
  }

  /** 清除路径规划折线 */
  clearRoute(): void {
    this.removeLayerSafely(`${this.layerPrefix}-route-line`);
  }

  /**
   * T-5 缓冲查询：距中心点 radius 米内的节点（按距离升序）
   */
  queryBuffer(lng: number, lat: number, radius: number) {
    return nodesWithinRadius(this.dataset.nodes, lng, lat, radius);
  }

  /**
   * T-5 渲染缓冲查询结果：范围圆 + 命中节点
   * @param opts.showNodes 是否高亮命中节点（默认 true）
   * @returns 命中节点（含距离）
   */
  renderBuffer(
    lng: number,
    lat: number,
    radius: number,
    opts: { color?: string; showNodes?: boolean } = {}
  ) {
    const hits = nodesWithinRadius(this.dataset.nodes, lng, lat, radius);
    const prefix = this.layerPrefix;
    const color = opts.color ?? '#38bdf8';

    upsertSource(this.ml(), `${prefix}-buffer-src`, {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [circleRing(lng, lat, radius)] },
          properties: { radiusMeters: radius },
        },
      ],
    } as never);
    this.addLayerOnce(`${prefix}-buffer-fill`, {
      id: `${prefix}-buffer-fill`,
      type: 'fill',
      source: `${prefix}-buffer-src`,
      paint: { 'fill-color': color, 'fill-opacity': 0.12 },
    });

    if (opts.showNodes !== false) {
      const ids = new Set(hits.map((h) => h.id));
      const features = this.dataset.nodes
        .filter((n) => ids.has(n.id))
        .map((n) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
          properties: { nodeId: n.id, kind: n.kind },
        }));
      upsertSource(this.ml(), `${prefix}-buffer-nodes-src`, {
        type: 'FeatureCollection',
        features,
      } as never);
      this.addLayerOnce(`${prefix}-buffer-nodes`, {
        id: `${prefix}-buffer-nodes`,
        type: 'circle',
        source: `${prefix}-buffer-nodes-src`,
        paint: {
          'circle-radius': 5,
          'circle-color': color,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
    return hits;
  }

  /** 清除缓冲查询结果 */
  clearBuffer(): void {
    this.removeLayerSafely(`${this.layerPrefix}-buffer-fill`);
    this.removeLayerSafely(`${this.layerPrefix}-buffer-nodes`);
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
  private removeLayerSafely(id: string): void {
    try {
      this.map.removeLayer(id);
    } catch {
      // ignore
    }
    this.layerIds = this.layerIds.filter((x) => x !== id);
  }

  /** 切换着色模式 */
  setColorBy(mode: RoadColorBy): void {
    this.colorBy = mode;
    const mlMap = (this.map as unknown as {
      instance: { setPaintProperty: (id: string, prop: string, value: unknown) => void };
    }).instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-edges-line`,
          'line-color',
          paintRoadBy(mode) as never
        );
      } catch {
        // ignore
      }
    }
  }

  /** 清空所有图层 */
  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  /** 销毁组件 */
  destroy(): void {
    this.clear();
  }
}
