import { describe, it, expect } from 'vitest';
import type { WaterDataset } from '../../types';
import {
  compareDamSchedules,
  simulateDamTimeline,
  buildDamGantt,
} from '../scheduleAnalysis';

const dataset: WaterDataset = {
  features: [
    {
      id: 'res-1',
      kind: 'reservoir',
      name: '夏家寺水库',
      lng: 114.32,
      lat: 30.52,
      properties: { storageRate: 0.6, capacity: 12000 },
    },
    {
      id: 'res-2',
      kind: 'reservoir',
      name: '梅店水库',
      lng: 114.35,
      lat: 30.55,
      properties: { storageRate: 0.5, capacity: 8000 },
    },
    {
      id: 'ws-1',
      kind: 'waterStation',
      name: '汉口水位站',
      lng: 114.3,
      lat: 30.5,
      properties: { waterLevel: 26.0, warningLevel: 27.3 },
    },
  ],
};

describe('compareDamSchedules（DO-4 多方案对比）', () => {
  const plans = [
    { name: '现状', outflows: {} },
    { name: '加大泄洪', outflows: { 'res-1': 50, 'res-2': 30 } },
    { name: '蓄水保水', outflows: { 'res-1': -20, 'res-2': -10 } },
  ];

  it('为每个方案生成推演结果与两张对比矩阵', () => {
    const r = compareDamSchedules(dataset, plans);
    expect(r.plans.length).toBe(3);
    // 水库矩阵：2 水库 × 3 方案
    expect(r.matrix.storageRate['res-1']).toHaveLength(3);
    expect(r.matrix.storageRate['res-2']).toHaveLength(3);
    // 水位站矩阵
    expect(r.matrix.levelChange['ws-1']).toHaveLength(3);
  });

  it('矩阵值与单方案推演一致', () => {
    const r = compareDamSchedules(dataset, plans);
    // 加大泄洪（index 1）→ res-1 蓄水率下降（0.6 - 50*0.01 = 0.1）
    expect(r.matrix.storageRate['res-1'][1]).toBeCloseTo(0.1, 5);
    // 现状（index 0）→ 不变
    expect(r.matrix.storageRate['res-1'][0]).toBeCloseTo(0.6, 5);
  });

  it('minDownstreamChange 排名：现状（零扰动）最优', () => {
    const r = compareDamSchedules(dataset, plans, 'minDownstreamChange');
    expect(r.ranking[0].name).toBe('现状');
    expect(r.ranking[0].score).toBe(0);
  });

  it('maxStorageGain 排名：蓄水保水最优', () => {
    const r = compareDamSchedules(dataset, plans, 'maxStorageGain');
    expect(r.ranking[0].name).toBe('蓄水保水');
  });

  it('空方案列表返回空结果', () => {
    const r = compareDamSchedules(dataset, []);
    expect(r.plans).toEqual([]);
    expect(r.ranking).toEqual([]);
  });
});

describe('simulateDamTimeline + buildDamGantt（DO-5 甘特图）', () => {
  const schedule = { outflows: { 'res-1': 80 } }; // 大量泄洪：0.6 → 每小时 -0.8×0.01

  it('时间步序列覆盖 t=0..N，蓄水率单调下降', () => {
    const tl = simulateDamTimeline(dataset, schedule, { steps: 4, stepMinutes: 60 });
    expect(tl.steps).toBe(5); // 含 t=0
    const series = tl.series['res-1'];
    expect(series.length).toBe(5);
    expect(series[0].storageRate).toBeCloseTo(0.6, 5);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i].storageRate).toBeLessThanOrEqual(series[i - 1].storageRate);
    }
    // elapsedMin 按步长推进
    expect(series[4].elapsedMin).toBe(240);
  });

  it('蓄水率钳制在 [0,1]（不会泄成负数）', () => {
    const tl = simulateDamTimeline(dataset, schedule, { steps: 100, stepMinutes: 60 });
    const last = tl.series['res-1'][tl.series['res-1'].length - 1];
    expect(last.storageRate).toBeGreaterThanOrEqual(0);
    expect(last.storageRate).toBeLessThanOrEqual(1);
  });

  it('甘特段覆盖全部时间步且状态连续段合并', () => {
    const tl = simulateDamTimeline(dataset, schedule, { steps: 10, stepMinutes: 60 });
    const rows = buildDamGantt(tl);
    expect(rows.map((r) => r.reservoirId).sort()).toEqual(['res-1', 'res-2']);

    for (const row of rows) {
      const total = row.segments.reduce((s, seg) => s + (seg.toStep - seg.fromStep + 1), 0);
      expect(total).toBe(tl.steps); // 段并集覆盖所有步
      // 段之间不重叠且有序
      for (let i = 1; i < row.segments.length; i += 1) {
        expect(row.segments[i].fromStep).toBe(row.segments[i - 1].toStep + 1);
      }
    }
  });

  it('大泄洪会把水库从 balanced 推到 storing（低库容）', () => {
    const tl = simulateDamTimeline(dataset, schedule, { steps: 50, stepMinutes: 60 });
    const statuses = tl.series['res-1'].map((p) => p.status);
    expect(statuses[0]).toBe('balanced'); // 0.6
    expect(statuses[statuses.length - 1]).toBe('storing'); // 已泄到 ≤0.3
  });

  it('甘特段时间（分钟）与步长一致', () => {
    const tl = simulateDamTimeline(dataset, schedule, { steps: 3, stepMinutes: 30 });
    const row = buildDamGantt(tl).find((r) => r.reservoirId === 'res-1')!;
    const last = row.segments[row.segments.length - 1];
    expect(last.toMin).toBe(90);
  });
});
