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
import type {
  RoadNetworkDataset,
  RoadSpeedRecord,
  SpeedTimeSeries,
} from '../types';
import {
  predictCongestion,
  edgeTrend,
  speedSnapshotAt,
  type CongestionPrediction,
  type EdgeTrend,
} from './congestionPredict';

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
  /** 节点/路段点击回调（事件钩子） */
  onEdgeSelect?: (edgeId: string, congestion?: RoadCongestionResult) => void;
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
  /** 实时速度着色层（TF-1） */
  private speedLayerIds: string[] = [];
  /** 拥堵传播层（TF-2） */
  private congestionLayerIds: string[] = [];
  /** OD 矩阵层（TF-4） */
  private odLayerIds: string[] = [];
  /** 时间轴回放层（T-4） */
  private timelineLayerIds: string[] = [];
  /** 拥堵传播动画的 rAF 句柄（用于取消） */
  private congestionRaf: number | null = null;
  private onEdgeSelect?: (edgeId: string, congestion?: RoadCongestionResult) => void;

  constructor(options: TrafficFlowOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-flow';
    this.onEdgeSelect = options.onEdgeSelect;
  }

  /** TF-2 拥堵传播动画：从种子路段沿拓扑扩散，渲染受影响路段的红色高亮（透明度按跳数渐变模拟动态扩展） */
  renderCongestionSpread(seedEdgeId: string, hops = 3): string[] {
    this.clearCongestion();
    const affected = this.congestSpread(seedEdgeId, hops);
    if (affected.length === 0) return affected;

    // 计算每个受影响路段的跳数（用于透明度渐变）
    const hopOf = this.computeHopDistance(seedEdgeId, affected, hops);

    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        addLayer: (layer: unknown) => void;
        setPaintProperty?: (id: string, prop: string, value: unknown) => void;
        on?: (
          type: string,
          layerId: string,
          handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
        ) => void;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const edgeById = new Map(this.dataset.edges.map((e) => [e.id, e] as const));
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));
    const features = affected
      .map((id) => edgeById.get(id))
      .filter((e): e is NonNullable<typeof e> => !!e)
      .map((e) => {
        const from = nodeById.get(e.fromNode);
        const to = nodeById.get(e.toNode);
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
          properties: { edgeId: e.id, hop: hopOf.get(e.id) ?? 0 },
        };
      })
      .filter((f): f is NonNullable<typeof f> => !!f);

    upsertSource(mlMap, `${prefix}-congestion-src`, {
      type: 'FeatureCollection',
      features,
    });
    mlMap.addLayer({
      id: `${prefix}-congestion-line`,
      type: 'line',
      source: `${prefix}-congestion-src`,
      paint: {
        'line-color': '#ef4444',
        // 跳数越大越透明，模拟拥堵向外动态扩散
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'hop'],
          0,
          0.95,
          hops,
          0.25,
        ] as never,
        'line-width': [
          'interpolate',
          ['linear'],
          ['get', 'hop'],
          0,
          7,
          hops,
          2,
        ] as never,
      },
      // 静态渲染时全量可见；动画模式由 playCongestionSpread 改写此 filter
      filter: ['<=', ['get', 'hop'], hops] as never,
    });
    this.congestionLayerIds.push(`${prefix}-congestion-line`);

    // 点击拥堵路段触发选中回调（与 TF-1/TF-3 详情联动）
    if (this.onEdgeSelect && mlMap.on) {
      mlMap.on('click', `${prefix}-congestion-line`, (ev) => {
        const edgeId = ev.features?.[0]?.properties?.edgeId as string | undefined;
        if (edgeId) this.onEdgeSelect?.(edgeId);
      });
    }
    return affected;
  }

  /**
   * TF-2 拥堵传播动画：从种子事件沿路网逐跳"扩散"，峰值后可选保持或循环。
   * 用 requestAnimationFrame 推进可视波前（仅显示 hop <= wave 的路段），模拟拥堵向外蔓延。
   * @param seedEdgeId  种子路段
   * @param hops        最大扩散跳数（默认 3）
   * @param opts.loop   到达峰值后是否循环（默认 false，停在峰值）
   * @param opts.durationMs 单程扩散时长（默认 1500ms）
   * @param opts.raf    注入 rAF（测试/SSR 用；默认全局 requestAnimationFrame）
   * @returns 受影响路段 id 列表（同 renderCongestionSpread）
   */
  playCongestionSpread(
    seedEdgeId: string,
    hops = 3,
    opts: {
      loop?: boolean;
      durationMs?: number;
      raf?: (cb: (t: number) => void) => number;
    } = {}
  ): string[] {
    const affected = this.renderCongestionSpread(seedEdgeId, hops);
    if (affected.length === 0) return affected;

    const raf = opts.raf ?? globalThis.requestAnimationFrame?.bind(globalThis);
    const durationMs = opts.durationMs ?? 1500;
    const layerId = `${this.layerPrefix}-congestion-line`;
    const mlMap = (this.map as unknown as {
      instance: {
        setFilter?: (id: string, filter: unknown) => void;
        getLayer?: (id: string) => unknown;
      };
    }).instance;

    // 浏览器环境无 rAF（如测试）时不启动动画，保留静态快照
    if (!raf || typeof mlMap.setFilter !== 'function') return affected;

    this.stopCongestionSpread();
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start;
      const phase = (elapsed % (opts.loop ? durationMs * 2 : durationMs)) / durationMs;
      // 0→1 扩散推进；loop 时 1→2 段回退（波前收缩后重来）
      const wave = opts.loop ? (phase < 1 ? phase : 2 - phase) * hops : Math.min(phase, 1) * hops;
      mlMap.setFilter?.(layerId, ['<=', ['get', 'hop'], Math.max(0.001, wave)] as never);
      if (!opts.loop && phase >= 1) return; // 停在峰值
      this.congestionRaf = raf(tick);
    };
    this.congestionRaf = raf(tick);
    return affected;
  }

  /** 停止拥堵传播动画（保留当前静态层） */
  stopCongestionSpread(): void {
    if (this.congestionRaf !== null && globalThis.cancelAnimationFrame) {
      globalThis.cancelAnimationFrame(this.congestionRaf);
    }
    this.congestionRaf = null;
  }

  /** 计算受影响路段相对种子的跳数（BFS 距离） */
  private computeHopDistance(
    seedEdgeId: string,
    affected: string[],
    maxHops: number,
  ): Map<string, number> {
    const edges = this.dataset.edges;
    const seed = edges.find((e) => e.id === seedEdgeId);
    const dist = new Map<string, number>([[seedEdgeId, 0]]);
    if (!seed) return dist;
    let frontier = [seed];
    for (let i = 1; i <= maxHops; i++) {
      const next: typeof edges = [];
      for (const e of frontier) {
        for (const e2 of edges) {
          if (dist.has(e2.id) || !affected.includes(e2.id)) continue;
          if (
            e2.fromNode === e.fromNode ||
            e2.fromNode === e.toNode ||
            e2.toNode === e.fromNode ||
            e2.toNode === e.toNode
          ) {
            dist.set(e2.id, i);
            next.push(e2);
          }
        }
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    return dist;
  }

  private clearCongestion(): void {
    this.stopCongestionSpread();
    for (const id of this.congestionLayerIds) {
      this.map.removeLayer(id);
    }
    this.congestionLayerIds = [];
  }

  /** TF-1 路段流量/速度实时着色（路况模式）
   * 以 speed 字段驱动颜色（复用 paintRoadBySpeed 的色阶），线宽按速度反向（越堵越粗）。
   * 点击路段触发 onEdgeSelect，供 TF-3 趋势图联动。 */
  renderRoadSpeed(speeds?: RoadSpeedRecord[]): void {
    this.clearRoadSpeed();
    const speedList = speeds ?? this.dataset.speeds ?? [];
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
        on?: (
          type: string,
          layerId: string,
          handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
        ) => void;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const speedMap = new Map(speedList.map((s) => [s.edgeId, s] as const));
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));
    const features = this.dataset.edges
      .map((e) => {
        const from = nodeById.get(e.fromNode);
        const to = nodeById.get(e.toNode);
        if (!from || !to) return null;
        const rec = speedMap.get(e.id);
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ] as [number, number][],
          },
          properties: { edgeId: e.id, speed: rec?.speed ?? 60, flow: rec?.flow ?? 0 },
        };
      })
      .filter((f): f is NonNullable<typeof f> => !!f);

    upsertSource(mlMap, `${prefix}-speed-src`, { type: 'FeatureCollection', features });
    mlMap.addLayer({
      id: `${prefix}-speed-line`,
      type: 'line',
      source: `${prefix}-speed-src`,
      paint: {
        'line-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'speed'], 60],
          0, '#ef4444',
          20, '#f59e0b',
          40, '#fbbf24',
          60, '#4ade80',
          80, '#22d3ee',
        ] as never,
        'line-width': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'speed'], 60],
          0, 8,
          40, 5,
          80, 2.5,
        ] as never,
        'line-opacity': 0.9,
      },
    });
    this.speedLayerIds.push(`${prefix}-speed-line`);

    if (this.onEdgeSelect && mlMap.on) {
      mlMap.on('click', `${prefix}-speed-line`, (ev) => {
        const edgeId = ev.features?.[0]?.properties?.edgeId as string | undefined;
        if (edgeId) this.onEdgeSelect?.(edgeId);
      });
    }
  }

  /** TF-3 流量趋势图数据：返回选中路段在给定时序上的趋势聚合（速度/流量/统计） */
  getEdgeTrend(edgeId: string, series: SpeedTimeSeries): EdgeTrend | null {
    return edgeTrend(series, edgeId);
  }

  /** T-4 路况时间轴：在时间轴 index 处对全路网做速度切片着色（历史回放）
   * 返回该时刻各路段速度映射，便于上层更新进度条/时间点。 */
  renderSpeedTimeline(series: SpeedTimeSeries, index: number): Record<string, number> {
    this.clearTimeline();
    const snap = speedSnapshotAt(series, index);
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));
    const features = this.dataset.edges
      .map((e) => {
        const from = nodeById.get(e.fromNode);
        const to = nodeById.get(e.toNode);
        if (!from || !to) return null;
        const speed = snap[e.id];
        if (speed === undefined) return null;
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ] as [number, number][],
          },
          properties: { edgeId: e.id, speed },
        };
      })
      .filter((f): f is NonNullable<typeof f> => !!f);

    upsertSource(mlMap, `${prefix}-timeline-src`, { type: 'FeatureCollection', features });
    mlMap.addLayer({
      id: `${prefix}-timeline-line`,
      type: 'line',
      source: `${prefix}-timeline-src`,
      paint: {
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'speed'],
          0, '#ef4444',
          20, '#f59e0b',
          40, '#fbbf24',
          60, '#4ade80',
          80, '#22d3ee',
        ] as never,
        'line-width': 4,
        'line-opacity': 0.9,
      },
    });
    this.timelineLayerIds.push(`${prefix}-timeline-line`);
    return snap;
  }

  private clearRoadSpeed(): void {
    for (const id of this.speedLayerIds) {
      this.map.removeLayer(id);
    }
    this.speedLayerIds = [];
  }

  private clearTimeline(): void {
    for (const id of this.timelineLayerIds) {
      this.map.removeLayer(id);
    }
    this.timelineLayerIds = [];
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
        getSource: (id: string) => unknown;
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
    this.odLayerIds.push(`${prefix}-od-line`);
  }

  private clearOd(): void {
    for (const id of this.odLayerIds) {
      this.map.removeLayer(id);
    }
    this.odLayerIds = [];
  }

  destroy(): void {
    this.clearCongestion();
    this.clearRoadSpeed();
    this.clearTimeline();
    this.clearOd();
  }
}
