/**
 * ComputeNodes 算力节点地图组件（PRD §4.1）
 *
 * 功能点：
 * - C-1 节点分布地图（按类型显示）
 * - C-2 节点详情面板（算力/存储/利用率/GPU 状态）
 * - C-3 光缆路由可视化（按带宽/利用率着色）
 * - C-4 资源调度面板（按区域/类型筛选）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import type { ComputeTopologyDataset, ComputeNodeColorBy } from '../types';
import { paintNodeBy, paintLinkBy, paintLinkWidthByBandwidth } from '../style/paintRules';

export interface ComputeNodesOptions {
  map: CaoguoMap;
  dataset: ComputeTopologyDataset;
  /** 节点着色模式 */
  nodeColorBy?: ComputeNodeColorBy;
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

/**
 * ComputeNodes 组件
 */
export class ComputeNodes {
  private map: CaoguoMap;
  private dataset: ComputeTopologyDataset;
  private nodeColorBy: ComputeNodeColorBy;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: ComputeNodesOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.nodeColorBy = options.nodeColorBy ?? 'type';
    this.layerPrefix = options.layerPrefix ?? 'cg-compute';
  }

  /** 渲染节点 + 链路 */
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

    // 链路（先渲染，垫底）
    const linkGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: this.dataset.links.flatMap((l) => {
        const from = nodeById.get(l.fromNode);
        const to = nodeById.get(l.toNode);
        if (!from || !to) return [];
        const coords: [number, number][] =
          l.geometry && l.geometry.length >= 2
            ? (l.geometry as [number, number][])
            : [
                [from.lng, from.lat],
                [to.lng, to.lat],
              ];
        return [
          {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: coords },
            properties: {
              linkId: l.id,
              type: l.properties?.type ?? 'fiber',
              utilization: l.properties?.utilization ?? 0,
              bandwidthGbps: l.properties?.bandwidthGbps ?? 10,
              latencyMs: l.properties?.latencyMs ?? 0,
            },
          },
        ];
      }),
    };

    const nodeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: this.dataset.nodes.map((n) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
        properties: {
          nodeId: n.id,
          type: n.type,
          status: n.properties?.status ?? 'online',
          gpuUtilization: n.properties?.gpuUtilization ?? 0,
          name: n.name ?? '',
        },
      })),
    };

    mlMap.addSource(`${prefix}-links-src`, linkGeoJSON);
    mlMap.addSource(`${prefix}-nodes-src`, nodeGeoJSON);

    mlMap.addLayer({
      id: `${prefix}-links-line`,
      type: 'line',
      source: `${prefix}-links-src`,
      paint: {
        'line-color': paintLinkBy('utilization') as never,
        'line-width': paintLinkWidthByBandwidth() as never,
        'line-opacity': 0.7,
      },
    });
    this.layerIds.push(`${prefix}-links-line`);

    mlMap.addLayer({
      id: `${prefix}-nodes-pt`,
      type: 'circle',
      source: `${prefix}-nodes-src`,
      paint: {
        'circle-radius': 7,
        'circle-color': paintNodeBy(this.nodeColorBy) as never,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    this.layerIds.push(`${prefix}-nodes-pt`);
  }

  /** 切换节点着色模式 */
  setNodeColorBy(mode: ComputeNodeColorBy): void {
    this.nodeColorBy = mode;
    const mlMap = (this.map as unknown as {
      instance: { setPaintProperty: (id: string, prop: string, value: unknown) => void };
    }).instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-nodes-pt`,
          'circle-color',
          paintNodeBy(mode) as never
        );
      } catch {
        // ignore
      }
    }
  }

  /** 按区域/类型筛选（C-4） */
  filter(options: { region?: string; type?: string }): ComputeTopologyDataset {
    const nodes = this.dataset.nodes.filter((n) => {
      if (options.region && n.properties?.region !== options.region) return false;
      if (options.type && n.type !== options.type) return false;
      return true;
    });
    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = this.dataset.links.filter(
      (l) => nodeIds.has(l.fromNode) && nodeIds.has(l.toNode)
    );
    return { nodes, links };
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  destroy(): void {
    this.clear();
  }
}
