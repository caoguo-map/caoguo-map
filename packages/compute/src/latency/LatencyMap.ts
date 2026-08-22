/**
 * LatencyMap 延迟热力图组件（PRD §4.2）
 *
 * 功能点：
 * - LM-1 延迟等值线：以用户端为原点，绘制延迟等级区域
 * - LM-2 最优接入推荐：按延迟排序推荐最近可用算力节点
 * - LM-3 延迟趋势：选中链路展示 24h 延迟变化曲线
 * - LM-4 延迟告警：链路延迟超过阈值自动告警
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { ComputeTopologyDataset, LatencyRecord } from '../types';
import { recommendBestNode } from '../graph';
import {
  idwGrid,
  latencyIsoFeatureCollection,
  LATENCY_LEVEL_FILL,
  type IdwAnchor,
} from './idw';

/** 延迟等级（等值线/热力分区） */
export type LatencyLevel = 'excellent' | 'good' | 'fair' | 'poor';

/** 延迟告警 */
export interface LatencyAlert {
  linkId: string;
  latencyMs: number;
  thresholdMs: number;
  level: 'warning' | 'critical';
}

export interface LatencyMapOptions {
  map: CaoguoMap;
  dataset: ComputeTopologyDataset;
  /** 延迟告警阈值（ms） */
  thresholdMs?: number;
  layerPrefix?: string;
}

/**
 * 按延迟值分级（LM-1 延迟等值线等级）
 */
export function latencyLevel(ms: number): LatencyLevel {
  if (ms <= 10) return 'excellent';
  if (ms <= 30) return 'good';
  if (ms <= 60) return 'fair';
  return 'poor';
}

/**
 * LatencyMap 组件
 */
