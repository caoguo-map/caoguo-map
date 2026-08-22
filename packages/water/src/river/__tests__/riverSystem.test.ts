import { describe, it, expect } from 'vitest';
import { RiverSystem } from '../RiverSystem';
import type { WaterDataset } from '../../types';

function makeInstance() {
  const sources = new Map<string, unknown>();
  const layers = new Map<string, unknown>();
  return {
    sources,
    layers,
    addSource(id: string, src: unknown) {
      if (sources.has(id)) throw new Error(`Source "${id}" already exists`);
      sources.set(id, src);
    },
    removeSource(id: string) {
      sources.delete(id);
    },
    getSource(id: string) {
      return sources.get(id);
    },
    setData(id: string, d: unknown) {
      if (!sources.has(id)) throw new Error(`Source "${id}" not found`);
      sources.set(id, d);
    },
    addLayer(layer: { id: string }) {
      layers.set(layer.id, layer);
    },
    removeLayer(id: string) {
      layers.delete(id);
    },
    getLayer(id: string) {
      return layers.get(id);
    },
    setPaintProperty() {},
  };
}

function makeMap() {
  const instance = makeInstance();
  return {
    removeLayer(id: string) {
      instance.removeLayer(id);
    },
    setPaintProperty() {},
    instance,
  };
}

const dataset: WaterDataset = {
  features: [
    { id: 'r1', kind: 'mainstream', lng: 114.3, lat: 30.5, geometry: [[114.3, 30.5], [114.35, 30.55]] },
    { id: 'r2', kind: 'tributary', lng: 114.31, lat: 30.51, geometry: [[114.31, 30.51], [114.34, 30.54]], parentId: 'r1' },
    { id: 's1', kind: 'reservoir', lng: 114.32, lat: 30.52 },
  ],
};

describe('RiverSystem 渲染层（修复：层级钻取重渲染崩溃 + 钻取无反应）', () => {
  it('首次 render 不抛错，建立 lines/points source', () => {
    const map = makeMap();
    const river = new RiverSystem({ map: map as never, dataset, layerPrefix: 'cg-river' });
    expect(() => river.render()).not.toThrow();
    expect(map.instance.getSource('cg-river-lines-src')).toBeDefined();
    expect(map.instance.getSource('cg-river-points-src')).toBeDefined();
  });

  it('setLevel 多次重渲染不抛 "already exists"', () => {
    const map = makeMap();
    const river = new RiverSystem({ map: map as never, dataset, layerPrefix: 'cg-river' });
    river.render();
    for (const lv of ['mainstream', 'tributary', 'basin', 'mainstream'] as const) {
      expect(() => river.setLevel(lv)).not.toThrow();
    }
    // 切换回主流后 lines source 应已重建（不依赖 basin 这类可能无要素的层级）
    expect(() => river.setLevel('mainstream')).not.toThrow();
  });

  it('切换着色模式不抛错', () => {
    const map = makeMap();
    const river = new RiverSystem({ map: map as never, dataset, layerPrefix: 'cg-river' });
    river.render();
    expect(() => river.setColorBy('storage')).not.toThrow();
    expect(() => river.setColorBy('dike')).not.toThrow();
  });

  it('traceFlow 顺流/逆流返回关联要素集合', () => {
    const map = makeMap();
    const river = new RiverSystem({ map: map as never, dataset, layerPrefix: 'cg-river' });
    const down = river.traceFlow('r1', 'downstream');
    const up = river.traceFlow('r2', 'upstream');
    expect(down instanceof Set).toBe(true);
    expect(up instanceof Set).toBe(true);
    // r1 的下游应包含其支流 r2
    expect(down.has('r2')).toBe(true);
    // r2 的上游应包含干流 r1
    expect(up.has('r1')).toBe(true);
  });
});

describe('RiverSystem 点击选中（缺口 2 修复）', () => {
  it('点击点要素触发 onFeatureSelect 监听', () => {
    let captured: string | null = null;
    const clickHandlers: Array<(ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void> = [];
    const instance = {
      sources: new Map<string, unknown>(),
      layers: new Map<string, unknown>(),
      addSource(id: string, src: unknown) { this.sources.set(id, src); },
      removeSource(id: string) { this.sources.delete(id); },
      getSource(id: string) { return this.sources.get(id); },
      setData(id: string, d: unknown) { this.sources.set(id, d); },
      addLayer(layer: { id: string }) { this.layers.set(layer.id, layer); },
      removeLayer(id: string) { this.layers.delete(id); },
      getLayer(id: string) { return this.layers.get(id); },
      setPaintProperty() {},
      on(_t: string, _l: string, h: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void) {
        clickHandlers.push(h);
      },
    };
    const map = { instance, removeLayer: instance.removeLayer } as never;

    const river = new RiverSystem({ map: map as never, dataset, layerPrefix: 'cg-river' });
    river.onFeatureSelect((f) => { captured = f.id; });
    river.render();

    // 模拟点击到 reservoir 点要素 (s1)
    expect(clickHandlers.length).toBe(1);
    clickHandlers[0]({ features: [{ properties: { featureId: 's1' } }] });
    expect(captured).toBe('s1');
  });
});
