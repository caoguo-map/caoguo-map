/**
 * TrafficFlow 交通流量可视化组件（PRD §3.2）
 *
 * 功能点：
 * - TF-1 路段流量/速度实时着色
 * - TF-2 拥堵传播动画（拥堵区域动态扩展）
 * - TF-3 流量趋势图（选中路段展示）
 * - TF-4 OD 矩阵可视化（起终点连线，宽度=流量）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { RoadNetworkDataset, RoadSpeedRecord } from '../types';
import { predictCongestion, type CongestionPrediction } from './congestionPredict';

export interface OdPair {
  fromNode: string;
  toNode: string;
  /** 流量（辆/小时） */
  flow: number;
}

export interface TrafficFlowOptions {
  map: CaoguoMap;
  dataset: RoadNetworkDataset;
  layerPrefix?: string;
}

export interface RoadCongestionResult {
  edgeId: string;
  speed: number;
  flow?: number;
  prediction: CongestionPrediction;
}

/**
 * TrafficFlow 组件
 */
export class TrafficFlow {
  private map: CaoguoMap;
  private dataset: RoadNetworkDataset;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: TrafficFlowOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-flow';
  }

  /** 拥堵传播分析（纯函数）：给定拥堵起点路段，沿拓扑扩散，返回受影响路段 */
  congestSpread(seedEdgeId: string, hops = 3): string[] {
    const edges = this.dataset.edges;
    const speeds = this.dataset.speeds ?? [];
    const speedMap = new Map(speeds.map((s) => [s.edgeId, s.speed] as const));
    const seed = edges.find((e) => e.id === seedEdgeId);
    if (!seed) return [];

    const affected = new Set<string>([seedEdgeId]);
    let frontier = [seed];
    for (let i = 0; i < hops; i++) {
      const next: typeof edges = [];
      for (const e of frontier) {
        for (const e2 of edges) {
          if (affected.has(e2.id)) continue;
          // 共享节点即相邻
          if (
            e2.fromNode === e.fromNode ||
            e2.fromNode === e.toNode ||
            e2.toNode === e.fromNode ||
            e2.toNode === e.toNode
          ) {
            const spd = speedMap.get(e2.id) ?? 60;
            // 只传播到"相对拥堵"的路段（速度 < 40）
            if (spd < 40) {
              affected.add(e2.id);
              next.push(e2);
            }
          }
        }
      }
      frontier = next;
    }
    return [...affected];
  }

  /** 对单条路段做拥堵预测 */
  predict(edgeId: string, minutesAhead = 30): CongestionPrediction {
    const speeds = this.dataset.speeds ?? [];
    const recent = speeds
      .filter((s) => s.edgeId === edgeId)
      .map((s) => s.speed);
    return predictCongestion({ recentSpeeds: recent, minutesAhead });
  }

  /** 渲染 OD 矩阵（起终点连线，宽度=流量） */
  renderOdMatrix(odPairs: OdPair[]): void {
    this.clearOd();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
      };
    }).instance;
    const prefix = this.layerPrefix;
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));

    const features = odPairs.flatMap((od) => {
      const from = nodeById.get(od.fromNode);
      const to = nodeById.get(od.toNode);
      if (!from || !to) return [];
      return [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ] as [number, number][],
          },
          properties: { flow: od.flow },
        },
      ];
    });

    upsertSource(mlMap, `${prefix}-od-src`, {
      type: 'FeatureCollection',
      features,
    });
    mlMap.addLayer({
      id: `${prefix}-od-line`,
      type: 'line',
      source: `${prefix}-od-src`,
      paint: {
        'line-color': '#22d3ee',
        'line-width': ['interpolate', ['linear'], ['get', 'flow'], 0, 1, 500, 6],
        'line-opacity': 0.6,
      },
    });
    this.layerIds.push(`${prefix}-od-line`);
  }

  private clearOd(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  destroy(): void {
    this.clearOd();
  }
}
