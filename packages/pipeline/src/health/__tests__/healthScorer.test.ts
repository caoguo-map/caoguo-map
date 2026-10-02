import { describe, it, expect } from 'vitest';
import { scorePipeHealth, scorePipes, DEFAULT_WEIGHTS } from '../healthScorer';
import type { PipeHealthInput } from '../healthScorer';

/**
 * H-5 管段健康评分权重（QA 审计 P1）：评分权重可配置此前零测试——
 * 改坏权重不会破坏任何测试。本组用例固化：权重归一、分维查表、状态惩罚、等级分档。
 */

const yearsAgo = (y: number) => new Date(Date.now() - y * 365.25 * 86400_000).toISOString();

describe('H-5 scorePipeHealth 权重与评分', () => {
  it('默认权重和为 1（否则总分口径漂移）', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('age 分维查表：2 年 → 100，30 年 → 40', () => {
    const young = scorePipeHealth({ installDate: yearsAgo(2) });
    const old = scorePipeHealth({ installDate: yearsAgo(30) });
    expect(young.dimensions.age.score).toBe(100);
    expect(old.dimensions.age.score).toBe(40);
    expect(young.score).toBeGreaterThan(old.score);
  });

  it('soil 分维：腐蚀 0 → 100，腐蚀 1 → 0；缺省按 0.5', () => {
    expect(scorePipeHealth({ soilCorrosion: 0 }).dimensions.soil.score).toBe(100);
    expect(scorePipeHealth({ soilCorrosion: 1 }).dimensions.soil.score).toBe(0);
    expect(scorePipeHealth({}).dimensions.soil.score).toBe(50); // 无数据按中等
  });

  it('history 分维：0 次故障 → 100，≥4 次 → 0', () => {
    expect(scorePipeHealth({ failureCount: 0 }).dimensions.history.score).toBe(100);
    expect(scorePipeHealth({ failureCount: 4 }).dimensions.history.score).toBe(0);
  });

  it('protection 分维：有阴极保护 90 / 无 30 / 未知 50', () => {
    expect(scorePipeHealth({ hasCathodicProtection: true }).dimensions.protection.score).toBe(90);
    expect(scorePipeHealth({ hasCathodicProtection: false }).dimensions.protection.score).toBe(30);
    expect(scorePipeHealth({}).dimensions.protection.score).toBe(50);
  });

  it('状态惩罚：damaged 约为正常一半，abandoned 直接 0 分 critical', () => {
    const base: PipeHealthInput = { installDate: yearsAgo(2), material: 'steel' };
    const normal = scorePipeHealth(base);
    const damaged = scorePipeHealth({ ...base, status: 'damaged' });
    const abandoned = scorePipeHealth({ ...base, status: 'abandoned' });
    expect(damaged.score).toBeLessThan(normal.score);
    expect(Math.abs(damaged.score - normal.score * 0.5)).toBeLessThanOrEqual(1);
    expect(abandoned.score).toBe(0);
    expect(abandoned.level).toBe('critical');
  });

  it('等级分档：理想输入 excellent，劣化输入落入对应档', () => {
    const ideal = scorePipeHealth({ installDate: yearsAgo(1), hasCathodicProtection: true, failureCount: 0, soilCorrosion: 0 });
    expect(ideal.level).toBe('excellent');
    const bad = scorePipeHealth({ installDate: yearsAgo(50), failureCount: 5, soilCorrosion: 1, hasCathodicProtection: false });
    expect(['poor', 'critical']).toContain(bad.level);
  });

  it('自定义权重生效且反映到 dimensions.weight', () => {
    const custom = { ...DEFAULT_WEIGHTS, age: 0.5, material: 0.1, soil: 0.1, history: 0.1, pressure: 0.1, protection: 0.1 };
    const r = scorePipeHealth({ installDate: yearsAgo(1) }, custom);
    expect(r.dimensions.age.weight).toBe(0.5);
    // age 满分 100 × 0.5 = 50 分贡献，总效应与默认权重不同
    expect(r.score).not.toBe(scorePipeHealth({ installDate: yearsAgo(1) }).score);
  });

  it('scorePipes 批量入口：数量一致且逐项调用', () => {
    const inputs: PipeHealthInput[] = [{ installDate: yearsAgo(2) }, { installDate: yearsAgo(30) }];
    const out = scorePipes(inputs);
    expect(out).toHaveLength(2);
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });
});
