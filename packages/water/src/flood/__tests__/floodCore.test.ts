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

describe('simulateFlood 真实面积与受影响要素', () => {
  const dem = [
    [10, 10, 10],
    [10, 1, 1],
    [10, 1, 10],
  ];

  it('inundatedArea = 淹没格数 × 单格面积(km²)', () => {
    const r = simulateFlood({ features: [] }, dem, { rainfall: 100, curveNumber: 75 }, [1, 1], {
      cellSizeM: 30,
    });
    // 淹没 3 格，单格 30m×30m = 9e-4 km²
    expect(r.inundatedArea).toBeCloseTo(3 * 9e-4, 9);
  });

  it('默认 cellSizeM=30 时面积随淹没格数变化', () => {
    const r = simulateFlood({ features: [] }, dem, { rainfall: 100, curveNumber: 75 }, [1, 1]);
    expect(r.inundatedArea).toBeGreaterThan(0);
    expect(r.inundatedArea).toBeCloseTo(3 * 9e-4, 9); // 3 格 × 30m²
  });

  it('affectedFeatures 统计落在淹没范围内的要素', () => {
    const dataset: WaterDataset = {
      features: [
        { id: 'a', kind: 'pump', lng: 1.3, lat: 0.7 }, // 映射后落入淹没凸包内部
        { id: 'b', kind: 'pump', lng: 99, lat: 99 }, // 远离淹没区
      ],
    };
    const r = simulateFlood(dataset, dem, { rainfall: 100, curveNumber: 75 }, [1, 1], {
      affectedFeatures: dataset.features,
      demBounds: [[0, 0], [2, 2]],
    });
    const ids = r.affectedFeatures.map((f) => f.id);
    expect(ids).toContain('a');
    expect(ids).not.toContain('b');
  });

  it('未提供要素/范围时 affectedFeatures 为空', () => {
    const r = simulateFlood({ features: [] }, dem, { rainfall: 100, curveNumber: 75 }, [1, 1]);
    expect(r.affectedFeatures).toEqual([]);
  });
});
