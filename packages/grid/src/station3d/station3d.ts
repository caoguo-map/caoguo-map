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
import {
  stationFootprint,
  stationHeightMeters,
  allStationAccessories,
  accessoryHeightMeters,
} from './station3dCore';

export interface Station3DOptions {
  map: CaoguoMap;
  dataset: GridTopologyDataset;
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 渲染时是否自动启用地形（默认 true） */
  enableTerrainOnRender?: boolean;
  /** G-6 进阶：叠加附属设备（铁塔/配变/用户），默认 false */
  renderAccessories?: boolean;
}

export class Station3D {
  private map: CaoguoMap;
  private dataset: GridTopologyDataset;
  private layerPrefix: string;
  private enableTerrainOnRender: boolean;
  private renderAccessories: boolean;
  private layerId = '';
  private sourceId = '';
  private accessoryLayerId = '';
  private accessorySourceId = '';

  constructor(options: Station3DOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-station3d';
    this.enableTerrainOnRender = options.enableTerrainOnRender ?? true;
    this.renderAccessories = options.renderAccessories ?? false;
  }

  /** 渲染变电站 3D 体块（含可选附属设备叠加层） */
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

    // 附属设备叠加层（G-6 进阶）
    if (this.renderAccessories) {
      const accessories = allStationAccessories(this.dataset);
      const accessoryFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
      for (const acc of accessories) {
        for (const dev of acc.devices) {
          // 复用 footprint 公式（附属设备占地更小），按 accessoryHalfSize 计算
          const half = 6; // 附属设备半径 6m
          const dlng = half / (111320 * Math.cos((dev.lat * Math.PI) / 180));
          const dlat = half / 110540;
          accessoryFeatures.push({
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                [
                  [dev.lng - dlng, dev.lat - dlat],
                  [dev.lng + dlng, dev.lat - dlat],
                  [dev.lng + dlng, dev.lat + dlat],
                  [dev.lng - dlng, dev.lat + dlat],
                  [dev.lng - dlng, dev.lat - dlat],
                ],
              ],
            },
            properties: {
              deviceId: dev.id,
              stationId: acc.stationId,
              kind: dev.kind,
              height: accessoryHeightMeters(dev),
            },
          });
        }
      }
      if (accessoryFeatures.length > 0) {
        this.accessorySourceId = `${this.layerPrefix}-acc-src`;
        this.accessoryLayerId = `${this.layerPrefix}-acc-extrusion`;
        upsertSource(mlMap, this.accessorySourceId, {
          type: 'FeatureCollection',
          features: accessoryFeatures,
        });
        mlMap.addLayer({
          id: this.accessoryLayerId,
          type: 'fill-extrusion',
          source: this.accessorySourceId,
          paint: {
            'fill-extrusion-color': [
              'match',
              ['get', 'kind'],
              'tower', '#fbbf24',
              'transformer', '#34d399',
              'user', '#a78bfa',
              '#94a3b8',
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.9,
          },
        });
      }
    }
  }

  clear(): void {
    if (this.layerId) this.map.removeLayer(this.layerId);
    if (this.accessoryLayerId) this.map.removeLayer(this.accessoryLayerId);
    this.layerId = '';
    this.sourceId = '';
    this.accessoryLayerId = '';
    this.accessorySourceId = '';
  }

  destroy(): void {
    this.clear();
  }
}
