import { describe, it, expect, vi } from 'vitest';
import {
  OVERLAY_PALETTE,
  stableHash,
  assignKindColor,
  buildOverlayGeoJSON,
  addOverlayLayers,
} from '../overlay';

const polygon: [number, number][] = [
  [114.29, 30.49],
  [114.31, 30.49],
  [114.31, 30.51],
  [114.29, 30.51],
];

const points = [
  { id: 'p1', kind: 'population', lng: 114.3, lat: 30.5, scale: 1000, name: '社区A' },
  { id: 'p2', kind: 'building', lng: 114.302, lat: 30.502, scale: 200, name: '商场' },
  { id: 'p3', kind: '未知类型', lng: 114.303, lat: 30.503, scale: 50, name: 'X' },
];

describe('叠加渲染通用工具 overlay', () => {
  it('stableHash 稳定（同输入恒定，不同输入尽量分散）', () => {
    expect(stableHash('abc')).toBe(stableHash('abc'));
    expect(stableHash('abc')).not.toBe(stableHash('abd'));
  });

  it('assignKindColor：known 优先 → fallback → 稳定散列兜底', () => {
    const known = { population: '#111111' };
    expect(assignKindColor('population', known)).toBe('#111111');
    expect(assignKindColor('whatever', known, '#94a3b8')).toBe('#94a3b8'); // fallback
    // 无 fallback 时按稳定散列取色板，且同类型恒定
    const c1 = assignKindColor('custom');
    const c2 = assignKindColor('custom');
    expect(c1).toBe(c2);
    expect(OVERLAY_PALETTE).toContain(c1);
  });

  it('buildOverlayGeoJSON：区域线框 + 点，半径按规模归一化且落在区间内', () => {
    const fc = buildOverlayGeoJSON({ points, polygon });
    expect(fc.features.filter((f) => f.geometry.type === 'Polygon').length).toBe(1);
    expect(fc.features.filter((f) => f.geometry.type === 'Point').length).toBe(3);

    const pts = fc.features.filter((f) => f.geometry.type === 'Point');
    for (const f of pts) {
      const r = f.properties!.radius as number;
      expect(r).toBeGreaterThanOrEqual(4);
      expect(r).toBeLessThanOrEqual(12);
      expect(f.properties!.color).toBe(assignKindColor(f.properties!.kind as string));
    }
    // 规模最大者半径最大
    const biggest = pts.find((p) => p.properties!.id === 'p1')!;
    const smallest = pts.find((p) => p.properties!.id === 'p3')!;
    expect(biggest.properties!.radius as number).toBeGreaterThan(smallest.properties!.radius as number);
  });

  it('buildOverlayGeoJSON：线框闭合，且点数 < 3 的多边形被忽略', () => {
    const fc = buildOverlayGeoJSON({ points, polygon });
    const ring = (fc.features[0].geometry as GeoJSON.Polygon).coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);

    const noPoly = buildOverlayGeoJSON({ points, polygon: [[114.3, 30.5]] });
    expect(noPoly.features.every((f) => f.geometry.type === 'Point')).toBe(true);
  });

  it('buildOverlayGeoJSON：支持自定义角色名与配色函数', () => {
    const fc = buildOverlayGeoJSON({
      points,
      polygon,
      polygonRole: 'danger-outline',
      pointRole: 'user',
      colorOf: () => '#000000',
    });
    expect(fc.features[0].properties!.overlayRole).toBe('danger-outline');
    expect(fc.features[1].properties!.overlayRole).toBe('user');
    expect(fc.features[1].properties!.color).toBe('#000000');
  });

  it('addOverlayLayers：恒加 2 层（circle + line），带 geometry-type 过滤', () => {
    const mlMap = { addSource: vi.fn(), getSource: vi.fn(() => null), addLayer: vi.fn() };
    const fc = buildOverlayGeoJSON({ points, polygon });
    const ids = addOverlayLayers(mlMap, {
      sourceId: 'src',
      layerPrefix: 'ovl',
      data: fc,
      outlineColor: '#f00',
    });

    expect(mlMap.addSource).toHaveBeenCalled();
    expect(ids).toEqual(['ovl-point', 'ovl-outline']);
    const layers = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as { id: string; type: string; filter: unknown; paint: Record<string, unknown> },
    );
    expect(layers.map((l) => l.type)).toEqual(['circle', 'line']);
    expect(layers.map((l) => l.filter)).toEqual([
      ['==', ['geometry-type'], 'Point'],
      ['==', ['geometry-type'], 'Polygon'],
    ]);
    expect(layers[0].paint['circle-color']).toEqual(['get', 'color']);
    expect(layers[0].paint['circle-radius']).toEqual(['get', 'radius']);
    expect(layers[1].paint['line-color']).toBe('#f00');
  });

  it('addOverlayLayers：空数据不加任何图层', () => {
    const mlMap = { addSource: vi.fn(), getSource: vi.fn(() => null), addLayer: vi.fn() };
    const ids = addOverlayLayers(mlMap, {
      sourceId: 'src',
      layerPrefix: 'ovl',
      data: { type: 'FeatureCollection', features: [] },
    });
    expect(ids).toEqual([]);
    expect(mlMap.addLayer).not.toHaveBeenCalled();
  });
});
