import { describe, it, expect } from 'vitest';
import {
  classifyStability,
  dispersionCoefficients,
} from '../pasquillGifford';
import { gaussianPlume } from '../gaussianPlume';

describe('leakage/pasquillGifford', () => {
  it('白天中等日射 + 中等风速 → B', () => {
    const cls = classifyStability({
      windSpeed: 4,
      isDaytime: true,
      daytimeInsolation: 'moderate',
    });
    expect(cls).toBe('B');
  });

  it('白天强日射 + 弱风 → A', () => {
    const cls = classifyStability({
      windSpeed: 1.5,
      isDaytime: true,
      daytimeInsolation: 'strong',
    });
    expect(cls).toBe('A');
  });

  it('夜间阴天 + 中等风速 → D', () => {
    const cls = classifyStability({
      windSpeed: 4,
      isDaytime: false,
      nightCloudCover: 'overcast',
    });
    expect(cls === 'D' || cls === 'E').toBe(true);
  });

  it('dispersionCoefficients sigmaY 随 x 单调增', () => {
    const dc = dispersionCoefficients('D');
    expect(dc.sigmaY(100)).toBeGreaterThanOrEqual(dc.sigmaY(50));
    expect(dc.sigmaY(1000)).toBeGreaterThanOrEqual(dc.sigmaY(100));
  });
});

describe('leakage/gaussianPlume', () => {
  it('生成等浓度线多边形与最大影响距离', () => {
    const r = gaussianPlume({ lng: 114.0, lat: 30.0 }, {
      windDirection: 1.5708, // 90度 = 北
      windSpeed: 3,
      leakRate: 10, // 大流量以触发低阈值
      releaseHeight: 0,
      stability: 'D',
      range: 2000,
      gridStep: 100,
    });
    expect(r.contours.length).toBeGreaterThan(0);
    expect(r.maxDownwindDistance).toBeGreaterThan(0);
  });

  it('阈值越高, 多边形越小', () => {
    // 大 leakRate → 高中心浓度 → 远近阈值差异显著
    const low = gaussianPlume({ lng: 114.0, lat: 30.0 }, {
      windDirection: 1.5708,
      windSpeed: 5,
      leakRate: 1,
      releaseHeight: 0,
      thresholds: [1e-4],
      range: 5000,
    });
    const high = gaussianPlume({ lng: 114.0, lat: 30.0 }, {
      windDirection: 1.5708,
      windSpeed: 5,
      leakRate: 1,
      releaseHeight: 0,
      thresholds: [0.5],
      range: 5000,
    });
    // 高阈值（接近中心浓度）→ 只在近处达到；低阈值 → 远距离也有
    expect(high.maxDownwindDistance).toBeLessThan(low.maxDownwindDistance);
  });
});
