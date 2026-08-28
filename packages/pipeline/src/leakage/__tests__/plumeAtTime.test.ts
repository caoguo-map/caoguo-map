import { describe, it, expect } from 'vitest';
import { plumeAtTime } from '../gaussianPlume';

const source = { lng: 114.3, lat: 30.5 };
const params = {
  windDirection: 0,
  windSpeed: 3, // 3 m/s
  leakRate: 2,
  releaseHeight: 2,
  stability: 'D' as const,
};

describe('plumeAtTime（L-2 扩散动画数据层）', () => {
  it('t=0 时烟羽尚未形成：等值线为空、影响距离为 0', () => {
    const r = plumeAtTime(source, params, 0);
    expect(r.maxDownwindDistance).toBe(0);
    expect(r.contours.length).toBeGreaterThan(0);
    for (const c of r.contours) {
      expect(c.polygon.length).toBe(0);
      expect(c.closed).toBe(false);
    }
  });

  it('前缘随风速推进：front(t) = windSpeed × t', () => {
    const r100 = plumeAtTime(source, params, 100); // front = 300m
    expect(r100.maxDownwindDistance).toBeGreaterThan(0);
    expect(r100.maxDownwindDistance).toBeLessThanOrEqual(300);
  });

  it('影响距离随时间单调不减', () => {
    const t1 = plumeAtTime(source, params, 100).maxDownwindDistance;
    const t2 = plumeAtTime(source, params, 500).maxDownwindDistance;
    const t3 = plumeAtTime(source, params, 1000).maxDownwindDistance;
    expect(t2).toBeGreaterThanOrEqual(t1);
    expect(t3).toBeGreaterThanOrEqual(t2);
  });

  it('推进距离不超过 range（默认 5000m）', () => {
    const r = plumeAtTime(source, params, 60 * 60); // front = 10800m
    expect(r.maxDownwindDistance).toBeLessThanOrEqual(5000);
  });

  it('尊重自定义 range', () => {
    const r = plumeAtTime(source, { ...params, range: 800 }, 60 * 60);
    expect(r.maxDownwindDistance).toBeLessThanOrEqual(800);
  });

  it('等值线坐标随风向旋转（不同风向得到不同多边形）', () => {
    const east = plumeAtTime(source, params, 300);
    const north = plumeAtTime(source, { ...params, windDirection: Math.PI / 2 }, 300);
    const first = east.contours.find((c) => c.polygon.length >= 3);
    const firstNorth = north.contours.find((c) => c.polygon.length >= 3);
    expect(first).toBeDefined();
    expect(firstNorth).toBeDefined();
    expect(first!.polygon[0]).not.toEqual(firstNorth!.polygon[0]);
  });

  it('透传大气稳定度参数', () => {
    expect(plumeAtTime(source, { ...params, stability: 'F' }, 100).stability).toBe('F');
  });
});
