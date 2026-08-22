import { describe, it, expect, vi } from 'vitest';
import { switchStationView, focusOnStation, STATION_VIEW_PRESETS } from '../viewSwitcher';
import type { StationViewMode } from '../viewSwitcher';

const center: [number, number] = [114.31, 30.51];

describe('G-6 进阶：视角切换 switchStationView', () => {
  it('返回 preset 的 ViewPreset（含 center + zoom/pitch/bearing）', () => {
    const flyTo = vi.fn();
    const map = { instance: { flyTo } } as never;
    const target = switchStationView(map, '3d-perspective', { center });
    expect(target.center).toEqual(center);
    expect(target.pitch).toBe(STATION_VIEW_PRESETS['3d-perspective'].pitch);
    expect(target.bearing).toBe(STATION_VIEW_PRESETS['3d-perspective'].bearing);
    expect(flyTo).toHaveBeenCalled();
    const opts = flyTo.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.center).toEqual(center);
    expect(opts.pitch).toBe(target.pitch);
    expect(opts.bearing).toBe(target.bearing);
    expect(typeof opts.duration).toBe('number');
  });

  it('4 种视角模式均有预设参数', () => {
    const modes: StationViewMode[] = ['2d-top', '3d-perspective', '3d-low-orbit', 'isometric'];
    for (const m of modes) {
      expect(STATION_VIEW_PRESETS[m]).toBeDefined();
      expect(typeof STATION_VIEW_PRESETS[m].zoom).toBe('number');
      expect(typeof STATION_VIEW_PRESETS[m].pitch).toBe('number');
      expect(typeof STATION_VIEW_PRESETS[m].bearing).toBe('number');
    }
  });

  it('flyTo 缺失时降级到 jumpTo', () => {
    const jumpTo = vi.fn();
    const map = { instance: { jumpTo } } as never;
    switchStationView(map, 'isometric', { center });
    expect(jumpTo).toHaveBeenCalled();
  });

  it('flyTo/jumpTo 都缺失时兜底 setPitch/setBearing', () => {
    const setPitch = vi.fn();
    const setBearing = vi.fn();
    const map = { instance: { setPitch, setBearing } } as never;
    const target = switchStationView(map, '3d-low-orbit', { center });
    expect(setPitch).toHaveBeenCalledWith(target.pitch);
    expect(setBearing).toHaveBeenCalledWith(target.bearing);
  });

  it('所有方法都缺失时不抛异常', () => {
    const map = { instance: {} } as never;
    expect(() => switchStationView(map, '3d-perspective', { center })).not.toThrow();
  });
});

describe('G-6 进阶：focusOnStation', () => {
  it('调用 switchStationView 的 3d-perspective 模式', () => {
    const flyTo = vi.fn();
    const map = { instance: { flyTo } } as never;
    const target = focusOnStation(map, { center, voltage: '500' });
    expect(target.pitch).toBe(60);
    expect(target.center).toEqual(center);
    expect(flyTo).toHaveBeenCalled();
  });

  it('不传 voltage 仍可工作', () => {
    const flyTo = vi.fn();
    const map = { instance: { flyTo } } as never;
    expect(() => focusOnStation(map, { center })).not.toThrow();
  });
});