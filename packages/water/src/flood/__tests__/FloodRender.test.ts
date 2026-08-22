import { describe, it, expect, vi } from 'vitest';
import { FloodRender } from '../FloodRender';
import { simulateFlood, depthColor } from '../floodCore';
import type { WaterDataset, FloodInput } from '../../types';

const dataset: WaterDataset = { features: [] };
const dem: number[][] = [
  [10, 10, 10, 10],
  [10, 5, 5, 10],
  [10, 5, 5, 10],
  [10, 10, 10, 10],
];
const input: FloodInput = { rainfall: 200, curveNumber: 75 };

function makeMap() {
  return {
    addSource: vi.fn(),
    getSource: vi.fn(() => null),
    setData: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  };
}

describe('FloodRender (F-2/F-3 淹没动态渲染 + 水深分级着色)', () => {
  it('渲染 simulateFlood 结果为淹没面层，颜色按水深分级', () => {
    const result = simulateFlood(dataset, dem, input, [1, 1]);
    expect(result.inundationPolygon.length).toBeGreaterThan(0);

    const mlMap = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const flood = new FloodRender({ map });

    flood.render(result);

    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();
    // 面层填充色应等于该水深的 depthColor
    const layer = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      paint: { 'fill-color': string };
    };
    expect(layer.paint['fill-color']).toBe(depthColor(result.maxDepth));

    flood.clear();
    expect(mlMap.removeLayer).toHaveBeenCalled();
  });
});
