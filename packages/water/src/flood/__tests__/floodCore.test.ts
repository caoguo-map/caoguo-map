import { describe, it, expect } from 'vitest';
import {
  scsRunoff,
  peakFlowRational,
  runoffCoefficientFromCN,
  inundateCells,
  maxDepth,
  simulateFlood,
  depthColor,
} from '../floodCore';
import type { WaterDataset } from '../../types';

describe('scsRunoff', () => {
  it('降雨量为 0 时径流为 0', () => {
    expect(scsRunoff(0, 75)).toBe(0);
  });

  it('径流量随降雨量单调递增', () => {
    expect(scsRunoff(50, 75)).toBeLessThan(scsRunoff(100, 75));
  });

  it('CN 越大（透水性差）径流越大', () => {
    expect(scsRunoff(100, 90)).toBeGreaterThan(scsRunoff(100, 50));
  });
});

describe('peakFlowRational', () => {
  it('汇流时间为 0 时返回 0', () => {
    expect(
      peakFlowRational({ runoffCoefficient: 0.6, rainfallIntensity: 50, catchmentArea: 10, concentrationTime: 0 })
    ).toBe(0);
  });

  it('推理公式计算正确', () => {
    const qp = peakFlowRational({ runoffCoefficient: 0.6, rainfallIntensity: 50, catchmentArea: 10, concentrationTime: 2 });
    expect(qp).toBeCloseTo(0.278 * 0.6 * 50 * 10 / 2, 1);
  });
});

describe('inundateCells', () => {
  it('低于水位的连通格被淹没', () => {
    const dem = [
      [10, 10, 10],
      [10, 1, 1],
      [10, 1, 10],
    ];
    const flooded = inundateCells(dem, 5, [1, 1]);
    expect(flooded.size).toBe(3); // 种子 + 右侧 + 下方
    expect(flooded.has('1,1')).toBe(true);
    expect(flooded.has('1,2')).toBe(true);
    expect(flooded.has('2,1')).toBe(true);
    expect(flooded.has('0,0')).toBe(false); // 海拔 10 > 水位 5
  });

  it('最大水深计算', () => {
    const dem = [
      [10, 10],
      [10, 1],
    ];
    const flooded = inundateCells(dem, 5, [1, 1]);
    expect(maxDepth(dem, flooded, 5)).toBe(4); // 5 - 1
  });
});

describe('simulateFlood', () => {
  const dataset: WaterDataset = { features: [] };
  it('返回完整结果结构', () => {
    const dem = [
      [10, 10, 10],
      [10, 1, 1],
      [10, 1, 10],
    ];
    const r = simulateFlood(dataset, dem, { rainfall: 100, curveNumber: 75 }, [1, 1]);
    expect(r.peakFlow).toBeGreaterThan(0);
    expect(r.runoff).toBeGreaterThan(0);
    expect(r.maxDepth).toBeGreaterThan(0);
    expect(r.inundatedArea).toBeGreaterThan(0);
  });
});

describe('depthColor', () => {
  it('水深分级着色', () => {
    expect(depthColor(0.2)).toBe('#93c5fd');
    expect(depthColor(3)).toBe('#7f1d1d');
  });
});
