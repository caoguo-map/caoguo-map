/**
 * PipelineHealth 组件类（地图集成层）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { scorePipeHealth, type PipeHealthInput, type PipeHealthScore, DEFAULT_WEIGHTS } from './healthScorer';
import { aggregateHeatmap, heatmapToGeoJSON, type HeatmapCell, prioritizeMaintenance } from './riskHeatmap';
import type { PipelineTopologyDataset } from '../types';

export interface PipelineHealthOptions {
  map: CaoguoMap;
  dataset: PipelineTopologyDataset;
  cellSize?: number;
  layerPrefix?: string;
}

export interface HealthResult {
  /** 全部管段评分 */
  scores: Array<{ pipeId: string; score: PipeHealthScore }>;
  /** 热力图聚合格 */
  heatmap: HeatmapCell[];
  /** 优先维护建议 */
  maintenance: Array<{ id: string; healthScore: number; lng: number; lat: number; label?: string }>;
  /** 计算耗时 */
  durationMs: number;
}

type Listener = (r: HealthResult) => void;

/**
 * 管线健康评估组件
 */
export class PipelineHealth {
  private map: CaoguoMap;
  private dataset: PipelineTopologyDataset;
  private cellSize: number;
  private layerPrefix: string;
  private listeners = new Set<Listener>();
  private lastResult: HealthResult | null = null;
  private layerIds: string[] = [];

  constructor(options: PipelineHealthOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.cellSize = options.cellSize ?? 500;
    this.layerPrefix = options.layerPrefix ?? 'cg-health';
  }

  /** 评估全网管线健康度 */
  evaluate(weights = DEFAULT_WEIGHTS): HealthResult {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));

    const scores = this.dataset.pipes.map((p) => {
      const input: PipeHealthInput = {
        installDate: p.properties?.installDate,
        material: p.properties?.material,
        failureCount: p.properties?.failureCount ?? 0,
        pressure: p.properties?.pressure,
        ratedPressure: p.properties?.ratedPressure,
        hasCathodicProtection: p.properties?.hasCathodicProtection ?? false,
        status: p.properties?.status,
      };
      return { pipeId: p.id, score: scorePipeHealth(input, weights) };
    });

    const points = scores.flatMap((s, i) => {
      const pipe = this.dataset.pipes[i];
      const from = nodeById.get(pipe.fromNode);
      const to = nodeById.get(pipe.toNode);
      if (!from || !to) return [];
      return [
        {
          lng: (from.lng + to.lng) / 2,
          lat: (from.lat + to.lat) / 2,
          healthScore: s.score.score,
        },
      ];
    });

    const heatmap = aggregateHeatmap(points, { cellSize: this.cellSize });
    const maintenance = prioritizeMaintenance(
      scores.flatMap((s, i) => {
        const pipe = this.dataset.pipes[i];
        const from = nodeById.get(pipe.fromNode);
        const to = nodeById.get(pipe.toNode);
        if (!from || !to) return [];
        return [
          {
            id: pipe.id,
            healthScore: s.score.score,
            lng: (from.lng + to.lng) / 2,
            lat: (from.lat + to.lat) / 2,
            label: pipe.id,
          },
        ];
      })
    );

    const durationMs =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;

    const result: HealthResult = { scores, heatmap, maintenance, durationMs };
    this.lastResult = result;
    this.renderHeatmap(result);
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

  /** 销毁 */
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
  getLastResult(): HealthResult | null {
    return this.lastResult;
  }

  private renderHeatmap(result: HealthResult): void {
    this.clear();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const data = heatmapToGeoJSON(result.heatmap);
    const sourceId = `${this.layerPrefix}-heat-src`;
    const layerId = `${this.layerPrefix}-heat-point`;
    if (!mlMap.getSource(sourceId)) mlMap.addSource(sourceId, data);
    try {
      mlMap.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'healthScore'],
            0, 1,
            50, 0.5,
            100, 0,
          ] as unknown,
          'heatmap-intensity': 1,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(34,197,94,0)',
            0.2, 'rgba(34,197,94,0.5)',
            0.5, 'rgba(245,158,11,0.7)',
            0.8, 'rgba(239,68,68,0.8)',
            1, 'rgba(127,29,29,0.9)',
          ] as unknown,
          'heatmap-radius': 25,
          'heatmap-opacity': 0.7,
        },
      });
      this.layerIds.push(layerId);
    } catch {
      // ignore
    }
  }
}
