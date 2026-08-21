/**
 * CellCoverage 基站覆盖地图组件（PRD §5.1）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import type { TelecomTopologyDataset, StationColorBy } from '../types';
import { paintStationBy, paintCoverageBySignal } from '../style/paintRules';

export interface CellCoverageOptions {
  map: CaoguoMap;
  dataset: TelecomTopologyDataset;
  /** 基站着色模式 */
  colorBy?: StationColorBy;
  layerPrefix?: string;
}

/**
 * CellCoverage 组件
 */
export class CellCoverage {
  private map: CaoguoMap;
  private dataset: TelecomTopologyDataset;
  private colorBy: StationColorBy;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: CellCoverageOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? 'carrier';
    this.layerPrefix = options.layerPrefix ?? 'cg-cell';
  }

  /** 渲染基站 + 覆盖区域 */
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

    // 覆盖区域（半透明多边形，先渲染垫底）
    const coverageGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: this.dataset.coverageAreas.map((a) => ({
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [a.geom] },
        properties: { stationId: a.stationId, signalLevel: a.signalLevel },
      })),
    };

    const stationGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: this.dataset.baseStations.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: {
          stationId: s.id,
          carrier: s.carrier,
          technology: s.properties?.technology ?? '4G',
          status: s.properties?.status ?? 'online',
          name: s.name ?? '',
        },
      })),
    };

    mlMap.addSource(`${prefix}-coverage-src`, coverageGeoJSON);
    mlMap.addSource(`${prefix}-station-src`, stationGeoJSON);

    if (coverageGeoJSON.features.length > 0) {
      mlMap.addLayer({
        id: `${prefix}-coverage-fill`,
        type: 'fill',
        source: `${prefix}-coverage-src`,
        paint: {
          'fill-color': paintCoverageBySignal() as never,
          'fill-opacity': 0.25,
        },
      });
      this.layerIds.push(`${prefix}-coverage-fill`);
    }

    mlMap.addLayer({
      id: `${prefix}-station-pt`,
      type: 'circle',
      source: `${prefix}-station-src`,
      paint: {
        'circle-radius': 6,
        'circle-color': paintStationBy(this.colorBy) as never,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    this.layerIds.push(`${prefix}-station-pt`);
  }

  /** 切换基站着色模式 */
  setColorBy(mode: StationColorBy): void {
    this.colorBy = mode;
    const mlMap = (this.map as unknown as {
      instance: { setPaintProperty: (id: string, prop: string, value: unknown) => void };
    }).instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-station-pt`,
          'circle-color',
          paintStationBy(mode) as never
        );
      } catch {
        // ignore
      }
    }
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
