/**
 * FiberRoute 组件 - 光缆路由可视化
 *
 * PRD phase-3-transport-compute-telecom §4.1（C-3）：
 * - 节点间连线（光缆/微波/卫星）
 * - 按带宽分级线宽、按利用率/类型着色
 * - 点击链路触发选中事件（与 C-2 详情面板联动）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { ComputeTopologyDataset, LinkColorBy, FiberLink } from '../types';
import { paintLinkBy, paintLinkWidthByBandwidth } from '../style/paintRules';

export interface FiberRouteOptions {
  map: CaoguoMap;
  dataset: ComputeTopologyDataset;
  /** 链路着色模式 */
  colorBy?: LinkColorBy;
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 链路点击回调 */
  onLinkSelect?: (link: FiberLink) => void;
}

/**
 * FiberRoute 组件
 *
 * 用法：
 *   const route = new FiberRoute({ map, dataset, colorBy: 'utilization' });
 *   route.render();
 */
export class FiberRoute {
  private map: CaoguoMap;
  private dataset: ComputeTopologyDataset;
  private colorBy: LinkColorBy;
  private layerPrefix: string;
  private layerIds: string[] = [];
  private onLinkSelect?: (link: FiberLink) => void;

  constructor(options: FiberRouteOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? 'utilization';
    this.layerPrefix = options.layerPrefix ?? 'cg-fiber';
    this.onLinkSelect = options.onLinkSelect;
  }

  private getMlMap(): {
    instance: {
      addSource: (id: string, source: unknown) => void;
      getSource: (id: string) => unknown;
      setData: (id: string, data: unknown) => void;
      addLayer: (layer: unknown) => void;
      on?: (
        type: string,
        layerId: string,
        handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
      ) => void;
    };
  }['instance'] {
    return (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        setData: (id: string, data: unknown) => void;
        addLayer: (layer: unknown) => void;
        on?: (
          type: string,
          layerId: string,
          handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
        ) => void;
      };
    }).instance;
  }

  /** 渲染光缆链路为线层 */
  render(): void {
    this.clear();
    const mlMap = this.getMlMap();
    const prefix = this.layerPrefix;

    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));
    const linkById = new Map(this.dataset.links.map((l) => [l.id, l] as const));

    const features = this.dataset.links
      .map((link) => {
        let coords: [number, number][];
        if (link.geometry && link.geometry.length >= 2) {
          coords = link.geometry;
        } else {
          const from = nodeById.get(link.fromNode);
          const to = nodeById.get(link.toNode);
          if (!from || !to) return null;
          coords = [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ];
        }
        const p = link.properties ?? {};
        return {
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: coords },
          properties: {
            linkId: link.id,
            type: p.type ?? 'fiber',
            utilization: p.utilization ?? 0,
            bandwidthGbps: p.bandwidthGbps ?? 10,
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => !!f);

    upsertSource(mlMap, `${prefix}-src`, {
      type: 'FeatureCollection',
      features,
    });
    mlMap.addLayer({
      id: `${prefix}-line`,
      type: 'line',
      source: `${prefix}-src`,
      paint: {
        'line-color': paintLinkBy(this.colorBy) as never,
        'line-width': paintLinkWidthByBandwidth() as never,
        'line-opacity': 0.9,
      },
    });
    this.layerIds.push(`${prefix}-line`);

    if (this.onLinkSelect && mlMap.on) {
      mlMap.on('click', `${prefix}-line`, (ev) => {
        const linkId = ev.features?.[0]?.properties?.linkId as string | undefined;
        if (linkId) {
          const link = linkById.get(linkId);
          if (link) this.onLinkSelect?.(link);
        }
      });
    }
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
}
