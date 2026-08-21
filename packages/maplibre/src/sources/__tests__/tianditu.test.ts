import { describe, expect, it } from 'vitest';
import {
  tiandituTileUrls,
  buildTiandituSources,
  tiandituStyle,
  addTiandituBaseMap,
  MissingTokenError,
  type TiandituOptions,
} from '../index';

const opts: TiandituOptions = { token: 'MY_TK_123' };

describe('天地图 WMTS URL 构建（F-1.2）', () => {
  it('URL 含 WMTS 标准参数与 token', () => {
    const urls = tiandituTileUrls('vec', opts);
    expect(urls.length).toBe(8);
    const u = urls[0];
    expect(u).toContain('tianditu.gov.cn/vec_w/wmts');
    expect(u).toContain('SERVICE=WMTS');
    expect(u).toContain('VERSION=1.0.0');
    expect(u).toContain('LAYER=vec');
    expect(u).toContain('TILEMATRIX={z}');
    expect(u).toContain('TILEROW={y}');
    expect(u).toContain('TILECOL={x}');
    expect(u).toContain('tk=' + encodeURIComponent('MY_TK_123'));
  });

  it('子域 0-7 均匀分布', () => {
    const urls = tiandituTileUrls('img', opts);
    const subs = urls.map((u) => u.match(/t(\d)\.tianditu/)?.[1]);
    expect(new Set(subs).size).toBe(8);
  });

  it('英文注记层使用 eva/eia/eta', () => {
    const urls = tiandituTileUrls('cva', { ...opts, lang: 'en' });
    expect(urls[0]).toContain('/eva_w/wmts');
    expect(urls[0]).toContain('LAYER=eva');
  });

  it('中文注记层使用 cva/cia/cta', () => {
    const urls = tiandituTileUrls('cva', opts);
    expect(urls[0]).toContain('/cva_w/wmts');
  });
});

describe('buildTiandituSources', () => {
  it('vector 返回底图 vec + 注记 cva', () => {
    const sources = buildTiandituSources('vector', opts);
    expect(sources.map((s) => s.id)).toEqual(['tianditu-vec', 'tianditu-cva']);
    expect(sources[0].isLabel).toBe(false);
    expect(sources[1].isLabel).toBe(true);
    expect(sources[0].source.type).toBe('raster');
    expect(sources[0].source.maxzoom).toBe(18);
  });

  it('satellite / terrain 各自对应 img/ter + cia/cta', () => {
    expect(buildTiandituSources('satellite', opts).map((s) => s.id)).toEqual([
      'tianditu-img',
      'tianditu-cia',
    ]);
    expect(buildTiandituSources('terrain', opts).map((s) => s.id)).toEqual([
      'tianditu-ter',
      'tianditu-cta',
    ]);
  });

  it('支持自定义 tileSize / maxzoom', () => {
    const s = buildTiandituSources('vector', { ...opts, tileSize: 512, maxzoom: 20 });
    expect(s[0].source.tileSize).toBe(512);
    expect(s[0].source.maxzoom).toBe(20);
  });
});

describe('tiandituStyle', () => {
  it('生成含底图+注记两层的 v8 style', () => {
    const style = tiandituStyle('vector', opts);
    expect(style.version).toBe(8);
    expect(Object.keys(style.sources!)).toEqual(['tianditu-vec', 'tianditu-cva']);
    expect(style.layers.length).toBe(2);
    expect(style.layers[0].type).toBe('raster');
  });

  it('缺 token 抛出 MissingTokenError', () => {
    expect(() => tiandituStyle('vector', { token: '' })).toThrow(MissingTokenError);
  });
});

describe('addTiandituBaseMap', () => {
  it('缺 token 抛出 MissingTokenError', () => {
    const fakeMap = { addSource() {}, addLayer() {}, getSource: () => undefined, getLayer: () => undefined } as never;
    expect(() => addTiandituBaseMap({ token: '', map: fakeMap })).toThrow(MissingTokenError);
  });

  it('向 map 注入两个源与两个图层', () => {
    const added: string[] = [];
    const map = {
      addSource(id: string) { added.push('src:' + id); },
      addLayer(l: { id: string }) { added.push('layer:' + l.id); },
      getSource: () => undefined,
      getLayer: () => undefined,
    } as never;
    addTiandituBaseMap({ token: 'TK', map });
    expect(added).toEqual(['src:tianditu-vec', 'layer:tianditu-vec', 'src:tianditu-cva', 'layer:tianditu-cva']);
  });
});
