/**
 * RiverSystem 组件 - 水系拓扑图
 *
 * PRD phase-2-grid-water §4.1：
 * - 水系层级渲染：流域→干流→支流渐进展示
 * - 水库卡片 / 闸站控制 / 堤防状态 / 实时水位叠加
 * - 顺流/逆流钻取
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { removeSourcesSafe, upsertSource } from '@caoguo/maplibre';
import type {
  WaterDataset,
  WaterColorByMode,
  WaterFeature,
  WaterFeatureKind,
  RiverLevel,
} from '../types';
import { getReservoirDetail, getReservoirDetails } from './reservoirCard';
import { renderCardHtml } from '@caoguo/maplibre';
import type { RenderCardOptions } from '@caoguo/maplibre';
import {
  applyMetricPatch,
  isOverWarning,
  parseWaterMessage,
  stationSummary,
  METRIC_STATION_KINDS,
  RAINFALL_COLORS,
} from './stationMetrics';
import type { WaterMetricPatch, StationSummary } from './stationMetrics';
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

  private getMlMap(): {
    instance: {
      addSource: (id: string, source: unknown) => void;
      getSource: (id: string) => unknown;
      setData: (id: string, data: unknown) => void;
      removeSource: (id: string) => void;
      addLayer: (layer: unknown) => void;
      setPaintProperty: (id: string, prop: string, value: unknown) => void;
      on?: (
        type: string,
        layerId: string,
        handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
      ) => void;
    };
  }['instance'] {
    return (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        setData: (id: string, data: unknown) => void;
        removeSource: (id: string) => void;
        addLayer: (layer: unknown) => void;
        setPaintProperty: (id: string, prop: string, value: unknown) => void;
        on?: (
          type: string,
          layerId: string,
          handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
        ) => void;
      };
    }).instance;
  }

  /** 渲染水系要素 */
  render(): void {
    this.clear();
    const mlMap = this.getMlMap();
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
      const srcId = `${prefix}-lines-src`;
      upsertSource(mlMap, srcId, lineGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-lines`,
        type: 'line',
        source: srcId,
        paint: {
          'line-color': paintBy(this.colorBy) as never,
          'line-width': paintLineWidthByFlow() as never,
          'line-opacity': 0.9,
        },
      });
      this.layerIds.push(`${prefix}-lines`);
    }

    if (pointGeoJSON.features.length > 0) {
      const srcId = `${prefix}-points-src`;
      upsertSource(mlMap, srcId, pointGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-points`,
        type: 'circle',
        source: srcId,
        paint: {
          'circle-radius': 6,
          'circle-color': paintBy(this.colorBy) as never,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      this.layerIds.push(`${prefix}-points`);

      // 点击点要素 → 触发 onFeatureSelect 监听（缺口 2 修复）
      const featureById = new Map<string, WaterFeature>();
      for (const f of points) featureById.set(f.id, f);
      if (this.featureListeners.size > 0 && mlMap.on) {
        mlMap.on('click', `${prefix}-points`, (ev) => {
          const fid = ev.features?.[0]?.properties?.featureId as string | undefined;
          if (!fid) return;
          const feature = featureById.get(fid);
          if (feature) {
            for (const fn of this.featureListeners) fn(feature);
          }
        });
      }
    }
  }

  /** 切换着色模式 */
  setColorBy(mode: WaterColorByMode): void {
    this.colorBy = mode;
    const mlMap = this.getMlMap();
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
    const mlMap = this.getMlMap();
    removeSourcesSafe(mlMap, [`${this.layerPrefix}-lines-src`, `${this.layerPrefix}-points-src`]);
  }

  destroy(): void {
    this.clear();
    this.featureListeners.clear();
  }

  // ============================================================
  // 站点实时指标（PRD R-5）
  // ============================================================

  /**
   * R-5 应用实时指标：把雨量/水位/流量 patch 写回数据集并立即重绘。
   *
   * 传输层由调用方决定（轮询 / WebSocket / MQTT / 手动注入），
   * 消息解析见 `parseWaterMessage()`，本方法只负责落库与刷新。
   *
   * @returns 实际发生变化的要素 id 列表
   */
  updateStationMetrics(patches: WaterMetricPatch[]): string[] {
    const changed: string[] = [];
    for (const patch of patches) {
      const idx = this.dataset.features.findIndex((f) => f.id === patch.featureId);
      if (idx < 0) continue;
      const next = applyMetricPatch(this.dataset.features[idx], patch);
      if (!next) continue;
      this.dataset.features[idx] = next;
      changed.push(next.id);
    }
    if (changed.length > 0) this.render();
    return changed;
  }

  /**
   * R-5 解析实时消息（精简键 `{f,wl,rf,fr,ts}` 或完整键），非法消息返回 null。
   * 与 `updateStationMetrics()` 配合使用：`river.updateStationMetrics([parseWaterMessage(raw)!])`
   */
  parseStationMessage(raw: string | Record<string, unknown>): WaterMetricPatch | null {
    return parseWaterMessage(raw);
  }

  /**
   * R-5 渲染站点实时指标图层：水位站/雨量站按降雨等级着色，超警戒站点红色高亮。
   * @returns 渲染的要素数
   */
  renderStationMetrics(): number {
    const prefix = this.layerPrefix;
    const stations = this.dataset.features.filter((f) =>
      METRIC_STATION_KINDS.includes(f.kind)
    );
    if (stations.length === 0) {
      this.removeLayerSafely(`${prefix}-station-pt`);
      return 0;
    }

    const features = stations.map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
      properties: {
        featureId: f.id,
        kind: f.kind,
        name: f.name ?? f.id,
        waterLevel: f.properties?.waterLevel ?? 0,
        warningLevel: f.properties?.warningLevel ?? 0,
        rainfall: f.properties?.rainfall ?? 0,
        overWarning: isOverWarning(f) ? 1 : 0,
      },
    }));

    upsertSource(this.getMlMap(), `${prefix}-station-src`, {
      type: 'FeatureCollection',
      features,
    } as never);
    this.addLayerOnce(`${prefix}-station-pt`, {
      id: `${prefix}-station-pt`,
      type: 'circle',
      source: `${prefix}-station-src`,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'rainfall'],
          0, 4,
          10, 5,
          25, 6.5,
          50, 8,
        ],
        // 超警戒最优先（红），否则按降雨等级配色
        'circle-color': [
          'case',
          ['==', ['get', 'overWarning'], 1], RAINFALL_COLORS.overWarning,
          [
            'step',
            ['get', 'rainfall'],
            RAINFALL_COLORS.none,
            0.01, RAINFALL_COLORS.light,
            10, RAINFALL_COLORS.moderate,
            25, RAINFALL_COLORS.heavy,
            50, RAINFALL_COLORS.torrential,
          ],
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    return stations.length;
  }

  /** 清除站点实时指标图层 */
  clearStationMetrics(): void {
    this.removeLayerSafely(`${this.layerPrefix}-station-pt`);
  }

  /** 站点实时指标汇总（超警戒数 / 最大降雨量） */
  stationSummary(): StationSummary {
    return stationSummary(this.dataset.features);
  }

  // ============================================================
  // 水库/闸站卡片数据层（PRD R-2）
  // ============================================================

  /**
   * 构建水库/闸站详情与卡片字段（R-2 数据层，实现见 `reservoirCard.ts` 纯函数）。
   * @returns 要素不存在时返回 undefined
   */
  getReservoirDetail(featureId: string) {
    return getReservoirDetail(this.dataset, featureId);
  }

  /**
   * 批量构建水库/闸站详情（多水库联合调度场景，PRD §4.3 DO-1）
   * @param kinds 要素类型（默认 `['reservoir', 'gate']`）
   */
  getReservoirDetails(kinds?: WaterFeatureKind[]) {
    return getReservoirDetails(this.dataset, kinds);
  }

  /**
   * 超警戒水位的水库/水位站（防汛值守用）
   */
  overWarningFeatures() {
    return getReservoirDetails(this.dataset, ['reservoir', 'waterStation']).filter(
      (d) => d.cardInfo.overWarning
    );
  }

  /**
   * 生成水库/闸站卡片 HTML（R-2 的零依赖 DOM 外壳）。
   * 超警戒时标题左侧出现红色强调条。
   */
  renderReservoirCardHtml(featureId: string, opts?: RenderCardOptions): string | undefined {
    const d = this.getReservoirDetail(featureId);
    if (!d) return undefined;
    const rows = [
      ...(d.cardInfo.storageLabel ? [{ label: '蓄水率', value: d.cardInfo.storageLabel }] : []),
      ...(d.cardInfo.capacityLabel ? [{ label: '库容', value: d.cardInfo.capacityLabel }] : []),
      ...(d.cardInfo.levelLabel ? [{ label: '水位', value: d.cardInfo.levelLabel }] : []),
      { label: '上下游', value: `上 ${d.upstreamCount} · 同级 ${d.siblingCount}` },
    ];
    return renderCardHtml(
      {
        title: d.cardInfo.title,
        subtitle: d.cardInfo.subtitle,
        statusLabel: d.cardInfo.statusLabel,
        statusColor: d.cardInfo.overWarning ? '#f87171' : '#4ade80',
        accentColor: d.cardInfo.overWarning ? '#ef4444' : undefined,
        rows,
        images: d.cardInfo.images,
        maintenance: d.cardInfo.maintenance,
      },
      opts
    );
  }

  onFeatureSelect(fn: FeatureListener): () => void {
    this.featureListeners.add(fn);
    return () => this.featureListeners.delete(fn);
  }

  /** 幂等加层：图层已存在时忽略，避免重渲染抛错 */
  private addLayerOnce(id: string, layer: Record<string, unknown>): void {
    try {
      this.getMlMap().addLayer(layer);
      this.layerIds.push(id);
    } catch {
      // 图层已存在（重渲染）：只确保 id 被记录
      if (!this.layerIds.includes(id)) this.layerIds.push(id);
    }
  }

  /** 移除单个图层（不存在时静默） */
  private removeLayerSafely(id: string): void {
    try {
      this.map.removeLayer(id);
    } catch {
      // ignore
    }
    this.layerIds = this.layerIds.filter((x) => x !== id);
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
