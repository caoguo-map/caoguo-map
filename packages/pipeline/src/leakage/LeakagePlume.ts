/**
 * LeakagePlume 组件类（占位 stub）
 *
 * Phase 1 MVP 完整功能待 M6 W1-W2 完成。
 * 当前 stub 仅暴露 API 接口和最小实现。
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { GasLeakParams, GasLeakResult } from './gaussianPlume';
import { gaussianPlume } from './gaussianPlume';
import type { FloodParams, FloodResult } from './floodFill';
import { simulateFlood } from './floodFill';
import type { DemGrid } from './floodFill';

export type { GasLeakParams, GasLeakResult, FloodParams, FloodResult, DemGrid };

export interface LeakagePlumeOptions {
  map: CaoguoMap;
  /** 浓度阈值（kg/m³），可分级 */
  thresholds?: number[];
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 区域填充色 */
  fillColor?: string;
}

type Listener = (r: GasLeakResult | FloodResult) => void;

/**
 * LeakagePlume 组件（燃气泄漏 / 供水爆管）
 *
 * 用法：
 *   const plume = new LeakagePlume({ map });
 *   plume.simulateGas({ lng, lat }, { windDirection: 1.5, windSpeed: 3, ... });
 *   plume.simulateFlood(demGrid, { sourceLng, sourceLat });
 */
export class LeakagePlume {
  private map: CaoguoMap;
  private thresholds: number[];
  private layerPrefix: string;
  private fillColor: string;
  private layerIds: string[] = [];
  private listeners = new Set<Listener>();
  private lastResult: GasLeakResult | FloodResult | null = null;

  constructor(options: LeakagePlumeOptions) {
    this.map = options.map;
    this.thresholds = options.thresholds ?? [0.001, 0.005, 0.01];
    this.layerPrefix = options.layerPrefix ?? 'cg-leakage';
    this.fillColor = options.fillColor ?? '#fb923c';
  }

  /** 燃气泄漏扩散模拟 */
  simulateGas(
    source: { lng: number; lat: number },
    params: Omit<GasLeakParams, 'thresholds'>
  ): GasLeakResult {
    const result = gaussianPlume(source, { ...params, thresholds: this.thresholds });
    this.lastResult = result;
    this.renderGas(result);
    for (const l of this.listeners) l(result);
    return result;
  }

  /** 供水爆管淹没模拟 */
  simulateFlood(dem: DemGrid, params: FloodParams): FloodResult {
    const result = simulateFlood(dem, params);
    this.lastResult = result;
    this.renderFlood(result);
    for (const l of this.listeners) l(result);
    return result;
  }

  /** 清空图层 */
  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  /** 销毁组件 */
  destroy(): void {
    this.clear();
    this.listeners.clear();
    this.lastResult = null;
  }

  /** 订阅结果 */
  onResult(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** 取最后一次结果 */
  getLastResult(): GasLeakResult | FloodResult | null {
    return this.lastResult;
  }

  // --------------------------------------------------
  // 内部渲染（GeoJSON 多边形叠加）
  // --------------------------------------------------
  private renderGas(result: GasLeakResult): void {
    this.renderContours(
      result.contours.map((c) => ({
        polygon: c.polygon,
        threshold: c.threshold,
      })),
      result.source
    );
  }

  private renderFlood(result: FloodResult): void {
    if (result.hull.length < 3) return;
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;

    const data: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [result.hull] },
      properties: { threshold: 0 },
    };

    const id = `${this.layerPrefix}-flood-fill`;
    upsertSource(mlMap, id, data);
    try {
      mlMap.addLayer({
        id,
        type: 'fill',
        source: id,
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3,
          'fill-outline-color': '#1e40af',
        },
      });
      this.layerIds.push(id);
    } catch {
      // ignore
    }
  }

  private renderContours(
    contours: Array<{ polygon: [number, number][]; threshold: number }>,
    source: { lng: number; lat: number }
  ): void {
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;

    const data: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: contours
        .filter((c) => c.polygon.length >= 3)
        .map((c) => ({
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [c.polygon] },
          properties: { threshold: c.threshold },
        })),
    };

    const sourceId = `${this.layerPrefix}-gas-src`;
    const layerId = `${this.layerPrefix}-gas-fill`;
    upsertSource(mlMap, sourceId, data);
    try {
      mlMap.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'step',
            ['get', 'threshold'],
            this.fillColor,
            0.005,
            '#f97316',
            0.01,
            '#ef4444',
          ] as unknown,
          'fill-opacity': 0.35,
          'fill-outline-color': this.fillColor,
        },
      });
      this.layerIds.push(layerId);
    } catch {
      // ignore
    }

    // 标记泄漏点（幂等：模拟重渲染时 source 可能已存在）
    const ptId = `${this.layerPrefix}-source`;
    const ptData = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [source.lng, source.lat] },
          properties: {},
        },
      ],
    };
    upsertSource(mlMap, ptId, ptData);
    try {
      mlMap.addLayer({
        id: ptId,
        type: 'circle',
        source: ptId,
        paint: {
          'circle-radius': 10,
          'circle-color': '#fbbf24',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#000',
        },
      });
      this.layerIds.push(ptId);
    } catch {
      // ignore
    }
  }
}
