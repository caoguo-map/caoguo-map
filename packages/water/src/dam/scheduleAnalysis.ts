/**
 * 调度方案对比与甘特图数据（PRD phase-2-grid-water §4.3 DO-4 / DO-5 的数据层）
 *
 * - DO-4 多方案对比：`compareDamSchedules()` 把多个调度方案跑一遍
 *   `simulateDamSchedule()`，输出「水库 × 方案」「水位站 × 方案」两张对比矩阵，
 *   并支持按口径排序（下游扰动最小 / 蓄水改善最大）。**不擅自宣布"最优方案"**，
 *   排名口径由调用方选择。
 * - DO-5 调度甘特图：`simulateDamTimeline()` 把出库调整按时间步推进（复用
 *   `updateStorageRate()`），得到各水库蓄水率时间序列；`buildDamGantt()` 把序列
 *   按蓄泄状态切分成甘特段。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { WaterDataset } from '../types';
import { simulateDamSchedule, updateStorageRate, reservoirStatus } from './damCore';
import type { DamScheduleInput, DamScheduleResult } from '../types';

// ============================================================
// DO-4 多方案对比
// ============================================================

/** 单个对比方案 */
export interface DamPlan {
  /** 方案名（如「现状」「加大泄洪」「蓄水保水」） */
  name: string;
  /** 各水库出库流量调整（同 `DamScheduleInput.outflows`） */
  outflows: Record<string, number>;
}

/** 方案对比结果 */
export interface DamPlanComparison {
  /** 各方案推演结果（顺序与输入一致） */
  plans: Array<{ name: string; result: DamScheduleResult }>;
  /**
   * 水库 × 方案 蓄水率矩阵：`matrix.storageRate[reservoirId][planIndex]`
   */
  matrix: {
    storageRate: Record<string, number[]>;
    levelChange: Record<string, number[]>;
  };
  /**
   * 排序后的方案名（优 → 劣）。
   * - `minDownstreamChange`：下游水位站扰动绝对值之和最小（对下游最友好）
   * - `maxStorageGain`：水库蓄水率改善之和最大（保水优先）
   */
  ranking: Array<{ name: string; score: number }>;
}

/**
 * 多方案对比（DO-4）
 * @param rankBy 排名口径（默认 `minDownstreamChange`）
 */
export function compareDamSchedules(
  dataset: WaterDataset,
  plans: DamPlan[],
  rankBy: 'minDownstreamChange' | 'maxStorageGain' = 'minDownstreamChange'
): DamPlanComparison {
  const ran = plans.map((p) => ({ name: p.name, result: simulateDamSchedule(dataset, { outflows: p.outflows }) }));

  const storageRate: Record<string, number[]> = {};
  const levelChange: Record<string, number[]> = {};
  ran.forEach(({ result }, i) => {
    for (const rs of result.reservoirStates) {
      (storageRate[rs.reservoirId] ??= [])[i] = rs.storageRate;
    }
    for (const dl of result.downstreamLevels) {
      (levelChange[dl.stationId] ??= [])[i] = dl.levelChange;
    }
  });

  const scoreOf = (i: number): number => {
    if (rankBy === 'maxStorageGain') {
      // 蓄水率改善之和（相对初始值）
      let gain = 0;
      const reservoirs = dataset.features.filter((f) => f.kind === 'reservoir');
      reservoirs.forEach((r, ri) => {
        const init = r.properties?.storageRate ?? 0.5;
        const after = storageRate[r.id]?.[i] ?? init;
        gain += after - init;
      });
      return Math.round(gain * 1000) / 1000;
    }
    // 下游扰动绝对值之和
    let sum = 0;
    for (const arr of Object.values(levelChange)) {
      sum += Math.abs(arr[i] ?? 0);
    }
    return Math.round(sum * 1000) / 1000;
  };

  const ranking = ran
    .map(({ name }, i) => ({ name, score: scoreOf(i) }))
    .sort((a, b) =>
      rankBy === 'maxStorageGain' ? b.score - a.score : a.score - b.score
    );

  return { plans: ran, matrix: { storageRate, levelChange }, ranking };
}

// ============================================================
// DO-5 调度甘特图
// ============================================================

