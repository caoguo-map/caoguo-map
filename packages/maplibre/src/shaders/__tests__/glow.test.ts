import { describe, it, expect } from 'vitest';
import {
  glowPasses,
  projectSimple,
  buildGlowGeometry,
  type GlowLine,
} from '../glowGeometry';

describe('glowGeometry T6', () => {
  it('glowPasses 默认 4 遍，核心 opacity=1、外晕更宽更透明', () => {
    const passes = glowPasses(4, 1);
    expect(passes.length).toBe(4);
    // passes[0] 为核心（widthScale=1，opacity 最高）
    const core = passes[0];
    expect(core.widthScale).toBeCloseTo(1, 5);
    expect(core.opacity).toBeCloseTo(1, 5);
    // passes[last] 为最外晕（最宽，最透明）
    const halo = passes[passes.length - 1];
    expect(halo.widthScale).toBeGreaterThan(core.widthScale);
    expect(halo.opacity).toBeLessThan(core.opacity);
  });

  it('glowPasses 单遍退化为 widthScale=1/opacity=coreOpacity', () => {
    const p = glowPasses(1, 0.8);
    expect(p[0].widthScale).toBeCloseTo(1, 5);
    expect(p[0].opacity).toBeCloseTo(0.8, 5);
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

  it('buildGlowGeometry 顶点数 = Σ(segments*2)', () => {
    const lines: GlowLine[] = [
      { group: 'pipe', coordinates: [[114.3, 30.5], [114.31, 30.51], [114.32, 30.52]] },
      { group: 'road', coordinates: [[114.3, 30.5], [114.4, 30.6]] },
    ];
    const geo = buildGlowGeometry(lines, { passes: 4 });
    // 第一条 2 segment，第二条 1 segment → 3*2=6 顶点
    expect(geo.vertexCount).toBe(6);
    expect(geo.lines.length).toBe(2);
    expect(geo.passes.length).toBe(4);
    // 投影后坐标在 [-1,1]
    for (const l of geo.lines) {
      for (const [x, y] of l.points) {
        expect(x).toBeGreaterThanOrEqual(-1);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(-1);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('空线集合 vertexCount=0', () => {
    const geo = buildGlowGeometry([]);
    expect(geo.vertexCount).toBe(0);
  });
});
