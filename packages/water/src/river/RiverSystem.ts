/**
 * RiverSystem 组件 - 水系拓扑图
 *
 * PRD phase-2-grid-water §4.1：
 * - 水系层级渲染：流域→干流→支流渐进展示
 * - 水库卡片 / 闸站控制 / 堤防状态 / 实时水位叠加
 * - 顺流/逆流钻取
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import type { WaterDataset, WaterColorByMode, WaterFeature, RiverLevel } from '../types';
import { paintBy, paintLineWidthByFlow } from '../style/paintRules';

export interface RiverSystemOptions {
  map: CaoguoMap;
  dataset: WaterDataset;
  /** 默认着色模式 */
  colorBy?: WaterColorByMode;
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

type FeatureListener = (f: WaterFeature) => void;

/**
 * RiverSystem 组件
 *
 * 用法：
 *   const river = new RiverSystem({ map, dataset, colorBy: 'flow' });
 *   river.render();
 *   river.setLevel('mainstream'); // 只显示干流
 */
export class RiverSystem {
  private map: CaoguoMap;
  private dataset: WaterDataset;
  private colorBy: WaterColorByMode;
  private layerPrefix: string;
  private currentLevel: RiverLevel | null = null;
  private layerIds: string[] = [];
  private featureListeners = new Set<FeatureListener>();

  constructor(options: RiverSystemOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? 'flow';
    this.layerPrefix = options.layerPrefix ?? 'cg-river';
  }

  /** 渲染水系要素 */
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

    const features = this.visibleFeatures();
    const lines = features.filter((f) =>
      ['mainstream', 'tributary', 'reach', 'dike'].includes(f.kind)
    );
    const points = features.filter((f) =>
      ['reservoir', 'gate', 'rainStation', 'waterStation', 'basin'].includes(f.kind)
    );

    // 线要素
    const lineGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: lines.flatMap((f) => {
        const coords = f.geometry && f.geometry.length >= 2 ? f.geometry : [[f.lng, f.lat]] as [number, number][];
        if (coords.length < 2) return [];
        return [
          {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: coords },
            properties: {
              featureId: f.id,
              kind: f.kind,
              flowRate: f.properties?.flowRate ?? 0,
              storageRate: f.properties?.storageRate ?? 0.5,
              safetyLevel: f.properties?.safetyLevel ?? 'safe',
              level: f.properties?.level ?? 'reach',
            },
          },
        ];
      }),
    };

    // 点要素
    const pointGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: points.map((f) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
        properties: {
          featureId: f.id,
          kind: f.kind,
          flowRate: f.properties?.flowRate ?? 0,
          storageRate: f.properties?.storageRate ?? 0.5,
          safetyLevel: f.properties?.safetyLevel ?? 'safe',
          level: f.properties?.level ?? 'reach',
        },
      })),
    };

    if (lineGeoJSON.features.length > 0) {
      mlMap.addSource(`${prefix}-lines-src`, lineGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-lines`,
        type: 'line',
        source: `${prefix}-lines-src`,
        paint: {
          'line-color': paintBy(this.colorBy) as never,
          'line-width': paintLineWidthByFlow() as never,
          'line-opacity': 0.9,
        },
      });
      this.layerIds.push(`${prefix}-lines`);
    }

    if (pointGeoJSON.features.length > 0) {
      mlMap.addSource(`${prefix}-points-src`, pointGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-points`,
        type: 'circle',
        source: `${prefix}-points-src`,
        paint: {
          'circle-radius': 6,
          'circle-color': paintBy(this.colorBy) as never,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      this.layerIds.push(`${prefix}-points`);
    }
  }

  /** 切换着色模式 */
  setColorBy(mode: WaterColorByMode): void {
    this.colorBy = mode;
    const mlMap = (this.map as unknown as {
      instance: { setPaintProperty: (id: string, prop: string, value: unknown) => void };
    }).instance;
    try {
      mlMap.setPaintProperty(`${this.layerPrefix}-lines`, 'line-color', paintBy(mode) as never);
      mlMap.setPaintProperty(`${this.layerPrefix}-points`, 'circle-color', paintBy(mode) as never);
    } catch {
      // ignore
    }
  }

  /** 层级钻取（流域→干流→支流→河段，null = 全部） */
  setLevel(level: RiverLevel | null): void {
    this.currentLevel = level;
    this.render();
  }

  /** 顺流/逆流钻取：返回沿某河段的上下游要素 */
  traceFlow(featureId: string, direction: 'upstream' | 'downstream'): Set<string> {
    const result = new Set<string>([featureId]);
    let cur = this.dataset.features.find((f) => f.id === featureId);
    if (!cur) return result;
    const visited = new Set<string>();
    let guard = 0;
    while (cur && guard < 100) {
      guard++;
      if (visited.has(cur.id)) break;
      visited.add(cur.id);
      result.add(cur.id);
      if (direction === 'upstream') {
        cur = this.dataset.features.find((f) => f.id === cur!.parentId);
      } else {
        cur = this.dataset.features.find((f) => f.parentId === cur!.id);
      }
    }
    return result;
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  destroy(): void {
    this.clear();
    this.featureListeners.clear();
  }

  onFeatureSelect(fn: FeatureListener): () => void {
    this.featureListeners.add(fn);
    return () => this.featureListeners.delete(fn);
  }

  private visibleFeatures(): WaterFeature[] {
    if (!this.currentLevel) return this.dataset.features;
    return this.dataset.features.filter((f) => {
      if (f.kind === 'reservoir' || f.kind === 'gate' || f.kind === 'rainStation' || f.kind === 'waterStation' || f.kind === 'dike') {
        return true; // 设施始终显示
      }
      return f.properties?.level === this.currentLevel;
    });
  }
}
