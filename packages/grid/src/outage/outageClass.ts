/**
 * OutageAnalyzer 组件类（地图集成层）
 *
 * 包装 analyzeOutage 纯函数 + 维护 MapLibre 图层状态。
 * 组件层职责：
 *  - 接收地图实例，添加受影响区域/设备/线路、重要用户标注
 *  - 暴露 analyze()、clear() 等命令式 API
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { removeSourceSafe, upsertSource } from '@caoguo/maplibre';
import { analyzeOutage, convexHull, centroid, type OutageResult, type OutageOptions } from './outageCore';
import type { GridTopologyDataset } from '../types';

export interface OutageAnalyzerOptions {
  map: CaoguoMap;
  dataset: GridTopologyDataset;
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 受影响区域填充样式 */
  affectedFillPaint?: Record<string, unknown>;
  /** 受影响线路样式 */
  affectedLinePaint?: Record<string, unknown>;
  /** 重要用户标注样式 */
  importantUserPaint?: Record<string, unknown>;
}

type Listener = (r: OutageResult) => void;

/**
 * OutageAnalyzer 组件
 *
 * 用法：
 *   const analyzer = new OutageAnalyzer({ map, dataset });
 *   const result = analyzer.analyze('substation-01');
 *   analyzer.clear();
 */
export class OutageAnalyzer {
  private map: CaoguoMap;
  private dataset: GridTopologyDataset;
  private layerPrefix: string;
  private affectedFillPaint: Record<string, unknown>;
  private affectedLinePaint: Record<string, unknown>;
  private importantUserPaint: Record<string, unknown>;
  private layerIds: string[] = [];
  private listeners = new Set<Listener>();
  private lastResult: OutageResult | null = null;

  constructor(options: OutageAnalyzerOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-outage';
    this.affectedFillPaint = options.affectedFillPaint ?? {
      'fill-color': '#ef4444',
      'fill-opacity': 0.15,
      'fill-outline-color': '#ef4444',
    };
    this.affectedLinePaint = options.affectedLinePaint ?? {
      'line-color': '#ef4444',
      'line-width': 3,
      'line-opacity': 0.85,
    };
    this.importantUserPaint = options.importantUserPaint ?? {
      'circle-radius': 8,
      'circle-color': '#fbbf24',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ef4444',
    };
  }

  /** 触发停电分析 */
  analyze(faultId: string, opts?: OutageOptions): OutageResult {
    const result = analyzeOutage(this.dataset, faultId, opts);
    this.lastResult = result;
    this.render(result);
    for (const l of this.listeners) l(result);
    return result;
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
    const mlMap = (this.map as unknown as {
      instance: { getSource: (id: string) => unknown; removeSource: (id: string) => void };
    }).instance;
    for (const sid of [`${this.layerPrefix}-hull-src`, `${this.layerPrefix}-lines-src`, `${this.layerPrefix}-important-src`]) {
      removeSourceSafe(mlMap, sid);
    }
  }

  destroy(): void {
    this.clear();
    this.listeners.clear();
    this.lastResult = null;
  }

  onResult(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getLastResult(): OutageResult | null {
    return this.lastResult;
  }

  private render(result: OutageResult): void {
    this.clear();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;

    // 受影响区域凸包
    const points: [number, number][] = result.affectedDevices.map((d) => [d.lng, d.lat]);
    const hull = convexHull(points);
    if (hull.length >= 3) {
      const hullGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [[...hull, hull[0]]] },
            properties: {},
          },
        ],
      };
      upsertSource(mlMap, `${prefix}-hull-src`, hullGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-hull-fill`,
        type: 'fill',
        source: `${prefix}-hull-src`,
        paint: this.affectedFillPaint,
      });
      this.layerIds.push(`${prefix}-hull-fill`);
    }

    // 受影响线路
    const deviceByIdMap = new Map(this.dataset.devices.map((d) => [d.id, d] as const));
    const lineGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: result.affectedLines.flatMap((l) => {
        const from = deviceByIdMap.get(l.fromDevice);
        const to = deviceByIdMap.get(l.toDevice);
        if (!from || !to) return [];
        return [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [from.lng, from.lat],
                [to.lng, to.lat],
              ],
            },
            properties: {},
          },
        ];
      }),
    };
    if (lineGeoJSON.features.length > 0) {
      upsertSource(mlMap, `${prefix}-lines-src`, lineGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-lines`,
        type: 'line',
        source: `${prefix}-lines-src`,
        paint: this.affectedLinePaint,
      });
      this.layerIds.push(`${prefix}-lines`);
    }

    // 重要用户标注
    const important = result.affectedUsers.important;
    if (important.length > 0) {
      const userGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: important.map((u) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [u.lng, u.lat] },
          properties: { name: u.name ?? u.id, reason: u.reason ?? '' },
        })),
      };
      upsertSource(mlMap, `${prefix}-important-src`, userGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-important`,
        type: 'circle',
        source: `${prefix}-important-src`,
        paint: this.importantUserPaint,
      });
      this.layerIds.push(`${prefix}-important`);
    }

    // 定位到受影响区域中心
    const center = centroid(points);
    if (center[0] !== 0 || center[1] !== 0) {
      try {
        this.map.flyTo({ center });
      } catch {
        // ignore
      }
    }
  }
}
