import { describe, it, expect } from 'vitest';
import type { FloodResult, WaterFeature } from '../../types';
import {
  overlayFlood,
  featuresToOverlayTargets,
  compareFloodScenarios,
  pointInPolygon,
} from '../scenarioCompare';

/** 正方形淹没范围（lon 114.29~114.31, lat 30.49~30.51） */
const polygon: [number, number][] = [
  [114.29, 30.49],
  [114.31, 30.49],
  [114.31, 30.51],
  [114.29, 30.51],
];

function result(over: Partial<FloodResult>): FloodResult {
  return {
    peakFlow: 100,
    runoff: 20,
    inundationPolygon: polygon,
    maxDepth: 1,
    inundatedArea: 2,
    affectedFeatures: [],
    durationMs: 1,
    ...over,
  };
}

describe('overlayFlood（F-4 淹没叠加）', () => {
  const targets = [
    { id: 't1', kind: 'population', lng: 114.30, lat: 30.50, scale: 5000 },
    { id: 't2', kind: 'farmland', lng: 114.305, lat: 30.495, scale: 120 },
    { id: 't3', kind: 'population', lng: 114.40, lat: 30.60, scale: 9000 }, // 范围外
    { id: 't4', kind: 'building', lng: 114.295, lat: 30.505 }, // 无 scale
  ];

  it('只统计范围内目标，按规模降序', () => {
    const r = overlayFlood(polygon, targets);
    expect(r.total).toBe(3);
    expect(r.affected.map((t) => t.id)).toEqual(['t1', 't2', 't4']);
  });

  it('分类计数与规模合计', () => {
    const r = overlayFlood(polygon, targets);
    expect(r.byKind).toEqual({ population: 1, farmland: 1, building: 1 });
    expect(r.scaleAffected).toBe(5120); // 5000 + 120 + 0
  });

  it('空目标 / undefined 返回零结果', () => {
    expect(overlayFlood(polygon, []).total).toBe(0);
    expect(overlayFlood(polygon, undefined).total).toBe(0);
  });

  it('pointInPolygon 基本行为', () => {
    expect(pointInPolygon(114.30, 30.50, polygon)).toBe(true);
    expect(pointInPolygon(114.40, 30.60, polygon)).toBe(false);
  });

  it('featuresToOverlayTargets 从数据集要素构造目标', () => {
    const f: WaterFeature[] = [
      { id: 'w1', kind: 'waterStation', lng: 114.30, lat: 30.50, name: '汉口站' },
      { id: 'w2', kind: 'reach', lng: 114.40, lat: 30.60, geometry: [[114.4, 30.6], [114.5, 30.7]] },
    ];
    const t = featuresToOverlayTargets(f);
    expect(t.length).toBe(2);
    expect(t[0].kind).toBe('waterStation');
    expect(overlayFlood(polygon, t).total).toBe(1);
  });
});

describe('compareFloodScenarios（F-5 多情景对比）', () => {
  const scenarios = [
    { name: '五年一遇', result: result({ inundatedArea: 1.5, maxDepth: 0.8, peakFlow: 80 }) },
    { name: '五十年一遇', result: result({ inundatedArea: 6.2, maxDepth: 2.5, peakFlow: 320 }) },
    { name: '百年一遇', result: result({ inundatedArea: 9.8, maxDepth: 3.4, peakFlow: 510 }) },
  ];

  it('矩阵按输入顺序输出', () => {
    const r = compareFloodScenarios(scenarios);
    expect(r.matrix.inundatedArea).toEqual([1.5, 6.2, 9.8]);
    expect(r.matrix.maxDepth).toEqual([0.8, 2.5, 3.4]);
    expect(r.matrix.peakFlow).toEqual([80, 320, 510]);
  });

  it('smallest 口径：淹没面积最小（最安全）排前', () => {
    const r = compareFloodScenarios(scenarios, 'smallest');
    expect(r.ranking[0].name).toBe('五年一遇');
    expect(r.ranking[2].name).toBe('百年一遇');
  });

  it('largest 口径：最极端情景排前', () => {
    const r = compareFloodScenarios(scenarios, 'largest');
    expect(r.ranking[0].name).toBe('百年一遇');
  });

  it('空情景列表返回空结果', () => {
    const r = compareFloodScenarios([]);
    expect(r.plans).toEqual([]);
    expect(r.ranking).toEqual([]);
    expect(r.matrix.inundatedArea).toEqual([]);
  });
});
