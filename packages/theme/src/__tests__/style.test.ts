import { describe, expect, it, vi } from 'vitest';
import { buildStyle, themeNames, darkStyle, lightStyle, registerTheme, getRegisteredThemes, getThemeList, hasTheme, injectTheme, DEFAULT_GLYPHS, useTheme, checkZoomCoverage } from '../index';

describe('主题 Style JSON（PRD: 符合 MapLibre v8 spec）', () => {
  it('两套主题均为合法 v8 spec 结构', () => {
    for (const name of themeNames) {
      const style = buildStyle(name);
      expect(style.version).toBe(8);
      expect(style.sources).toBeTruthy();
      expect(Object.keys(style.sources!).length).toBeGreaterThan(0);
      expect(Array.isArray(style.layers)).toBe(true);
      expect(style.layers.length).toBeGreaterThan(0);
      // 每个图层必须有 id 与 type，且 type 合法
      const validTypes = ['fill', 'line', 'symbol', 'circle', 'heatmap', 'fill-extrusion', 'raster', 'hillshade', 'background'];
      for (const layer of style.layers) {
        expect(layer.id).toBeTruthy();
        expect(validTypes).toContain((layer as { type: string }).type);
      }
    }
  });

  it('背景层颜色与主题一致', () => {
    const dark = buildStyle('caoguo-dark');
    const light = buildStyle('caoguo-light');
    const darkBg = dark.layers.find((l) => l.id === 'background') as { paint?: { 'background-color'?: string } };
    const lightBg = light.layers.find((l) => l.id === 'background') as { paint?: { 'background-color'?: string } };
    expect(darkBg.paint?.['background-color']).toBe('#0a0f1e');
    expect(lightBg.paint?.['background-color']).toBe('#f8fafc');
  });

  it('buildStyle 缺省参数返回暗色主题', () => {
    const style = buildStyle();
    expect(style.name).toBe('caoguo-dark');
    expect(style.sources!['caoguo-basemap']).toBeTruthy();
  });

  it('buildStyle 对象式调用（与 README 一致）', () => {
    const style = buildStyle({ theme: 'caoguo-light', sourceUrl: 'https://example.com/tiles.json' });
    const src = style.sources!['caoguo-basemap'] as { url?: string };
    expect(src.url).toBe('https://example.com/tiles.json');
    expect(style.name).toBe('caoguo-light');
  });

  it('buildStyle 兼容旧式位置参数', () => {
    const style = buildStyle('caoguo-dark', { sourceUrl: 'https://example.com/tiles.json' });
    const src = style.sources!['caoguo-basemap'] as { url?: string };
    expect(src.url).toBe('https://example.com/tiles.json');
  });

  it('buildStyle 支持覆盖范围 url', () => {
    const style = buildStyle('caoguo-dark', { sourceUrl: 'https://example.com/tiles.json' });
    const src = style.sources!['caoguo-basemap'] as { url?: string };
    expect(src.url).toBe('https://example.com/tiles.json');
  });

  it('buildStyle 支持覆盖 glyphs', () => {
    const style = buildStyle('caoguo-dark', { glyphs: 'https://example.com/font/{fontstack}/{range}.pbf' });
    expect(style.glyphs).toBe('https://example.com/font/{fontstack}/{range}.pbf');
  });

  it('notoFonts 把符号层字体改为 Noto Sans SC', () => {
    const style = buildStyle({ theme: 'caoguo-dark', notoFonts: true });
    const label = style.layers.find((l) => l.id === 'place-label-major') as {
      layout?: { 'text-font'?: string[] };
    };
    expect(label.layout?.['text-font']?.[0]).toContain('Noto Sans SC');
  });

  it('完整地图要素图层均已落地（水系/道路/铁路/绿地/建筑/边界/注记分级）', () => {
    const style = buildStyle('caoguo-dark');
    const ids = style.layers.map((l) => l.id);
    for (const needed of [
      'water', 'road-minor', 'road-major', 'waterway', 'rail', 'park',
      'building', 'building-extrusion', 'boundary',
      'place-label-major', 'place-label-minor', 'road-label',
    ]) {
      expect(ids).toContain(needed);
    }
  });

  it('buildStyle 不修改原始 darkStyle / lightStyle（不可变）', () => {
    const before = (darkStyle.sources!['caoguo-basemap'] as { url?: string }).url;
    buildStyle('caoguo-dark', { sourceUrl: 'https://example.com/tiles.json' });
    const after = (darkStyle.sources!['caoguo-basemap'] as { url?: string }).url;
    expect(after).toBe(before); // 原始 JSON 未被污染
    expect(after).toBe('https://demotiles.maplibre.org/tiles/tiles.json');
  });

  it('buildStyle 始终提供 glyphs（兜底默认值），symbol 层可渲染', () => {
    // 直接构造一个无 glyphs 的样式验证兜底
    const noGlyphs = { version: 8, name: 'no-glyphs', sources: {}, layers: [], glyphs: undefined } as any;
    registerTheme('cg-no-glyphs', noGlyphs);
    expect(buildStyle({ theme: 'cg-no-glyphs' }).glyphs).toBeTruthy();
    expect(DEFAULT_GLYPHS).toContain('{fontstack}');
  });

  it('核心要素在缩放 3-18 范围内始终有可见图层（无断裂）', () => {
    // PRD 验收项「缩放级别 3-18 层级样式无断裂」的可量化静态校验（复用 checkZoomCoverage）
    for (const name of themeNames) {
      const style = buildStyle(name);
      const report = checkZoomCoverage(style, { minZoom: 3, maxZoom: 18 });
      expect(report.ok).toBe(true);
      expect(report.gaps).toHaveLength(0);
    }
  });
});