/** 时间步推演结果 */
export interface DamTimeline {
  /** 时间步数（含 t=0 初始状态） */
  steps: number;
  /** 每步间隔（分钟） */
  stepMinutes: number;
  /** 各水库序列：`series[reservoirId][stepIndex]` */
  series: Record<
    string,
    Array<{ step: number; elapsedMin: number; storageRate: number; status: 'storing' | 'discharging' | 'balanced' }>
  >;
  /** 下游水位站序列：`levels[stationId][stepIndex]` */
  levels: Record<string, Array<{ step: number; elapsedMin: number; level: number; levelChange: number }>>;
}

/**
 * 时间步推演（DO-5 数据层）：把出库调整按 stepMinutes 逐步推进蓄水率。
 * 简化模型：每步等量应用 outflows（不模拟闸门启闭过程）。
 */
export function simulateDamTimeline(
  dataset: WaterDataset,
  schedule: DamScheduleInput,
  opts: { steps?: number; stepMinutes?: number } = {}
): DamTimeline {
  const steps = Math.max(1, opts.steps ?? 24);
  const stepMinutes = opts.stepMinutes ?? 60;

  const reservoirs = dataset.features.filter((f) => f.kind === 'reservoir');
  const rates = new Map(reservoirs.map((r) => [r.id, r.properties?.storageRate ?? 0.5] as const));

  const series: DamTimeline['series'] = {};
  const levels: DamTimeline['levels'] = {};

  // t=0 初始状态（无调整）
  snapshotWithRates(dataset, schedule, rates, 0, stepMinutes, series, levels);

  for (let step = 1; step <= steps; step += 1) {
    for (const r of reservoirs) {
      const delta = schedule.outflows[r.id] ?? 0;
      rates.set(r.id, updateStorageRate(rates.get(r.id)!, delta, stepMinutes / 60));
    }
    snapshotWithRates(dataset, schedule, rates, step, stepMinutes, series, levels);
  }

  return { steps: steps + 1, stepMinutes, series, levels };
}

/** 用当前蓄水率快照生成一步序列（内部） */
function snapshotWithRates(
  dataset: WaterDataset,
  schedule: DamScheduleInput,
  rates: Map<string, number>,
  step: number,
  stepMinutes: number,
  series: DamTimeline['series'],
  levels: DamTimeline['levels']
): void {
  for (const r of dataset.features.filter((f) => f.kind === 'reservoir')) {
    const rate = rates.get(r.id)!;
    (series[r.id] ??= []).push({
      step,
      elapsedMin: step * stepMinutes,
      storageRate: Math.round(rate * 1000) / 1000,
      status: reservoirStatus(rate),
    });
  }
  const partial = simulateDamSchedule(
    {
      ...dataset,
      features: dataset.features.map((f) =>
        f.kind === 'reservoir' && rates.has(f.id)
          ? { ...f, properties: { ...f.properties, storageRate: rates.get(f.id) } }
          : f
      ),
    },
    schedule
  );
  for (const dl of partial.downstreamLevels) {
    (levels[dl.stationId] ??= []).push({
      step,
      elapsedMin: step * stepMinutes,
      level: Math.round(dl.level * 1000) / 1000,
      levelChange: Math.round(dl.levelChange * 1000) / 1000,
    });
  }
}

/** 甘特段（同状态连续区间） */
export interface DamGanttSegment {
  status: 'storing' | 'discharging' | 'balanced';
  /** 起始步（含） */
  fromStep: number;
  /** 结束步（含） */
  toStep: number;
  /** 起止时间（分钟） */
  fromMin: number;
  toMin: number;
}

/** 甘特行 */
export interface DamGanttRow {
  reservoirId: string;
  segments: DamGanttSegment[];
}

/**
 * 把时间步序列切分为甘特段（DO-5）：状态连续的相邻步合并为一段。
 * @param timeline `simulateDamTimeline()` 的结果
 */
export function buildDamGantt(timeline: DamTimeline): DamGanttRow[] {
  const rows: DamGanttRow[] = [];
  for (const [reservoirId, points] of Object.entries(timeline.series)) {
    const segments: DamGanttSegment[] = [];
    for (const p of points) {
      const last = segments[segments.length - 1];
      if (last && last.status === p.status) {
        last.toStep = p.step;
        last.toMin = p.elapsedMin;
      } else {
        segments.push({
          status: p.status,
          fromStep: p.step,
          toStep: p.step,
          fromMin: p.elapsedMin,
          toMin: p.elapsedMin,
        });
      }
    }
    rows.push({ reservoirId, segments });
  }
  return rows;
}
