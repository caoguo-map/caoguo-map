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
import type { ComputeTopologyDataset, LatencyRecord } from '../types';
import { recommendBestNode } from '../graph';

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
