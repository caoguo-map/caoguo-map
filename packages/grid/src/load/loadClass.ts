/**
 * LoadHeatmap 组件类（地图集成层）
 *
 * 包装 loadCore 纯函数 + 维护 MapLibre 图层状态。
 * 按负荷率对台区/线路着色，支持过载高亮。
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { removeSourceSafe, upsertSource } from '@caoguo/maplibre';
import { loadRateColor, overloadedDevices } from './loadCore';
import type { GridTopologyDataset } from '../types';

export interface LoadHeatmapOptions {
  map: CaoguoMap;
  dataset: GridTopologyDataset;
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 过载高亮样式 */
  overloadPaint?: Record<string, unknown>;
}

/**
 * LoadHeatmap 组件
 *
 * 用法：
 *   const heatmap = new LoadHeatmap({ map, dataset });
 *   heatmap.render();
 *   heatmap.highlightOverload(); // 高亮过载设备
 */
export class LoadHeatmap {
  private map: CaoguoMap;
  private dataset: GridTopologyDataset;
  private layerPrefix: string;
  private overloadPaint: Record<string, unknown>;
  private layerIds: string[] = [];

  constructor(options: LoadHeatmapOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-load';
    this.overloadPaint = options.overloadPaint ?? {
      'circle-radius': 9,
      'circle-color': '#ef4444',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    };
  }

  /** 渲染负荷热力（设备按负荷率着色） */
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

    const devicesWithLoad = this.dataset.devices.filter(
      (d) => d.properties?.loadRate !== undefined
    );

    const geoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: devicesWithLoad.map((d) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [d.lng, d.lat] },
        properties: {
          deviceId: d.id,
          kind: d.kind,
          loadRate: d.properties?.loadRate ?? 0,
          color: loadRateColor(d.properties?.loadRate ?? 0),
        },
      })),
    };

    upsertSource(mlMap, `${prefix}-src`, geoJSON);
    mlMap.addLayer({
      id: `${prefix}-circle`,
      type: 'circle',
      source: `${prefix}-src`,
      paint: {
        'circle-radius': 7,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });
    this.layerIds.push(`${prefix}-circle`);
  }

  /** 高亮过载设备（负荷率 ≥ 80%） */
  highlightOverload(): GridDeviceList {
    const overloaded = overloadedDevices(this.dataset);
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;

    if (overloaded.length > 0) {
      const geoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: overloaded.map((d) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [d.lng, d.lat] },
          properties: { deviceId: d.id, loadRate: d.properties?.loadRate ?? 0 },
        })),
      };
      upsertSource(mlMap, `${prefix}-overload-src`, geoJSON);
      mlMap.addLayer({
        id: `${prefix}-overload`,
        type: 'circle',
        source: `${prefix}-overload-src`,
        paint: this.overloadPaint,
      });
      this.layerIds.push(`${prefix}-overload`);
    }
    return overloaded;
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
    const mlMap = (this.map as unknown as {
      instance: { getSource: (id: string) => unknown; removeSource: (id: string) => void };
    }).instance;
    for (const sid of [`${this.layerPrefix}-src`, `${this.layerPrefix}-overload-src`]) {
      removeSourceSafe(mlMap, sid);
    }
  }

  destroy(): void {
    this.clear();
  }
}

type GridDeviceList = ReturnType<typeof overloadedDevices>;
