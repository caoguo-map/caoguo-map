import { describe, it, expect } from 'vitest';
import {
  analyzePerformance,
  analyzeTiles,
  detectMemoryLeak,
  suggestOptimizations,
  diagnose,
} from '../aiDebug';

describe('ai/debug', () => {
  it('analyzePerformance 检测低帧率', () => {
    const issues = analyzePerformance({ fps: 20 });
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('analyzePerformance 检测 Draw call 过多', () => {
    const issues = analyzePerformance({ drawCalls: 150 });
    expect(issues.some((i) => i.title.includes('Draw call'))).toBe(true);
  });

  it('analyzeTiles 计算命中率', () => {
    const r = analyzeTiles({ requested: 100, cached: 80, totalLoadMs: 5000 });
    expect(r.hitRate).toBeCloseTo(0.8);
    expect(r.avgLoadMs).toBeCloseTo(50);
  });

  it('analyzeTiles 检测瓦片过载', () => {
    const r = analyzeTiles({ requested: 300, cached: 0, totalLoadMs: 0 });
    expect(r.overloaded).toBe(true);
  });

  it('detectMemoryLeak 检测持续增长', () => {
    const snapshots = [
      { timestamp: 0, bytes: 100 },
      { timestamp: 1000, bytes: 120 },
      { timestamp: 2000, bytes: 140 },
    ];
    const r = detectMemoryLeak(snapshots);
    expect(r.suspectedLeak).toBe(true);
    expect(r.growthRate).toBeGreaterThan(0);
  });

  it('detectMemoryLeak 不误报波动', () => {
    const snapshots = [
      { timestamp: 0, bytes: 100 },
      { timestamp: 1000, bytes: 80 },
      { timestamp: 2000, bytes: 120 },
    ];
    const r = detectMemoryLeak(snapshots);
    expect(r.suspectedLeak).toBe(false);
  });

  it('suggestOptimizations 规则匹配', () => {
    const s = suggestOptimizations({ requested: 300, drawCalls: 150 });
    expect(s.some((x) => x.id === 'tile_overload')).toBe(true);
    expect(s.some((x) => x.id === 'shader_complex')).toBe(true);
  });

  it('diagnose 汇总诊断', () => {
    const r = diagnose({
      perf: { fps: 20, drawCalls: 150 },
      tiles: { requested: 300, cached: 100, totalLoadMs: 10000 },
      memory: [
        { timestamp: 0, bytes: 100 },
        { timestamp: 1000, bytes: 150 },
        { timestamp: 2000, bytes: 200 },
      ],
    });
    expect(r.perfIssues.length).toBeGreaterThan(0);
    expect(r.tiles!.overloaded).toBe(true);
    expect(r.memory!.suspectedLeak).toBe(true);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