export class LatencyMap {
  private map: CaoguoMap;
  private dataset: ComputeTopologyDataset;
  private thresholdMs: number;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: LatencyMapOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.thresholdMs = options.thresholdMs ?? 50;
    this.layerPrefix = options.layerPrefix ?? 'cg-latency';
  }

  /** LM-2 最优接入推荐 */
  recommendBestNode(userLng: number, userLat: number) {
    return recommendBestNode(
      this.dataset.nodes.map((n) => ({
        id: n.id,
        lng: n.lng,
        lat: n.lat,
        online: n.properties?.status !== 'offline',
      })),
      userLng,
      userLat
    );
  }

  /** LM-4 延迟告警：找出超过阈值的链路 */
  checkAlerts(): LatencyAlert[] {
    const alerts: LatencyAlert[] = [];
    for (const l of this.dataset.links) {
      const latency = l.properties?.latencyMs ?? 0;
      if (latency > this.thresholdMs) {
        alerts.push({
          linkId: l.id,
          latencyMs: latency,
          thresholdMs: this.thresholdMs,
          level: latency > this.thresholdMs * 2 ? 'critical' : 'warning',
        });
      }
    }
    return alerts.sort((a, b) => b.latencyMs - a.latencyMs);
  }

  /** LM-3 延迟趋势：从记录中提取某链路 24h 序列统计 */
  trend(records: LatencyRecord[], linkId: string) {
    const series = records
      .filter((r) => r.linkId === linkId)
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      .map((r) => r.latencyMs);
    if (series.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0 };
    }
    const min = Math.min(...series);
    const max = Math.max(...series);
    const avg = series.reduce((a, b) => a + b, 0) / series.length;
    return { count: series.length, min, max, avg };
  }

  /**
   * LM-1 延迟可视化：渲染光缆链路（按延迟等级着色）+ 算力节点标记。
   * 延迟等级越高（ms 越大）颜色越偏红，直观呈现网络延迟分布。
   */
  render(): void {
    this.clear();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        addLayer: (layer: unknown) => void;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const nodeCoord = new Map<string, [number, number]>();
    for (const n of this.dataset.nodes) nodeCoord.set(n.id, [n.lng, n.lat]);

    const linkFeatures = this.dataset.links
      .map((l) => {
        const coords =
          l.geometry ??
          [nodeCoord.get(l.fromNode), nodeCoord.get(l.toNode)].filter(
            (c): c is [number, number] => !!c
          ) as [number, number][];
        if (coords.length < 2) return null;
        return {
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: coords },
          properties: { linkId: l.id, latencyMs: l.properties?.latencyMs ?? 0 },
        };
      })
      .filter((f): f is NonNullable<typeof f> => !!f);

    upsertSource(mlMap, `${prefix}-link-src`, {
      type: 'FeatureCollection',
      features: linkFeatures,
    });
    mlMap.addLayer({
      id: `${prefix}-link-line`,
      type: 'line',
      source: `${prefix}-link-src`,
      paint: {
        // 按延迟 ms 着色：低延迟青绿，高延迟红（对应 latencyLevel 阈值）
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'latencyMs'],
          10,
          '#22d3ee',
          30,
          '#4ade80',
          60,
          '#fbbf24',
          100,
          '#ef4444',
        ] as never,
        'line-width': 2,
        'line-opacity': 0.85,
      },
    });
    this.layerIds.push(`${prefix}-link-line`);

    const nodeFeatures = this.dataset.nodes.map((n) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] as [number, number] },
      properties: { nodeId: n.id, name: n.name ?? n.id },
    }));
    upsertSource(mlMap, `${prefix}-node-src`, {
      type: 'FeatureCollection',
      features: nodeFeatures,
    });
    mlMap.addLayer({
      id: `${prefix}-node-pt`,
      type: 'circle',
      source: `${prefix}-node-src`,
      paint: {
        'circle-radius': 5,
        'circle-color': '#60a5fa',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    this.layerIds.push(`${prefix}-node-pt`);
  }

  /**
   * LM-1 延迟等值线（以用户端为原点的延迟等级区域）。
   *
   * 以用户端为原点，结合各算力节点到用户端的估计延迟（复用 LM-2 的
   * `recommendBestNode` 估算），用 IDW 反距离加权在包围盒网格上插值出
   * 连续延迟场，再按延迟等级阈值离散化为分级面（excellent/good/fair/poor），
   * 作为 4 个 fill 图层叠加，形成「延迟等值线/等级区域」。
   *
   * 该方法与 `render()`（光缆链路着色）互补：render() 展示链路拓扑，
   * 本方法展示从用户端视角的连续延迟分布。二者可分别调用，互不覆盖。
   */
  /**
   * 清理已生成的延迟等值带图层/源（LM-1）。供 `renderLatencyIsobands` 重算前
   * 与 `clear()` 调用，确保可重复执行、不堆叠。
   */
  clearIsobands(): void {
    const mlMap = (this.map as unknown as {
      instance: {
        removeLayer: (id: string) => void;
        getLayer: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;
    const levelsClear: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair', 'poor'];
    for (const lv of levelsClear) {
      const lid = `${prefix}-iso-${lv}-fill`;
      const sid = `${prefix}-iso-${lv}-src`;
      if (mlMap.getLayer(lid)) mlMap.removeLayer(lid);
      if (this.map.getSource(sid)) this.map.removeSource(sid);
      this.layerIds = this.layerIds.filter((x) => x !== lid);
    }
  }

  renderLatencyIsobands(userLng: number, userLat: number, opts: { cols?: number; rows?: number } = {}): void {
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        addLayer: (layer: unknown) => void;
      };
    }).instance;
    const prefix = this.layerPrefix;

    // 清理上一次生成的等值带图层/源（方法可重复调用，避免实时拖拽时堆叠）。
    this.clearIsobands();

    // 锚点：各算力节点 + 其到用户端的估计延迟（LM-2 估算逻辑）。
    const ranked = this.recommendBestNode(userLng, userLat);
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n]));
    const anchors: IdwAnchor[] = ranked
      .map((r) => {
        const n = nodeById.get(r.id);
        if (!n) return null;
        return { lng: n.lng, lat: n.lat, value: r.latencyMs };
      })
      .filter((a): a is IdwAnchor => !!a);
    if (anchors.length === 0) return;

    const grid = idwGrid(anchors, { cols: opts.cols ?? 24, rows: opts.rows ?? 24 });
    const fc = latencyIsoFeatureCollection(grid);

    // 按等级分组为独立 source/layer，便于分别着色与透明度控制。
    const levels: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair', 'poor'];
    for (const level of levels) {
      const subset: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
        type: 'FeatureCollection',
        features: fc.features.filter((f) => f.properties?.level === level),
      };
      const srcId = `${prefix}-iso-${level}-src`;
      const layerId = `${prefix}-iso-${level}-fill`;
      upsertSource(mlMap, srcId, subset);
      mlMap.addLayer({
        id: layerId,
        type: 'fill',
        source: srcId,
        paint: {
          'fill-color': LATENCY_LEVEL_FILL[level] as never,
          'fill-opacity': 0.28,
        },
      });
      this.layerIds.push(layerId);
    }
  }

  clear(): void {
    this.clearIsobands();
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  destroy(): void {
    this.clear();
  }
}
