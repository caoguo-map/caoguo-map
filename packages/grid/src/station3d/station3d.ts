/**
 * Station3D 组件（PRD G-6，Phase 2 简版）
 *
 * 将变电站设备渲染为 3D 体块（fill-extrusion），叠加到地形（可选 enableTerrain）。
 * 渲染薄壳：核心几何/高度计算在 station3dCore（纯函数）。
 *
 * 用法：
 *   const s3d = new Station3D({ map, dataset });
 *   s3d.render(); // 已自动启用地形
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { GridTopologyDataset } from '../types';
import { stationFootprint, stationHeightMeters } from './station3dCore';

export interface Station3DOptions {
  map: CaoguoMap;
  dataset: GridTopologyDataset;
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 渲染时是否自动启用地形（默认 true） */
  enableTerrainOnRender?: boolean;
}

export class Station3D {
  private map: CaoguoMap;
  private dataset: GridTopologyDataset;
  private layerPrefix: string;
  private enableTerrainOnRender: boolean;
  private layerId = '';
  private sourceId = '';

  constructor(options: Station3DOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-station3d';
    this.enableTerrainOnRender = options.enableTerrainOnRender ?? true;
  }

  /** 渲染变电站 3D 体块 */
  render(): void {
    this.clear();
    const stations = (this.dataset.devices ?? []).filter((d) => d.kind === 'substation');

    const geoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: stations.map((d) => ({
        type: 'Feature' as const,
        geometry: stationFootprint(d),
        properties: {
          deviceId: d.id,
          name: d.name ?? d.id,
          height: stationHeightMeters(d),
          voltage: d.properties?.voltage ?? '',
        },
      })),
    };

    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;

    if (this.enableTerrainOnRender) {
      this.map.enableTerrain?.();
    }

    this.sourceId = `${this.layerPrefix}-src`;
    upsertSource(mlMap, this.sourceId, geoJSON);
    this.layerId = `${this.layerPrefix}-extrusion`;
    mlMap.addLayer({
      id: this.layerId,
      type: 'fill-extrusion',
      source: this.sourceId,
      paint: {
        'fill-extrusion-color': [
          'match',
          ['get', 'voltage'],
          '500', '#ef4444',
          '220', '#f59e0b',
          '110', '#3b82f6',
          '#64748b',
        ],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.85,
      },
    });
  }

  clear(): void {
    if (this.layerId) this.map.removeLayer(this.layerId);
    this.layerId = '';
    this.sourceId = '';
  }

  destroy(): void {
    this.clear();
  }
}
