import { describe, it, expect, vi } from 'vitest';
import { overlayUsers, userKindColor, buildLeakOverlayGeoJSON } from '../overlay';
import { LeakagePlume } from '../LeakagePlume';

const polygon: [number, number][] = [
  [114.29, 30.49],
  [114.31, 30.49],
  [114.31, 30.51],
  [114.29, 30.51],
];

const users = [
  { id: 'u1', kind: 'important' as const, lng: 114.3, lat: 30.5, scale: 500, name: '市医院' },
  { id: 'u2', kind: 'residential' as const, lng: 114.305, lat: 30.505, scale: 3000, name: '幸福里小区' },
  { id: 'u3', kind: 'industrial' as const, lng: 114.302, lat: 30.502, scale: 200, name: '食品厂' },
  { id: 'out', kind: 'residential' as const, lng: 115.0, lat: 31.0, scale: 900, name: '区外' },
];

function makeMap() {
  return {
    instance: {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
    },
    removeLayer: vi.fn(),
  };
}

describe('L-4 叠加渲染：数据层与薄壳', () => {
  it('userKindColor 按类型取色，未知类型有兜底', () => {
    expect(userKindColor('important')).toBe('#f87171');
    expect(userKindColor('residential')).toBe('#4ade80');
    expect(userKindColor('commercial')).toBe('#60a5fa');
    expect(userKindColor('industrial')).toBe('#fbbf24');
  });

  it('buildLeakOverlayGeoJSON：危险区线框 + 仅受影响点（区外不计）', () => {
    const ov = overlayUsers(polygon, users);
    expect(ov.affected.length).toBe(3);

    const fc = buildLeakOverlayGeoJSON(ov, polygon);
    const types = fc.features.map((f) => f.geometry.type);
    expect(types.filter((t) => t === 'Polygon').length).toBe(1);
    expect(types.filter((t) => t === 'Point').length).toBe(3);

    for (const f of fc.features.filter((x) => x.geometry.type === 'Point')) {
      const p = f.properties!;
      expect(p.color).toBe(userKindColor(p.kind as never));
      expect(p.radius as number).toBeGreaterThanOrEqual(4);
      expect(p.radius as number).toBeLessThanOrEqual(12);
    }
  });

  it('半径按规模归一化：规模最大者半径最大', () => {
    const ov = overlayUsers(polygon, users);
    const pts = buildLeakOverlayGeoJSON(ov, polygon).features.filter(
      (f) => f.geometry.type === 'Point',
    );
    const biggest = pts.find((p) => p.properties!.id === 'u2')!; // scale 3000
    const smallest = pts.find((p) => p.properties!.id === 'u3')!; // scale 200
    expect(biggest.properties!.radius as number).toBeGreaterThan(smallest.properties!.radius as number);
  });

  it('LeakagePlume.renderOverlay：恒为 2 层（点 + 线框），data-driven 着色', () => {
    const ov = overlayUsers(polygon, users);
    const map = makeMap();
    const plume = new LeakagePlume({ map: map as never });

    plume.renderOverlay(ov, polygon);

    const calls = (map.instance.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as { type: string; filter: unknown; paint: Record<string, unknown> },
    );
    expect(calls.length).toBe(2);
    expect(calls[0].type).toBe('circle');
    expect(calls[0].paint['circle-color']).toEqual(['get', 'color']);
    expect(calls[1].type).toBe('line');
    expect(calls.map((c) => c.filter)).toEqual([
      ['==', ['geometry-type'], 'Point'],
      ['==', ['geometry-type'], 'Polygon'],
    ]);

    plume.clear();
    expect(map.removeLayer).toHaveBeenCalledTimes(2);
  });

  it('空叠加结果不加任何图层', () => {
    const map = makeMap();
    const plume = new LeakagePlume({ map: map as never });
    plume.renderOverlay(overlayUsers(polygon, []));
    expect(map.instance.addLayer).not.toHaveBeenCalled();
  });
});
