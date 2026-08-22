/**
 * DamOperation 组件 - 水库联合调度（算法 + 渲染）封装
 *
 * 整合 damCore（蓄水率 / 库容状态 / 下游水位变化 / 调度模拟）与 DamRender（闸站控制面板），
 * 对外暴露 README 承诺的 `DamOperation` 类。
 *
 * 用法：
 *   const dam = new DamOperation({ map, dataset, onGateSelect: (f) => showPanel(f) });
 *   dam.renderGates();                 // 渲染闸站控制面板
 *   const schedule = dam.simulate({ outflows: { 'res-a': 50 } }); // 调度模拟
 *   dam.setGateFlow('res-a', 80);      // 调整某闸出库流量并重算
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import type { WaterDataset, WaterFeature, DamScheduleResult, DamScheduleInput } from '../types';
import { simulateDamSchedule, updateStorageRate, reservoirStatus, downstreamLevelChange } from './damCore';
import { DamRender, getGateDetail } from './DamRender';

export interface DamOperationOptions {
  map: CaoguoMap;
  dataset: WaterDataset;
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 闸站点击回调 */
  onGateSelect?: (feature: WaterFeature) => void;
}

export class DamOperation {
  private map: CaoguoMap;
  private dataset: WaterDataset;
  private layerPrefix: string;
  private onGateSelect?: (feature: WaterFeature) => void;
  private gates: DamRender;
  /** 当前出库流量方案（m³/s），key = 闸站/水库 id */
  private outflows: Record<string, number> = {};

  constructor(options: DamOperationOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-dam';
    this.onGateSelect = options.onGateSelect;
    this.gates = new DamRender({
      map: options.map,
      dataset: options.dataset,
      layerPrefix: this.layerPrefix,
      onGateSelect: options.onGateSelect,
    });
  }

  /** 渲染闸站控制面板（R-3） */
  renderGates(): void {
    this.gates.render();
  }

  /** 运行调度模拟（基于当前 outflows 方案） */
  simulate(input?: Partial<DamScheduleInput>): DamScheduleResult {
    const scheduleInput: DamScheduleInput = { outflows: input?.outflows ?? this.outflows };
    return simulateDamSchedule(this.dataset, scheduleInput);
  }

  /** 设置某闸/水库出库流量并重算调度结果 */
  setGateFlow(gateId: string, outflow: number): DamScheduleResult {
    this.outflows[gateId] = outflow;
    return this.simulate();
  }

  /** 提取单个闸站详情（纯函数，可直接展示控制面板） */
  getGate(gateId: string): WaterFeature | undefined {
    return this.dataset.features.find((f) => f.id === gateId && f.kind === 'gate');
  }

  /** 便捷：取闸站结构化详情 */
  gateDetail(gateId: string) {
    const f = this.getGate(gateId);
    return f ? getGateDetail(f) : undefined;
  }

  /** 计算某水库当前蓄水率（钳制在 [0,1]） */
  storageRate(reservoirId: string, deltaOutflow: number): number {
    const f = this.dataset.features.find((x) => x.id === reservoirId && x.kind === 'reservoir');
    const base = f?.properties?.storageRate ?? 0.5;
    return updateStorageRate(base, deltaOutflow);
  }

  /** 水库状态：discharging / storing / balanced */
  status(storageRateValue: number): string {
    return reservoirStatus(storageRateValue);
  }

  /** 下游某点水位变化（距离越远影响越小） */
  downstreamImpact(outflow: number, distanceKm: number): number {
    return downstreamLevelChange(outflow, distanceKm);
  }

  clear(): void {
    this.gates.clear();
  }
}
