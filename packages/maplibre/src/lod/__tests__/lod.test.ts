import { describe, it, expect, vi } from 'vitest';
import {
  resolveLod,
  suggestDensity,
  LodController,
  type LodLevel,
} from '../lodController';

const LEVELS: LodLevel<string>[] = [
  { id: 'country', minZoom: 0, maxZoom: 5, payload: 'c' },
  { id: 'province', minZoom: 6, maxZoom: 9, payload: 'p' },
  { id: 'city', minZoom: 10, maxZoom: 13, payload: 'ci' },
  { id: 'detail', minZoom: 14, payload: 'd' },
];

describe('resolveLod', () => {
  it('低 zoom 命中 country', () => {
    expect(resolveLod(2, LEVELS)?.id).toBe('country');
  });
  it('边界 zoom 命中对应等级', () => {
    expect(resolveLod(5, LEVELS)?.id).toBe('country');
    expect(resolveLod(6, LEVELS)?.id).toBe('province');
    expect(resolveLod(9, LEVELS)?.id).toBe('province');
    expect(resolveLod(10, LEVELS)?.id).toBe('city');
  });
  it('高 zoom 命中 detail（无 maxZoom 默认 +∞）', () => {
    expect(resolveLod(20, LEVELS)?.id).toBe('detail');
  });
  it('无命中区间返回 null', () => {
    // 5.5 落在 country(max5) 与 province(min6) 之间
    expect(resolveLod(5.5, LEVELS)).toBeNull();
  });
});

describe('suggestDensity', () => {
  it('zoom<8 密度收敛为基值', () => {
    expect(suggestDensity(4)).toBe(200);
  });
  it('zoom 越高密度指数增长', () => {
    expect(suggestDensity(10)).toBeGreaterThan(suggestDensity(8));
    expect(suggestDensity(12)).toBe(200 * 16);
  });
});

describe('LodController', () => {
  function fakeMap(zoom = 4) {
    const handlers: Record<string, ((e: unknown) => void)[]> = {};
    return {
      _zoom: zoom,
      getZoom: () => (fakeMap as any)._z ?? zoom,
      on: (e: string, h: (e: unknown) => void) => { (handlers[e] ??= []).push(h); },
      off: (e: string, h: (e: unknown) => void) => {
        handlers[e] = (handlers[e] ?? []).filter((x) => x !== h);
      },
      _emit: (e: string) => (handlers[e] ?? []).forEach((h) => h({})),
    };
  }

  it('构造时立即评估并回调当前等级', () => {
    const map = fakeMap(3);
    const cb = vi.fn();
    (fakeMap as any)._z = 3;
    const ctrl = new LodController(map as any, LEVELS, cb);
    ctrl.evaluate(true);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ level: expect.objectContaining({ id: 'country' }), changed: true }));
    expect(ctrl.getLevel()?.id).toBe('country');
  });

  it('zoom 变化跨等级触发 changed 回调', () => {
    const map = fakeMap(3);
    (fakeMap as any)._z = 3;
    const cb = vi.fn();
    const ctrl = new LodController(map as any, LEVELS, cb);
    ctrl.evaluate(true);
    cb.mockClear();
    // 模拟 zoom 变到 11
    (fakeMap as any)._z = 11;
    ctrl.evaluate(false);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ level: expect.objectContaining({ id: 'city' }), changed: true }));
  });

  it('同等级内 zoom 变化不触发 changed', () => {
    const map = fakeMap(3);
    (fakeMap as any)._z = 3;
    const cb = vi.fn();
    const ctrl = new LodController(map as any, LEVELS, cb);
    ctrl.evaluate(true);
    cb.mockClear();
    (fakeMap as any)._z = 4;
    ctrl.evaluate(false);
    expect(cb).not.toHaveBeenCalled();
  });

  it('remove 卸载监听', () => {
    const map = fakeMap(3);
    const cb = vi.fn();
    const ctrl = new LodController(map as any, LEVELS, cb);
    ctrl.remove();
    (fakeMap as any)._z = 11;
    map._emit('zoom');
    expect(cb).not.toHaveBeenCalled();
  });

  it('setLevels 后重新评估生效', () => {
    const map = fakeMap(3);
    (fakeMap as any)._z = 3;
    const cb = vi.fn();
    const ctrl = new LodController(map as any, LEVELS, cb);
    ctrl.evaluate(true);
    cb.mockClear();
    ctrl.setLevels([{ id: 'all', minZoom: 0, payload: 'a' }]);
    expect(ctrl.getLevel()?.id).toBe('all');
    expect(cb).toHaveBeenCalled();
  });
});
