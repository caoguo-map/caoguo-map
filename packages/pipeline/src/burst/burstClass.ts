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
    this.pushHistory(pipeId, result);
    this.render(result);
    for (const l of this.listeners) l(result);
    return result;
  }

  /** 清空所有受影响区域图层 */
  // ============================================================
  // B-7 推演历史（内存态；持久化由集成方实现，见 historyEntries()）
  // ============================================================

  /** 单条历史 */
  private historyStack: Array<{ pipeId: string; at: number; result: BurstSimulateResult }> = [];
  /** 历史栈上限（默认 20，超出淘汰最旧） */
  private historyLimit = 20;

  private pushHistory(pipeId: string, result: BurstSimulateResult): void {
    this.historyStack.push({ pipeId, at: Date.now(), result });
    if (this.historyStack.length > this.historyLimit) {
      this.historyStack.shift();
    }
  }

  /** B-7 历史条目列表（旧 → 新），供上层渲染回溯列表 */
  historyEntries(): Array<{ index: number; pipeId: string; at: number; result: BurstSimulateResult }> {
    return this.historyStack.map((h, index) => ({ index, pipeId: h.pipeId, at: h.at, result: h.result }));
  }

  /** B-7 回放第 index 条历史（重渲染到地图并返回结果） */
  restoreHistory(index: number): BurstSimulateResult | undefined {
    const entry = this.historyStack[index];
    if (!entry) return undefined;
    this.lastResult = entry.result;
    this.render(entry.result);
    for (const l of this.listeners) l(entry.result);
    return entry.result;
  }

  /** 设置历史栈上限 */
  setHistoryLimit(limit: number): void {
    this.historyLimit = Math.max(1, limit);
    while (this.historyStack.length > this.historyLimit) this.historyStack.shift();
  }

  /**
   * B-7 导出历史为 JSON 字符串（持久化介质无关：文件/IndexedDB/后端由集成方落盘）。
   * 结果含完整推演数据，可直接 `importHistory()` 还原。
   */
  exportHistory(): string {
    return JSON.stringify(
      this.historyStack.map((h) => ({ pipeId: h.pipeId, at: h.at, result: h.result }))
    );
  }

  /**
   * B-7 从 JSON 还原历史栈（替换现有历史）。
   * @returns 还原的条目数；格式非法时抛错
   */
  importHistory(json: string): number {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error('推演历史格式非法：期望数组');
    const restored = parsed.flatMap((e) => {
      if (!e || typeof e !== 'object') return [];
      const rec = e as Record<string, unknown>;
      if (typeof rec.pipeId !== 'string' || !rec.result) return [];
      return [
        {
          pipeId: rec.pipeId,
          at: typeof rec.at === 'number' ? rec.at : 0,
          result: rec.result as BurstSimulateResult,
        },
      ];
    });
    this.historyStack = restored;
    return restored.length;
  }

  /** 清空历史（不影响当前地图图层） */
  clearHistory(): void {
    this.historyStack = [];
  }

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
    this.historyStack = [];
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
