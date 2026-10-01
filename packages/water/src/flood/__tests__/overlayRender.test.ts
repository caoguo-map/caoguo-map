import { describe, it, expect, vi } from 'vitest';
import {
  overlayFlood,
  overlayKindColor,
  buildFloodOverlayGeoJSON,
} from '../scenarioCompare';
import { FloodRender } from '../FloodRender';

const polygon: [number, number][] = [
  [114.29, 30.49],
  [114.31, 30.49],
  [114.31, 30.51],
  [114.29, 30.51],
];

const targets = [
  { id: 't1', kind: 'population', lng: 114.3, lat: 30.5, scale: 1000, name: '滨江社区' },
  { id: 't2', kind: 'building', lng: 114.3, lat: 30.505, scale: 200, name: '商场' },
  { id: 't3', kind: 'farmland', lng: 114.302, lat: 30.502, scale: 50, name: '地块A' },
  { id: 'out', kind: 'population', lng: 115.0, lat: 31.0, scale: 900, name: '区外' },
];

function makeMap() {
  return {
    addSource: vi.fn(),
    getSource: vi.fn(() => null),
    setData: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  };
}

describe('F-4 淹没叠加：渲染数据层与薄壳', () => {
  it('overlayKindColor：已知类型取预设色，未知类型按名称稳定散列（同类型恒定同色）', () => {
    expect(overlayKindColor('population')).toBe('#f87171');
    expect(overlayKindColor('building')).toBe('#fbbf24');
    const a = overlayKindColor('自定义类型');
    const b = overlayKindColor('自定义类型');
    expect(a).toBe(b); // 确定性
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('buildFloodOverlayGeoJSON：含淹线线框 + 仅受影响点（区外要素不计）', () => {
    const ov = overlayFlood(polygon, targets);
    expect(ov.affected.length).toBe(3);

    const fc = buildFloodOverlayGeoJSON(ov, polygon);
    const kinds = fc.features.map((f) => f.geometry.type);
    expect(kinds.filter((k) => k === 'Polygon').length).toBe(1); // 线框
    expect(kinds.filter((k) => k === 'Point').length).toBe(3); // 受影响点

    for (const f of fc.features.filter((x) => x.geometry.type === 'Point')) {
      const p = f.properties!;
      expect(p.color).toBe(overlayKindColor(p.kind as string));
      expect(p.radius as number).toBeGreaterThanOrEqual(4);
      expect(p.radius as number).toBeLessThanOrEqual(12);
    }
  });

  it('半径按规模归一化：规模最大者半径最大', () => {
    const ov = overlayFlood(polygon, targets);
    const pts = buildFloodOverlayGeoJSON(ov, polygon).features.filter(
      (f) => f.geometry.type === 'Point',
    );
    const biggest = pts.find((p) => p.properties!.id === 't1')!;
    const smallest = pts.find((p) => p.properties!.id === 't3')!;
    expect(biggest.properties!.radius as number).toBeGreaterThan(smallest.properties!.radius as number);
  });

  it('不传多边形时只输出点要素', () => {
    const ov = overlayFlood(polygon, targets);
    const fc = buildFloodOverlayGeoJSON(ov);
    expect(fc.features.every((f) => f.geometry.type === 'Point')).toBe(true);
  });

  it('renderOverlay：恒为 2 层（点 + 线框），带 geometry-type 过滤', () => {
    const ov = overlayFlood(polygon, targets);
    const mlMap = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const render = new FloodRender({ map });

    render.renderOverlay(ov, polygon);

    const calls = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as { id: string; type: string; filter: unknown; paint: Record<string, unknown> },
    );
    expect(calls.length).toBe(2);
    expect(calls[0].type).toBe('circle');
    expect(calls[0].paint['circle-color']).toEqual(['get', 'color']);
    expect(calls[1].type).toBe('line');
    expect(calls.map((c) => c.filter)).toEqual([
      ['==', ['geometry-type'], 'Point'],
      ['==', ['geometry-type'], 'Polygon'],
    ]);

    render.clear();
    expect((mlMap.removeLayer as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('空叠加结果不加任何图层', () => {
    const mlMap = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    new FloodRender({ map }).renderOverlay(overlayFlood(polygon, []));
    expect(mlMap.addLayer).not.toHaveBeenCalled();
  });
});
