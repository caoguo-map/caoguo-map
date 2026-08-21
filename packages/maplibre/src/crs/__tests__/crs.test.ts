import { describe, expect, it } from 'vitest';
import {
  createTransformer,
  transformBounds,
  transformPoint,
  wgs84ToGcj02,
  gcj02ToWgs84,
  wgs84ToCgcs2000,
  cgcs2000ToWgs84,
} from '../index';

/** 经纬度米换算（用于误差断言，中纬度近似） */
function metersBetween(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6378137;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng =
    ((b[0] - a[0]) * Math.PI) / 180 * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.sqrt((dLat * R) ** 2 + (dLng * R) ** 2);
}

describe('GCJ-02 转换（PRD: 全国误差 < 50m）', () => {
  const cities: [string, [number, number]][] = [
    ['北京', [116.404, 39.915]],
    ['武汉', [114.3055, 30.5928]],
    ['广州', [113.2644, 23.1291]],
    ['乌鲁木齐', [87.6168, 43.8256]],
    ['三亚', [109.5082, 18.2478]],
  ];

  it('WGS84->GCJ02 偏移在合理范围（非 0）', () => {
    const [lng, lat] = wgs84ToGcj02(...cities[1][1]);
    expect(metersBetween(cities[1][1], [lng, lat])).toBeGreaterThan(50); // 大陆内确有偏移
  });

  it('全程往返残差 < 50m', () => {
    for (const [, pt] of cities) {
      const gcj = wgs84ToGcj02(pt[0], pt[1]);
      const back = gcj02ToWgs84(gcj[0], gcj[1]);
      expect(metersBetween(pt, back)).toBeLessThan(50);
    }
  });

  it('境外坐标不偏移', () => {
    const [lng, lat] = wgs84ToGcj02(-73.9857, 40.7484); // 纽约
    expect(lng).toBeCloseTo(-73.9857, 6);
    expect(lat).toBeCloseTo(40.7484, 6);
  });
});

describe('CGCS2000 转换（PRD: 误差 < 0.5m）', () => {
  it('默认实现为等价（残差远小于 0.5m）', () => {
    const pt: [number, number] = [114.3055, 30.5928];
    const c = wgs84ToCgcs2000(pt[0], pt[1]);
    const back = cgcs2000ToWgs84(c[0], c[1]);
    expect(metersBetween(pt, back)).toBeLessThan(0.5);
  });
});

describe('createTransformer 组合', () => {
  it('GCJ02 -> WGS84 一致于 gcj02ToWgs84', () => {
    const t = createTransformer('GCJ02', 'WGS84');
    const [lng, lat] = t.forward(114.4, 30.6);
    const [elng, elat] = gcj02ToWgs84(114.4, 30.6);
    expect(lng).toBeCloseTo(elng, 9);
    expect(lat).toBeCloseTo(elat, 9);
  });

  it('inverse 回环残差 < 5m（近似逆，含 GCJ-02 3 次迭代收敛）', () => {
    const t = createTransformer('GCJ02', 'WGS84');
    const p: [number, number] = [114.3055, 30.5928];
    const fwd = t.forward(p[0], p[1]);
    const inv = t.inverse(fwd[0], fwd[1]);
    expect(metersBetween(p, inv)).toBeLessThan(5);
  });

  it('相同 CRS 为恒等', () => {
    const t = createTransformer('WGS84', 'WGS84');
    expect(t.forward(1, 2)).toEqual([1, 2]);
  });

  it('GCJ02 -> CGCS2000 经 WGS84 枢纽', () => {
    const out = transformPoint(114.4, 30.6, 'GCJ02', 'CGCS2000');
    // CGCS2000 默认等价 WGS84，故结果应接近 GCJ02->WGS84
    const expectWgs = gcj02ToWgs84(114.4, 30.6);
    expect(out[0]).toBeCloseTo(expectWgs[0], 9);
    expect(out[1]).toBeCloseTo(expectWgs[1], 9);
  });
});

describe('transformBounds', () => {
  it('范围四角转换后保持 [w,s,e,n] 顺序', () => {
    const b: [number, number, number, number] = [114.2, 30.5, 114.4, 30.7];
    const out = transformBounds(b, 'GCJ02', 'WGS84');
    expect(out[0]).toBeLessThan(out[2]);
    expect(out[1]).toBeLessThan(out[3]);
  });
});
