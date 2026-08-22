import { describe, it, expect } from 'vitest';
import { scorePipeHealth, DEFAULT_WEIGHTS } from '../healthScorer';
import { aggregateHeatmap, prioritizeMaintenance } from '../riskHeatmap';

describe('health/healthScorer', () => {
  it('新建 HDPE 管 + 阴保 → excellent', () => {
    const r = scorePipeHealth({
      installDate: new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000).toISOString(),
      material: 'hdpe',
      hasCathodicProtection: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.level).toBe('excellent');
  });

  it('40 年铸铁管 + 无阴保 → 风险高', () => {
    const r = scorePipeHealth({
      installDate: new Date(Date.now() - 45 * 365 * 24 * 3600 * 1000).toISOString(),
      material: 'cast_iron',
      hasCathodicProtection: false,
    });
    expect(r.score).toBeLessThan(70);
    expect(['fair', 'poor', 'critical']).toContain(r.level);
  });

  it('damaged 状态额外扣分 50%', () => {
    const base = scorePipeHealth({
      installDate: new Date(Date.now() - 5 * 365 * 24 * 3600 * 1000).toISOString(),
      material: 'steel',
    });
    const damaged = scorePipeHealth({
      installDate: new Date(Date.now() - 5 * 365 * 24 * 3600 * 1000).toISOString(),
      material: 'steel',
      status: 'damaged',
    });
    expect(damaged.score).toBeLessThan(base.score / 2 + 1);
  });

  it('6 个维度都返回 reason', () => {
    const r = scorePipeHealth({
      material: 'pe',
      installDate: new Date(Date.now() - 8 * 365 * 24 * 3600 * 1000).toISOString(),
    });
    expect(r.dimensions.age.reason).toBeTruthy();
    expect(r.dimensions.material.reason).toBeTruthy();
    expect(r.dimensions.soil.reason).toBeTruthy();
    expect(r.dimensions.history.reason).toBeTruthy();
    expect(r.dimensions.pressure.reason).toBeTruthy();
    expect(r.dimensions.protection.reason).toBeTruthy();
  });

  it('权重和 = 1', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe('health/riskHeatmap', () => {
  it('aggregateHeatmap 同区域多个点聚合为一个 cell', () => {
    const result = aggregateHeatmap([
      { lng: 114.0, lat: 30.0, healthScore: 80 },
      { lng: 114.001, lat: 30.001, healthScore: 60 },
      { lng: 114.002, lat: 30.002, healthScore: 50 },
    ], { cellSize: 1000 });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].pipeCount).toBeGreaterThanOrEqual(1);
  });

  it('prioritizeMaintenance 排序: 健康分低的优先', () => {
    const list = prioritizeMaintenance([
      { id: 'a', healthScore: 80, lng: 0, lat: 0 },
      { id: 'b', healthScore: 20, lng: 0, lat: 0 },
      { id: 'c', healthScore: 50, lng: 0, lat: 0 },
    ]);
    expect(list[0].id).toBe('b');
    expect(list[1].id).toBe('c');
    expect(list[2].id).toBe('a');
  });

  it('聚合方式 min/max/average 影响结果', () => {
    const min = aggregateHeatmap([
      { lng: 114, lat: 30, healthScore: 80 },
      { lng: 114.001, lat: 30.001, healthScore: 40 },
    ], { cellSize: 1000, aggregation: 'min' });
    const avg = aggregateHeatmap([
      { lng: 114, lat: 30, healthScore: 80 },
      { lng: 114.001, lat: 30.001, healthScore: 40 },
    ], { cellSize: 1000, aggregation: 'average' });
    expect(min[0].healthScore).toBe(40);
    expect(avg[0].healthScore).toBe(60);
  });
});

describe('health 两维接入（failureCount / hasCathodicProtection）', () => {
  const iso = (years: number) =>
    new Date(Date.now() - years * 365 * 24 * 3600 * 1000).toISOString();

  it('failureCount 越高 history 维分数越低', () => {
    const a = scorePipeHealth({ material: 'steel', installDate: iso(10), failureCount: 0 });
    const b = scorePipeHealth({ material: 'steel', installDate: iso(10), failureCount: 8 });
    expect(b.dimensions.history.score).toBeLessThan(a.dimensions.history.score);
  });

  it('hasCathodicProtection=true 提升 protection 维分数', () => {
    const a = scorePipeHealth({ material: 'steel', installDate: iso(10), hasCathodicProtection: false });
    const b = scorePipeHealth({ material: 'steel', installDate: iso(10), hasCathodicProtection: true });
    expect(b.dimensions.protection.score).toBeGreaterThan(a.dimensions.protection.score);
  });

  it('两维默认值（缺失字段）不破坏评分', () => {
    // 数据集未提供时默认 failureCount=0 / hasCathodicProtection=false
    const r = scorePipeHealth({ material: 'steel', installDate: iso(10) });
    expect(r.dimensions.history.score).toBeGreaterThan(0);
    expect(r.dimensions.protection.score).toBeGreaterThan(0);
  });
});
