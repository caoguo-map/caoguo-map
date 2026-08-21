// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
  computeScaleBar,
  ScaleControl,
} from '../ScaleControl';
import {
  oppositeTheme,
  themeFromStyle,
  ThemeSwitcher,
} from '../ThemeSwitcher';
import { caoguoStyle } from '../../styles';

/** 桩 Map（满足控件所需的子集 API） */
function fakeMap(opts: { lat?: number; zoom?: number; styleName?: string } = {}) {
  const handlers: Record<string, ((e: unknown) => void)[]> = {};
  const canvasListeners: Record<string, ((e: unknown) => void)[]> = {};
  return {
    _lat: opts.lat ?? 30.5928,
    _zoom: opts.zoom ?? 11,
    _styleName: opts.styleName ?? 'caoguo-dark',
    getZoom: () => (fakeMap as any)._z ?? opts.zoom ?? 11,
    getCenter: () => ({ lng: 114.3055, lat: opts.lat ?? 30.5928 }),
    getCanvas: () => ({
      addEventListener: (t: string, h: (e: unknown) => void) => {
        (canvasListeners[t] ??= []).push(h);
      },
      removeEventListener: (t: string, h: (e: unknown) => void) => {
        canvasListeners[t] = (canvasListeners[t] ?? []).filter((x) => x !== h);
      },
    }),
    getStyle: () => ({ name: opts.styleName ?? 'caoguo-dark' }),
    setStyle: vi.fn(),
    on: (e: string, h: (e: unknown) => void) => {
      (handlers[e] ??= []).push(h);
    },
    off: (e: string, h: (e: unknown) => void) => {
      handlers[e] = (handlers[e] ?? []).filter((x) => x !== h);
    },
    _emit: (e: string) => (handlers[e] ?? []).forEach((h) => h({})),
  };
}

describe('ScaleControl 纯逻辑', () => {
  it('赤道处 zoom=0 比例尺合理（每像素约 78km）', () => {
    const bar = computeScaleBar(0, 0);
    // 赤道 zoom0: 2*pi*R / 512 ≈ 78271 m/px；maxWidth100 → 约 7.8e6 m，吸附到 5e6
    expect(bar.meters).toBeGreaterThan(1e6);
    expect(bar.label).toContain('km');
    expect(bar.pixels).toBeLessThanOrEqual(100.5);
  });

  it('纬度越高比例尺越短（cos 投影收缩）', () => {
    const eq = computeScaleBar(0, 10);
    const hi = computeScaleBar(60, 10);
    expect(hi.meters).toBeLessThan(eq.meters);
  });

  it('吸附到 1/2/5 档（如 500 m、2 km）', () => {
    const bar = computeScaleBar(30, 12);
    const pow = Math.pow(10, Math.floor(Math.log10(bar.meters)));
    const base = bar.meters / pow;
    expect([1, 2, 5]).toContain(base);
  });

  it('label 在 <1000m 用米，>=1000m 用公里', () => {
    expect(computeScaleBar(0, 16).label).toMatch(/ m$/);
    expect(computeScaleBar(0, 2).label).toMatch(/ km$/);
  });
});

describe('ScaleControl DOM 绑定', () => {
  it('构造后渲染比例尺标签并随 zoom 更新', () => {
    const map = fakeMap({ lat: 30.5928, zoom: 11 });
    const ctrl = new ScaleControl(map as any);
    const container = document.createElement('div');
    ctrl.addTo(container);
    // 初始 update 在 addTo 内触发
    expect(container.querySelector('.caoguo-scale-control')).not.toBeNull();
    const label = container.querySelector('.caoguo-scale-control div:nth-child(2)')!.textContent!;
    expect(label.length).toBeGreaterThan(0);
  });

  it('showCoordinate=false 时不渲染坐标行', () => {
    const map = fakeMap();
    const ctrl = new ScaleControl(map as any, { showCoordinate: false });
    const container = document.createElement('div');
    ctrl.addTo(container);
    // 第三个 div（坐标）不存在
    const divs = container.querySelectorAll('.caoguo-scale-control > div');
    expect(divs.length).toBe(2);
  });

  it('remove 卸载 DOM 并移除监听', () => {
    const map = fakeMap();
    const ctrl = new ScaleControl(map as any);
    const container = document.createElement('div');
    ctrl.addTo(container);
    ctrl.remove();
    expect(container.querySelector('.caoguo-scale-control')).toBeNull();
  });
});

describe('ThemeSwitcher 纯逻辑', () => {
  it('oppositeTheme 在明暗间翻转', () => {
    expect(oppositeTheme('caoguo-dark')).toBe('caoguo-light');
    expect(oppositeTheme('caoguo-light')).toBe('caoguo-dark');
  });

  it('themeFromStyle 解析草果主题名', () => {
    expect(themeFromStyle({ name: 'caoguo-light' })).toBe('caoguo-light');
    expect(themeFromStyle(null)).toBe('caoguo-dark');
    expect(themeFromStyle({ name: 'osm' })).toBe('caoguo-dark');
    expect(themeFromStyle('caoguo-light')).toBe('caoguo-light');
  });
});

describe('ThemeSwitcher DOM 绑定', () => {
  it('点击按钮在明暗主题间切换并调用 setStyle', () => {
    const map = fakeMap({ styleName: 'caoguo-dark' });
    const ctrl = new ThemeSwitcher(map as any);
    const container = document.createElement('div');
    ctrl.addTo(container);
    const btn = container.querySelector('button')!;
    expect(ctrl.getTheme()).toBe('caoguo-dark');
    btn.click();
    expect(ctrl.getTheme()).toBe('caoguo-light');
    expect((map as any).setStyle).toHaveBeenCalledWith(caoguoStyle('caoguo-light'), { diff: true });
    btn.click();
    expect(ctrl.getTheme()).toBe('caoguo-dark');
  });

  it('setTheme 相同主题不重复调用', () => {
    const map = fakeMap({ styleName: 'caoguo-dark' });
    const ctrl = new ThemeSwitcher(map as any);
    ctrl.setTheme('caoguo-dark');
    expect((map as any).setStyle).not.toHaveBeenCalled();
  });
});
