import { describe, it, expect } from 'vitest';
import {
  glowPasses,
  projectSimple,
  buildGlowGeometry,
  type GlowLine,
} from '../glowGeometry';

describe('glowGeometry T6', () => {
  it('glowPasses 默认 4 遍，核心最窄最浓、外晕更宽更透明', () => {
    const passes = glowPasses(4, 3);
    expect(passes.length).toBe(4);
    // passes[0] 为核心（最窄，opacity 最高）
    const core = passes[0];
    expect(core.width).toBeCloseTo(3, 5);
    expect(core.opacity).toBeCloseTo(1, 5);
    // passes[last] 为最外晕（最宽，最透明）
    const halo = passes[passes.length - 1];
    expect(halo.width).toBeGreaterThan(core.width);
    expect(halo.opacity).toBeLessThan(core.opacity);
  });

  it('glowPasses 单遍退化为 width=baseWidth/opacity≈1', () => {
    const p = glowPasses(1, 5);
    expect(p[0].width).toBeCloseTo(5, 5);
    expect(p[0].opacity).toBeCloseTo(1, 5);
  });

  it('projectSimple 经度→x 线性、赤道 y≈0', () => {
    expect(projectSimple(0, 0)[0]).toBeCloseTo(0, 5);
    expect(projectSimple(0, 0)[1]).toBeCloseTo(0, 5);
    expect(projectSimple(180, 0)[0]).toBeCloseTo(1, 5);
    expect(projectSimple(-180, 0)[0]).toBeCloseTo(-1, 5);
  });

  it('projectSimple 高纬度被钳制在 [-1,1]', () => {
    const y = projectSimple(0, 89)[1];
    expect(y).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThan(0);
  });

  it('buildGlowGeometry 顶点数 = Σ(segments*6) 每遍', () => {
    const lines: GlowLine[] = [
      { group: 'pipe', coordinates: [[114.3, 30.5], [114.31, 30.51], [114.32, 30.52]] },
      { group: 'road', coordinates: [[114.3, 30.5], [114.4, 30.6]] },
    ];
    const geo = buildGlowGeometry(lines, { passes: 4 });
    // 第一条 2 segment，第二条 1 segment → 3 segment；每遍每 segment 6 顶点
    const segCount = 3;
    expect(geo.passes.length).toBe(4);
    expect(geo.passRanges.length).toBe(4);
    for (const range of geo.passRanges) {
      expect(range.count).toBe(segCount * 6);
    }
    // 总顶点数 = 每遍顶点之和
    const total = geo.passRanges.reduce((s, r) => s + r.count, 0);
    expect(geo.vertices.length).toBe(total * geo.stride);
    // 投影后坐标在 [-1,1]
    for (let i = 0; i < geo.vertices.length; i += geo.stride) {
      const x = geo.vertices[i];
      const y = geo.vertices[i + 1];
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it('空线集合 顶点数为 0', () => {
    const geo = buildGlowGeometry([]);
    expect(geo.vertices.length).toBe(0);
    for (const range of geo.passRanges) expect(range.count).toBe(0);
  });

  it('buildGlowGeometry 顶点跨距为 6（含 groupIndex 属性）', () => {
    const geo = buildGlowGeometry([]);
    expect(geo.stride).toBe(6);
  });

  it('多分组：groups 去重且按首次出现顺序，renderGroups 覆盖每遍每分组', () => {
    const lines: GlowLine[] = [
      { group: 'road', coordinates: [[114.3, 30.5], [114.4, 30.6]] },
      { group: 'pipe', coordinates: [[114.3, 30.5], [114.31, 30.51], [114.32, 30.52]] },
      { group: 'water', coordinates: [[114.2, 30.5], [114.25, 30.55]] },
      { group: 'pipe', coordinates: [[114.35, 30.6], [114.36, 30.61]] },
    ];
    const geo = buildGlowGeometry(lines, { passes: 3 });
    expect(geo.groups).toEqual(['road', 'pipe', 'water']);

    // 每遍 × 每非空分组都有对应区间
    expect(geo.renderGroups.length).toBe(3 * 3);
    for (const rg of geo.renderGroups) {
      expect(geo.passes[rg.passIndex]).toBeDefined();
      expect(geo.groups).toContain(rg.group);
      expect(rg.count).toBeGreaterThan(0);
      // 区间顶点数必为 6 的倍数（每段 6 顶点）
      expect(rg.count % 6).toBe(0);
    }
    // 所有 renderGroup 顶点总数 = 顶点总数 / stride
    const total = geo.renderGroups.reduce((s, r) => s + r.count, 0);
    expect(total).toBe(geo.vertices.length / geo.stride);
  });

  it('顶点携带的 groupIndex 与 groups 顺序一致', () => {
    const lines: GlowLine[] = [
      { group: 'a', coordinates: [[114.3, 30.5], [114.4, 30.6]] },
      { group: 'b', coordinates: [[114.3, 30.5], [114.31, 30.51]] },
    ];
    const geo = buildGlowGeometry(lines, { passes: 2 });
    // 循环顺序为 for pass { for group { for line } }，
    // 2 遍 × (a 1段, b 1段) = 4 段，每段 6 顶点，groupIndex 依次为 [0,1,0,1]。
    const expectSeq = [0, 1, 0, 1];
    for (let s = 0; s < expectSeq.length; s++) {
      const base = s * 6 * geo.stride;
      for (let k = 0; k < 6; k++) {
        const gi = geo.vertices[base + k * geo.stride + 5];
        expect(gi).toBe(expectSeq[s]);
      }
    }
  });
});
