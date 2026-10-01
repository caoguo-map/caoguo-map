import { describe, it, expect, vi } from 'vitest';
import type { FloodResult } from '../../types';
import {
  compareFloodScenarios,
  scenarioColor,
  SCENARIO_COLORS,
  buildScenarioComparisonGeoJSON,
} from '../scenarioCompare';
import { FloodRender } from '../FloodRender';

const polygonA: [number, number][] = [
  [114.29, 30.49],
  [114.31, 30.49],
  [114.31, 30.51],
  [114.29, 30.51],
];
const polygonB: [number, number][] = [
  [114.28, 30.48],
  [114.33, 30.48],
  [114.33, 30.52],
  [114.28, 30.52],
];

function result(over: Partial<FloodResult>): FloodResult {
  return {
    peakFlow: 100,
    runoff: 20,
    inundationPolygon: polygonA,
    maxDepth: 1,
    inundatedArea: 2,
    affectedFeatures: [],
    durationMs: 1,
    ...over,
  };
}

function makeMap() {
  return {
    addSource: vi.fn(),
    getSource: vi.fn(() => null),
    setData: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  };
}

describe('F-5 多情景对比：渲染数据层与薄壳', () => {
  it('scenarioColor 按序取值并循环', () => {
    expect(scenarioColor(0)).toBe(SCENARIO_COLORS[0]);
    expect(scenarioColor(1)).toBe(SCENARIO_COLORS[1]);
    expect(scenarioColor(SCENARIO_COLORS.length)).toBe(SCENARIO_COLORS[0]); // 循环
  });

  it('buildScenarioComparisonGeoJSON：每情景一个闭合多边形且配色互不相同', () => {
    const cmp = compareFloodScenarios([
      { name: '50年一遇', result: result({ inundationPolygon: polygonA, inundatedArea: 2 }) },
      { name: '100年一遇', result: result({ inundationPolygon: polygonB, inundatedArea: 5 }) },
    ]);
    const fc = buildScenarioComparisonGeoJSON(cmp);
    expect(fc.features.length).toBe(2);
    const colors = fc.features.map((f) => f.properties?.color);
    expect(new Set(colors).size).toBe(2);
    for (const f of fc.features) {
      const ring = f.geometry.coordinates[0];
      expect(ring[0]).toEqual(ring[ring.length - 1]); // 闭合
      expect(f.properties?.name).toBeTruthy();
    }
  });

  it('退化情景（点数 < 3）被跳过', () => {
    const cmp = compareFloodScenarios([
      { name: '空情景', result: result({ inundationPolygon: [] }) },
      { name: '有效', result: result({ inundationPolygon: polygonA }) },
    ]);
    expect(buildScenarioComparisonGeoJSON(cmp).features.length).toBe(1);
  });

  it('renderScenarioComparison：恒为 2 层（填充+描边），与情景数量无关', () => {
    const cmp = compareFloodScenarios([
      { name: 'A', result: result({ inundationPolygon: polygonA }) },
      { name: 'B', result: result({ inundationPolygon: polygonB }) },
      { name: 'C', result: result({ inundationPolygon: polygonB }) },
    ]);
    const mlMap = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const render = new FloodRender({ map });

    render.renderScenarioComparison(cmp);

    expect(mlMap.addSource).toHaveBeenCalled();
    expect((mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    const [fill, line] = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as { id: string; type: string; paint: Record<string, unknown> },
    );
    expect(fill.type).toBe('fill');
    expect(line.type).toBe('line');
    // data-driven 着色：颜色取自 feature 的 color 属性
    expect(fill.paint['fill-color']).toEqual(['get', 'color']);

    render.clear();
    expect((mlMap.removeLayer as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('无有效情景时不加任何图层', () => {
    const cmp = compareFloodScenarios([{ name: '空', result: result({ inundationPolygon: [] }) }]);
    const mlMap = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    new FloodRender({ map }).renderScenarioComparison(cmp);
    expect(mlMap.addLayer).not.toHaveBeenCalled();
  });
});
