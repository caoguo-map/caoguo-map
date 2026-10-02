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

function makeFlood(mlMap = makeMap()) {
  const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
  return { flood: new FloodRender({ map }), mlMap };
}

describe('FloodRender (F-2/F-3 淹没动态渲染 + 水深分级着色)', () => {
  it('渲染 simulateFlood 结果为淹没面层，颜色按水深分级', () => {
    const result = simulateFlood(dataset, dem, input, [1, 1]);
    expect(result.inundationPolygon.length).toBeGreaterThan(0);

    const { flood, mlMap } = makeFlood();
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

  it('F-2 水位上涨重复调用 render：图层数恒定，填充色随新水深更新', () => {
    const low = simulateFlood(dataset, dem, { rainfall: 100, curveNumber: 75 }, [1, 1]);
    const high = simulateFlood(dataset, dem, { rainfall: 400, curveNumber: 90 }, [1, 1]);

    const { flood, mlMap } = makeFlood();
    flood.render(low);
    const firstPaint = ((mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      paint: { 'fill-color': string };
    }).paint;
    expect(firstPaint['fill-color']).toBe(depthColor(low.maxDepth));

    flood.render(high);
    // 重复调用 = clear 后重建：每次 addLayer 恰一次，id 恒定（图层数不增长）
    const calls = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as { id: string },
    );
    expect(calls).toHaveLength(2);
    expect(new Set(calls.map((c) => c.id)).size).toBe(1);
    expect(calls[0].id).toBe('cg-flood-fill');
    expect(mlMap.removeLayer).toHaveBeenCalled(); // 中间发生了 clear

    const secondPaint = ((mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls[1][0] as {
      paint: { 'fill-color': string };
    }).paint;
    expect(secondPaint['fill-color']).toBe(depthColor(high.maxDepth));
  });

  it('F-2 空淹没范围：契约是仍 upsert 图层（空环要素），不早退', () => {
    const empty = { ...simulateFlood(dataset, dem, input, [0, 0]), inundationPolygon: [] };
    const { flood, mlMap } = makeFlood();
    flood.render(empty as never);

    expect(mlMap.addLayer).toHaveBeenCalledTimes(1); // 与 F-6 的「空输入早退」不同，锁定契约
    const [, data] = (mlMap.addSource as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { features: Array<{ geometry: { coordinates: [unknown[]] } }> },
    ];
    expect(data.features[0].geometry.coordinates[0]).toHaveLength(0);
  });

  it('F-3 renderGraded：data-driven interpolate 按要素 depth 属性分级着色', () => {
    const { flood, mlMap } = makeFlood();
    flood.renderGraded({ type: 'FeatureCollection', features: [] });

    const layer = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      id: string;
      type: string;
      paint: { 'fill-color': unknown[]; 'fill-opacity': number };
    };
    expect(layer.id).toBe('cg-flood-graded');
    expect(layer.type).toBe('fill');
    const expr = layer.paint['fill-color'];
    expect(expr[0]).toBe('interpolate');
    expect(expr[2]).toEqual(['get', 'depth']); // data-driven：按要素属性取值
    // 分档锚点 0.5/1/2/3/4 m 齐全
    expect(expr.slice(3).filter((v) => typeof v === 'number')).toEqual([0.5, 1, 2, 3, 4]);
  });
});

describe('FloodRender.renderEvacuation (F-6 渲染薄壳)', () => {
  const reachable = {
    originId: 'o1',
    shelterId: 's1',
    reachable: true,
    path: [],
    pathCoords: [
      [114.3, 30.5],
      [114.31, 30.51],
    ] as [number, number][],
    distanceM: 1500,
  };
  const unreachable = {
    originId: 'o2',
    shelterId: 's2',
    reachable: false,
    path: [],
    pathCoords: [] as [number, number][],
    distanceM: 0,
  };

  it('全员不可达：空输入早退，不加任何图层（唯一早退的渲染薄壳）', () => {
    const { flood, mlMap } = makeFlood();
    flood.renderEvacuation({ routes: [unreachable] } as never);
    expect(mlMap.addLayer).not.toHaveBeenCalled();
    expect(mlMap.addSource).not.toHaveBeenCalled();
  });

  it('混合可达性：只画可达路线，1 个青色 line 层', () => {
    const { flood, mlMap } = makeFlood();
    flood.renderEvacuation({ routes: [reachable, unreachable] } as never);

    expect(mlMap.addLayer).toHaveBeenCalledTimes(1);
    const layer = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      id: string;
      type: string;
      paint: Record<string, unknown>;
    };
    expect(layer.id).toBe('cg-flood-evac-line');
    expect(layer.type).toBe('line');
    expect(layer.paint['line-color']).toBe('#22d3ee');
    expect(layer.paint['line-width']).toBe(3);

    const [, data] = (mlMap.addSource as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { features: Array<{ properties: Record<string, unknown> }> },
    ];
    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties.originId).toBe('o1');
    expect(data.features[0].properties.distanceM).toBe(1500);
  });
});
