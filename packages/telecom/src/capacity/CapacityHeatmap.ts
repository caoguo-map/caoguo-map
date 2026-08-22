/**
 * CapacityHeatmap 组件（PRD CH 系列）
 *
 * 将基站容量利用率/用户负载渲染为热力图。渲染薄壳：核心计算见 capacityCore。
 *
 * 用法：
 *   const ch = new CapacityHeatmap({ map, dataset });
 *   ch.render('utilization');
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { TelecomTopologyDataset } from '../types';
import { capacityUtilizationPoints, type CapacityWeight } from './capacityCore';

export interface CapacityHeatmapOptions {
  map: CaoguoMap;
  dataset: TelecomTopologyDataset;
  layerPrefix?: string;
}

export class CapacityHeatmap {
  private map: CaoguoMap;
  private dataset: TelecomTopologyDataset;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: CapacityHeatmapOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-capacity';
  }

  /** 渲染容量热力图（kind=utilization 容量利用率 / userLoad 用户负载） */
  render(kind: CapacityWeight = 'utilization'): void {
    this.clear();
    const data = capacityUtilizationPoints(this.dataset.baseStations, kind);
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;

    const sourceId = `${this.layerPrefix}-src`;
    upsertSource(mlMap, sourceId, data);

    const layerId = `${this.layerPrefix}-heat`;
    try {
      mlMap.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          'heatmap-weight': ['get', 'weight'] as unknown,
          'heatmap-intensity': 1,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(59,130,246,0)',
            0.2, 'rgba(59,130,246,0.5)',
            0.5, 'rgba(250,204,21,0.7)',
            0.8, 'rgba(239,68,68,0.85)',
            1, 'rgba(185,28,28,0.95)',
          ] as unknown,
          'heatmap-radius': 30,
          'heatmap-opacity': 0.75,
        },
      });
      this.layerIds.push(layerId);
    } catch {
      // 图层已存在等，忽略
    }
  }

  /** 清空图层 */
  clear(): void {
    for (const id of this.layerIds) this.map.removeLayer(id);
    this.layerIds = [];
  }

  destroy(): void {
    this.clear();
  }
}