describe('checkZoomCoverage（缩放断裂检测工具）', () => {
  it('内置主题 3-18 无断裂', () => {
    const report = checkZoomCoverage(buildStyle('caoguo-dark'));
    expect(report.ok).toBe(true);
    expect(report.gaps).toHaveLength(0);
  });

  it('人为移除 water 层后报告断裂', () => {
    const broken = buildStyle('caoguo-dark');
    broken.layers = broken.layers.filter((l) => l.id !== 'water');
    const report = checkZoomCoverage(broken, { minZoom: 3, maxZoom: 18 });
    expect(report.ok).toBe(false);
    expect(report.gaps.some((g) => g.missing.includes('water'))).toBe(true);
  });

  it('自定义区间生效', () => {
    const report = checkZoomCoverage(buildStyle('caoguo-light'), { minZoom: 10, maxZoom: 12 });
    expect(report.minZoom).toBe(10);
    expect(report.maxZoom).toBe(12);
  });
});

describe('行业主题注册表', () => {
  it('内置主题已在注册表中', () => {
    expect(getRegisteredThemes()).toEqual(expect.arrayContaining(['caoguo-dark', 'caoguo-light']));
    expect(hasTheme('caoguo-dark')).toBe(true);
    expect(hasTheme('caoguo-pipeline')).toBe(false);
  });

  it('registerTheme 后可被 buildStyle 按名构造', () => {
    const fake = { version: 8, name: 'caoguo-test', sources: {}, layers: [] } as any;
    registerTheme('caoguo-test', fake);
    expect(hasTheme('caoguo-test')).toBe(true);
    expect(getRegisteredThemes()).toContain('caoguo-test');
    expect(buildStyle({ theme: 'caoguo-test' }).name).toBe('caoguo-test');
  });
});

describe('injectTheme（SSR 守卫 + 联动）', () => {
  it('浏览器环境设置 data-theme 并触发回调', () => {
    // 提供最小 document mock（node 环境无原生 document）
    const attrs: Record<string, string> = {};
    vi.stubGlobal('document', {
      documentElement: {
        setAttribute: (k: string, v: string) => { attrs[k] = v; },
        getAttribute: (k: string) => attrs[k] ?? null,
      },
    });
    let called = '';
    let eventName = '';
    vi.stubGlobal('window', { dispatchEvent: (e: any) => { eventName = e.type; } });

    injectTheme('caoguo-light', (n) => { called = n; });
    expect(attrs['data-theme']).toBe('caoguo-light');
    expect(called).toBe('caoguo-light');
    expect(eventName).toBe('cg:themechange');

    vi.unstubAllGlobals();
  });

  it('无 document 时不抛错（SSR 守卫）', () => {
    vi.stubGlobal('document', undefined);
    expect(() => injectTheme('caoguo-dark')).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe('buildStyle glyphs 策略', () => {
  it('style 自带 glyphs 时不被兜底覆盖', () => {
    const custom = 'https://my.cdn/font/{fontstack}/{range}.pbf';
    const style = buildStyle({ theme: 'caoguo-dark', glyphs: custom });
    expect(style.glyphs).toBe(custom);
    expect(style.glyphs).not.toBe(DEFAULT_GLYPHS);
  });
});

describe('getThemeList（内置 + 注册表合并）', () => {
  it('默认含内置基础主题', () => {
    expect(getThemeList()).toEqual(expect.arrayContaining(['caoguo-dark', 'caoguo-light']));
  });

  it('注册行业主题后出现在列表中', () => {
    const fake = { version: 8, name: 'cg-x', sources: {}, layers: [] } as any;
    registerTheme('caoguo-x', fake);
    expect(getThemeList()).toContain('caoguo-x');
  });
});

describe('useTheme composable', () => {
  it('setTheme 写入 data-theme 并更新响应式 theme.value', () => {
    const attrs: Record<string, string> = {};
    vi.stubGlobal('document', {
      documentElement: {
        setAttribute: (k: string, v: string) => { attrs[k] = v; },
        getAttribute: (k: string) => attrs[k] ?? null,
      },
    });
    vi.stubGlobal('window', { addEventListener: () => {}, dispatchEvent: () => true });

    const { theme, setTheme, toggle } = useTheme({ initial: 'caoguo-dark' });
    expect(theme.value).toBe('caoguo-dark');
    setTheme('caoguo-light');
    expect(attrs['data-theme']).toBe('caoguo-light');
    expect(theme.value).toBe('caoguo-light');
    toggle();
    expect(theme.value).toBe('caoguo-dark');
    expect(attrs['data-theme']).toBe('caoguo-dark');

    vi.unstubAllGlobals();
  });
});

