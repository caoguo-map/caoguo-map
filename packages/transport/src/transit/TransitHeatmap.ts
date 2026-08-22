/**
 * `<TransitHeatmap>` 公共交通客流 OD 可视化（PRD §2.4）
 *
 * 在 MapLibre 上渲染：
 *  - 站点热力点：半径/颜色按站点吞吐（board+alight）归一化
 *  - OD 连线：线宽按 OD 流量归一化，颜色按客流强度
 *
 * 复用 maplibre 的 `upsertSource` 保证重复渲染幂等（避免 Source already exists）。
 * 纯渲染薄壳：数据由 `aggregateOd` 等纯函数准备。
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { OdRecord, TransitStation } from './types';
import { aggregateOd, type OdAggregation } from './od';

export interface TransitHeatmapOptions {
  map: CaoguoMap;
  stations: TransitStation[];
  /** layer 前缀，避免多实例冲突 */
  layerPrefix?: string;
}

export class TransitHeatmap {
  private map: CaoguoMap;
  private stations: TransitStation[];
  private layerPrefix: string;
  private stationLayerIds: string[] = [];
  private odLayerIds: string[] = [];

  constructor(options: TransitHeatmapOptions) {
    this.map = options.map;
    this.stations = options.stations;
    this.layerPrefix = options.layerPrefix ?? 'cg-transit';
  }

  /** 渲染全量 OD 热力：站点点 + OD 连线 */
  render(records: OdRecord[]): OdAggregation {
    const agg = aggregateOd(records);
    this.renderStations(agg);
    this.renderOdLines(records, agg);
    return agg;
  }

  /** 仅渲染站点热力点（按吞吐） */
  renderStations(agg: OdAggregation): void {
    this.clearStations();
    const mlMap = this.rawMap();
    const byId = new Map(this.stations.map((s) => [s.id, s] as const));
    const maxT = agg.maxThroughput || 1;

    const features = this.stations
      .map((s) => {
        const t = agg.throughput[s.id];
        const total = t ? t.board + t.alight : 0;
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [s.lng, s.lat] as [number, number],
          },
          properties: {
            stationId: s.id,
            name: s.name,
            throughput: total,
            norm: total / maxT,
          },
        };
      })
      .filter((f) => f.properties.throughput > 0);

    upsertSource(mlMap, `${this.layerPrefix}-station-src`, {
      type: 'FeatureCollection',
      features,
    });
    mlMap.addLayer?.({
      id: `${this.layerPrefix}-station-heat`,
      type: 'circle',
      source: `${this.layerPrefix}-station-src`,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'norm'],
          0,
          4,
          1,
          26,
        ] as never,
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'norm'],
          0,
          '#22d3ee',
          0.5,
          '#fbbf24',
          1,
          '#ef4444',
        ] as never,
        'circle-opacity': 0.65,
        'circle-blur': 0.4,
      },
    });
    this.stationLayerIds.push(`${this.layerPrefix}-station-heat`);
  }

  /** 渲染 OD 连线（线宽按流量归一化） */
  renderOdLines(records: OdRecord[], agg: OdAggregation): void {
    this.clearOdLines();
    const mlMap = this.rawMap();
    const byId = new Map(this.stations.map((s) => [s.id, s] as const));
    const maxOd = agg.maxOd || 1;

    const features = records
      .map((r) => {
        const from = byId.get(r.origin);
        const to = byId.get(r.dest);
        if (!from || !to) return null;
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ] as [number, number][],
          },
          properties: { origin: r.origin, dest: r.dest, volume: r.volume, norm: r.volume / maxOd },
        };
      })
      .filter((f): f is NonNullable<typeof f> => !!f);

    upsertSource(mlMap, `${this.layerPrefix}-od-src`, {
      type: 'FeatureCollection',
      features,
    });
    mlMap.addLayer?.({
      id: `${this.layerPrefix}-od-line`,
      type: 'line',
      source: `${this.layerPrefix}-od-src`,
      paint: {
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'norm'],
          0,
          '#4ade80',
          0.5,
          '#fbbf24',
          1,
          '#ef4444',
        ] as never,
        'line-width': [
          'interpolate',
          ['linear'],
          ['get', 'norm'],
          0,
          0.5,
          1,
          6,
        ] as never,
        'line-opacity': 0.55,
      },
    });
    this.odLayerIds.push(`${this.layerPrefix}-od-line`);
  }

  /** 用预测后的 OD 权重重绘连线（客流预测结果可视化） */
  renderPredicted(records: OdRecord[], predicted: Record<string, number>): void {
    const agg = aggregateOd(records);
    this.renderStations(agg);
    const mlMap = this.rawMap();
    const byId = new Map(this.stations.map((s) => [s.id, s] as const));
    const maxOd = Math.max(1, ...Object.values(predicted));

    const features = records
      .map((r) => {
        const from = byId.get(r.origin);
        const to = byId.get(r.dest);
        if (!from || !to) return null;
        const vol = predicted[`${r.origin}->${r.dest}`] ?? r.volume;
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ] as [number, number][],
          },
          properties: { origin: r.origin, dest: r.dest, volume: vol, norm: vol / maxOd },
        };
      })
      .filter((f): f is NonNullable<typeof f> => !!f);

    upsertSource(mlMap, `${this.layerPrefix}-od-src`, {
      type: 'FeatureCollection',
      features,
    });
    mlMap.addLayer?.({
      id: `${this.layerPrefix}-od-line`,
      type: 'line',
      source: `${this.layerPrefix}-od-src`,
      paint: {
        'line-color': '#a855f7',
        'line-width': [
          'interpolate',
          ['linear'],
          ['get', 'norm'],
          0,
          0.5,
          1,
          6,
        ] as never,
        'line-opacity': 0.6,
      },
    });
    this.odLayerIds.push(`${this.layerPrefix}-od-line`);
  }

  destroy(): void {
    this.clearStations();
    this.clearOdLines();
  }

  private clearStations(): void {
    for (const id of this.stationLayerIds) this.map.removeLayer(id);
    this.stationLayerIds = [];
  }

  private clearOdLines(): void {
    for (const id of this.odLayerIds) this.map.removeLayer(id);
    this.odLayerIds = [];
  }

  private rawMap(): {
    addSource: (id: string, source: unknown) => void;
    getSource: (id: string) => unknown;
    addLayer?: (layer: unknown) => void;
  } {
    return (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        addLayer?: (layer: unknown) => void;
      };
    }).instance;
  }
}
