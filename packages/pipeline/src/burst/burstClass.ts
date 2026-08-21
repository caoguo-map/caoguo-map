/**
 * BurstSimulator 组件类（地图集成层）
 *
 * 包装 simulateBurst 纯函数 + 维护 MapLibre 图层状态。
 * 组件层职责：
 *  - 接收地图实例，添加受影响区域/管段/阀门、方案侧栏
 *  - 暴露 simulate()、clear() 等命令式 API
 *  - 可订阅结果事件（affectedNodes/valvePlan/impactArea）
 *
 * 注意：此组件不直接依赖 Vue/React（业务方可在任意框架中实例化）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import {
  simulateBurst,
  type BurstSimulateOptions,
  type BurstSimulateResult,
} from './burstCore';
import { toMapLayerData } from './impactArea';
import type { PipelineTopologyDataset, PipelineType } from '../types';

export interface BurstSimulatorOptions {
  map: CaoguoMap;
  dataset: PipelineTopologyDataset;
  /** 受影响管段样式（maplibre paint props） */
  affectedPipePaint?: Record<string, unknown>;
  /** 阀门隔离方案样式 */
  valvePaint?: Record<string, unknown>;
  /** 影响区域凸包样式 */
  hullPaint?: Record<string, unknown>;
  /** 受影响节点图标样式 */
  affectedNodePaint?: Record<string, unknown>;
  /** 推演情景 */
  scenario?: BurstSimulateOptions['scenario'];
  /** 该实例只处理指定管线类型（用于多管类地图） */
  pipelineType?: PipelineType;
  /** 层 ID 前缀（避免多实例冲突） */
  layerPrefix?: string;
}

export type BurstResult = BurstSimulateResult;

type Listener = (r: BurstSimulateResult) => void;

/**
 * 爆管推演组件（前端类）
 *
 * 用法：
 *   const sim = new BurstSimulator({ map, dataset });
 *   const result = sim.simulate('pipe-A12');
 *   // 受影响区域已添加到 map
 *   sim.clear();
 *   sim.destroy();
 */
export class BurstSimulator {
  private map: CaoguoMap;
  private dataset: PipelineTopologyDataset;
  private scenario: 'gas' | 'water' | 'drainage' | 'heating';
  private affectedPipePaint: Record<string, unknown>;
  private affectedNodePaint: Record<string, unknown>;
  private valvePaint: Record<string, unknown>;
  private hullPaint: Record<string, unknown>;
  private layerPrefix: string;
  private listeners = new Set<Listener>();
  private lastResult: BurstSimulateResult | null = null;
  private layerIds: string[] = [];

  constructor(options: BurstSimulatorOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.scenario = options.scenario ?? 'gas';
    this.affectedPipePaint = options.affectedPipePaint ?? {
      'line-color': '#ef4444',
      'line-width': 4,
      'line-opacity': 0.85,
      'line-blur': 1.5,
    };
    this.affectedNodePaint = options.affectedNodePaint ?? {
      'circle-radius': 6,
      'circle-color': '#ef4444',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    };
    this.valvePaint = options.valvePaint ?? {
      'circle-radius': 8,
      'circle-color': '#fbbf24',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#000000',
    };
    this.hullPaint = options.hullPaint ?? {
      'fill-color': '#ef4444',
      'fill-opacity': 0.15,
      'fill-outline-color': '#ef4444',
    };
    this.layerPrefix = options.layerPrefix ?? 'cg-burst';
  }

  /** 触发爆管推演 */
  simulate(pipeId: string, overrideOpts?: BurstSimulateOptions): BurstSimulateResult {
    const result = simulateBurst(this.dataset, pipeId, {
      scenario: overrideOpts?.scenario ?? this.scenario,
      skipClosedValves: overrideOpts?.skipClosedValves ?? true,
      maxAlternatives: overrideOpts?.maxAlternatives ?? 2,
    });
    this.lastResult = result;
    this.render(result);
    for (const l of this.listeners) l(result);
    return result;
  }

  /** 清空所有受影响区域图层 */
  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  /** 销毁并清空所有资源 */
  destroy(): void {
    this.clear();
    this.listeners.clear();
    this.lastResult = null;
  }

  /** 订阅推演结果 */
  onResult(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** 取最后一次结果 */
  getLastResult(): BurstSimulateResult | null {
    return this.lastResult;
  }

  // ------------------------------------------------------
  // 内部：把结果渲染为 MapLibre 图层
  // ------------------------------------------------------
  private render(result: BurstSimulateResult): void {
    this.clear();
    const layerData = toMapLayerData(result);
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;

    const prefix = this.layerPrefix;
    const sourcesToAdd: Array<{ id: string; data: unknown }> = [];
    const layersToAdd: Array<Record<string, unknown>> = [];

    if (layerData.hullPolygon) {
      sourcesToAdd.push({ id: `${prefix}-hull-src`, data: layerData.hullPolygon });
      layersToAdd.push({
        id: `${prefix}-hull-fill`,
        type: 'fill',
        source: `${prefix}-hull-src`,
        paint: this.hullPaint,
      });
    }

    sourcesToAdd.push({ id: `${prefix}-pipes-src`, data: layerData.affectedPipes });
    layersToAdd.push({
      id: `${prefix}-pipes-line`,
      type: 'line',
      source: `${prefix}-pipes-src`,
      paint: this.affectedPipePaint,
    });

    sourcesToAdd.push({ id: `${prefix}-nodes-src`, data: layerData.affectedNodes });
    layersToAdd.push({
      id: `${prefix}-nodes-pt`,
      type: 'circle',
      source: `${prefix}-nodes-src`,
      paint: this.affectedNodePaint,
    });

    for (const src of sourcesToAdd) {
      if (!mlMap.getSource(src.id)) mlMap.addSource(src.id, src.data as never);
    }
    for (const layer of layersToAdd) {
      try {
        mlMap.addLayer(layer);
        this.layerIds.push(layer.id as string);
      } catch {
        // ignore duplicate
      }
    }
  }
}
