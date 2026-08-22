/**
 * FloodRender 组件 - 淹没动态渲染
 *
 * PRD phase-2-grid-water §4.2（F-2 淹没动态渲染 / F-3 水深分级着色）：
 * - 接收 simulateFlood 的 FloodResult，将淹没范围画为多边形面层
 * - 按最大水深分级着色（depthColor）
 * - 支持动态水位：多次调用 render 即可更新淹没范围（模拟水位上涨）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { FloodResult } from '../types';
import { depthColor } from './floodCore';

export interface FloodRenderOptions {
  map: CaoguoMap;
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

/**
 * FloodRender 组件
 *
 * 用法：
 *   const flood = new FloodRender({ map });
 *   const result = simulateFlood(dataset, dem, input);
 *   flood.render(result);
 */
export class FloodRender {
  private map: CaoguoMap;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: FloodRenderOptions) {
    this.map = options.map;
    this.layerPrefix = options.layerPrefix ?? 'cg-flood';
  }

  private getMlMap(): {
    instance: {
      addSource: (id: string, source: unknown) => void;
      getSource: (id: string) => unknown;
      setData: (id: string, data: unknown) => void;
      addLayer: (layer: unknown) => void;
    };
  }['instance'] {
    return (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        setData: (id: string, data: unknown) => void;
        addLayer: (layer: unknown) => void;
      };
    }).instance;
  }

  /** 渲染一次淹没结果（水位上涨时重复调用可更新范围） */
  render(result: FloodResult): void {
    this.clear();
    const mlMap = this.getMlMap();
    const prefix = this.layerPrefix;

    const ring = result.inundationPolygon.map(([x, y]) => [x, y] as [number, number]);
    // 闭合多边形
    if (ring.length > 0) ring.push(ring[0]);

    const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { maxDepth: result.maxDepth, inundatedArea: result.inundatedArea },
    };

    upsertSource(mlMap, `${prefix}-src`, {
      type: 'FeatureCollection',
      features: [feature],
    });
    mlMap.addLayer({
      id: `${prefix}-fill`,
      type: 'fill',
      source: `${prefix}-src`,
      paint: {
        'fill-color': depthColor(result.maxDepth),
        'fill-opacity': 0.45,
      },
    });
    this.layerIds.push(`${prefix}-fill`);
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
}
