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
import type { RoadNetworkDataset, RoadColorBy, RoadNodeKind } from '../types';
import { paintRoadBy, paintRoadWidthByClass } from '../style/paintRules';

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
              speed: 60,
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

    mlMap.addSource(`${prefix}-edges-src`, edgeGeoJSON);
    mlMap.addSource(`${prefix}-facility-src`, facilityGeoJSON);

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
          'circle-color': '#f59e0b',
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
              speed: speedMap.get(e.id) ?? 60,
            },
          },
        ];
      }),
    };
    if (src.setData) src.setData(edgeGeoJSON);
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
