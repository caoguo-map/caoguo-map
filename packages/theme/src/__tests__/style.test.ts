import { describe, expect, it } from 'vitest';
import { buildStyle, themeNames, darkStyle, lightStyle } from '../index';

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

  it('buildStyle 支持覆盖矢量源 url', () => {
    const style = buildStyle('caoguo-dark', { sourceUrl: 'https://example.com/tiles.json' });
    const src = style.sources!['caoguo-basemap'] as { url?: string };
    expect(src.url).toBe('https://example.com/tiles.json');
  });

  it('notoFonts 把符号层字体改为 Noto Sans SC', () => {
    const style = buildStyle('caoguo-dark', { notoFonts: true });
    const label = style.layers.find((l) => l.id === 'place-label') as {
      layout?: { 'text-font'?: string[] };
    };
    expect(label.layout?.['text-font']?.[0]).toContain('Noto Sans SC');
  });

  it('buildStyle 不修改原始 darkStyle / lightStyle（不可变）', () => {
    const before = (darkStyle.sources!['caoguo-basemap'] as { url?: string }).url;
    buildStyle('caoguo-dark', { sourceUrl: 'https://example.com/tiles.json' });
    const after = (darkStyle.sources!['caoguo-basemap'] as { url?: string }).url;
    expect(after).toBe(before); // 原始 JSON 未被污染
    expect(after).toBe('https://demotiles.maplibre.org/tiles/tiles.json');
  });
});
