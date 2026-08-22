/**
 * CellCoverage 基站覆盖地图组件（PRD §5.1）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { TelecomTopologyDataset, StationColorBy } from '../types';
import { paintStationBy, paintCoverageBySignal } from '../style/paintRules';
import type { NetworkHealth } from '../health/NetworkHealth';

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
  private faultAnimId = 0;

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

    // 幂等：层级/着色切换重渲染时 source 可能已存在，先判断避免抛 "already exists"
    upsertSource(mlMap, `${prefix}-coverage-src`, coverageGeoJSON);
    upsertSource(mlMap, `${prefix}-station-src`, stationGeoJSON);

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

  /**
   * NH-2 告警分布地图：渲染故障基站为红色闪烁标记。
   * 用 requestAnimationFrame 循环切换 circle-opacity 模拟告警闪烁。
   */
  renderFaultAlerts(health: NetworkHealth): void {
    this.clearFaultAlerts();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        addLayer: (layer: unknown) => void;
        setPaintProperty?: (id: string, prop: string, value: unknown) => void;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const alerts = health.faultAlerts();
    if (alerts.length === 0) return;

    const geoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: alerts.map((a) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [a.station.lng, a.station.lat] },
        properties: { stationId: a.station.id, reason: a.reason },
      })),
    };

    upsertSource(mlMap, `${prefix}-fault-src`, geoJSON);
    mlMap.addLayer({
      id: `${prefix}-fault-pt`,
      type: 'circle',
      source: `${prefix}-fault-src`,
      paint: {
        'circle-radius': 9,
        'circle-color': '#ef4444',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fca5a5',
        'circle-opacity': 1,
      },
    });
    this.layerIds.push(`${prefix}-fault-pt`);

    // 闪烁动画：在 0.25~1.0 之间脉动 opacity
    let t = 0;
    const tick = () => {
      t += 0.08;
      const opacity = 0.25 + (Math.sin(t) * 0.5 + 0.5) * 0.75;
      if (mlMap.setPaintProperty) {
        try {
          mlMap.setPaintProperty(`${prefix}-fault-pt`, 'circle-opacity', opacity);
        } catch {
          // 层被移除后停止
          return;
        }
      }
      this.faultAnimId = requestAnimationFrame(tick);
    };
    this.faultAnimId = requestAnimationFrame(tick);
  }

  private clearFaultAlerts(): void {
    if (this.faultAnimId) {
      cancelAnimationFrame(this.faultAnimId);
      this.faultAnimId = 0;
    }
    this.layerIds = this.layerIds.filter((id) => {
      if (id.endsWith('-fault-pt')) {
        this.map.removeLayer(id);
        return false;
      }
      return true;
    });
  }

  clear(): void {
    this.clearFaultAlerts();
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  destroy(): void {
    this.clear();
  }
}
