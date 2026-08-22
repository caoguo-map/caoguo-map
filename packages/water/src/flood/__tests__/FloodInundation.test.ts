import { describe, it, expect, vi } from 'vitest';
import { FloodInundation } from '../FloodInundation';
import { simulateFlood, gradedFloodFeatureCollection, inundateCells } from '../floodCore';
import type { FloodInput } from '../../types';

const dem: number[][] = [
  [10, 10, 10, 10],
  [10, 5, 5, 10],
  [10, 5, 5, 10],
  [10, 10, 10, 10],
];
const input: FloodInput = { rainfall: 200, curveNumber: 75 };
const demBounds: [[number, number], [number, number]] = [[114, 30], [115, 31]];

function makeMap() {
  return {
    addSource: vi.fn(),
    getSource: vi.fn(() => null),
    setData: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  };
}

describe('FloodInundation (端到端封装)', () => {
  it('simulate 返回 FloodResult 并缓存水位供分级渲染复用', () => {
    const map = { instance: makeMap(), removeLayer: makeMap().removeLayer } as never;
    const flood = new FloodInundation({ map, dem, demBounds });
    const result = flood.simulate(input, [1, 1]);
    expect(result.inundationPolygon.length).toBeGreaterThan(0);
    expect(result.maxDepth).toBeGreaterThan(0);
    // 分级渲染不抛错（使用缓存水位）
    flood.renderGraded([1, 1]);
    expect((map.instance as ReturnType<typeof makeMap>).addLayer).toHaveBeenCalled();
  });

  it('renderGraded 生成带 depth 属性的分级面（真实水深分级）', () => {
    const waterLevel = 6;
    const seed: [number, number] = [1, 1];
    const flooded = inundateCells(dem, waterLevel, seed);
    const graded = gradedFloodFeatureCollection(dem, flooded, waterLevel, demBounds);
    // 每个淹没格都在 [114,30]~[115,31] 经纬度范围内
    for (const f of graded.features) {
      for (const [lng, lat] of (f.geometry as GeoJSON.Polygon).coordinates[0]) {
        expect(lng).toBeGreaterThanOrEqual(114);
        expect(lng).toBeLessThanOrEqual(115);
        expect(lat).toBeGreaterThanOrEqual(30);
        expect(lat).toBeLessThanOrEqual(31);
      }
      expect((f.properties as { depth: number }).depth).toBeGreaterThan(0);
    }
  });

  it('simulate 与 simulateFlood 核心结果一致（向后兼容）', () => {
    const map = { instance: makeMap(), removeLayer: makeMap().removeLayer } as never;
    const flood = new FloodInundation({ map, dem });
    const a = flood.simulate(input, [1, 1]);
    const b = simulateFlood({ features: [] }, dem, input, [1, 1]);
    // 排除耗时字段（每次运行浮动），比较其余核心水文结果
    const { durationMs: _a, ...coreA } = a;
    const { durationMs: _b, ...coreB } = b;
    expect(coreA).toEqual(coreB);
  });

  it('clear 移除图层', () => {
    const mlMap = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const flood = new FloodInundation({ map, dem, demBounds });
    flood.simulate(input, [1, 1]);
    flood.renderGraded([1, 1]);
    flood.clear();
    expect(mlMap.removeLayer).toHaveBeenCalled();
  });
});
