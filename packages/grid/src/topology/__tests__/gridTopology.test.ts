import { describe, it, expect } from 'vitest';
import { GridTopology } from '../GridTopology';
import type { GridTopologyDataset } from '../../types';

/** 模拟原生 maplibre map：同名 addSource 重复会抛错（复现真实崩溃） */
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

const dataset: GridTopologyDataset = {
  devices: [
    { id: 'd1', kind: 'plant', lng: 114.3, lat: 30.5 },
    { id: 'd2', kind: 'substation', lng: 114.31, lat: 30.51, properties: { voltage: '500' } },
    { id: 'd3', kind: 'transformer', lng: 114.32, lat: 30.52, properties: { voltage: '10' } },
  ],
  lines: [
    { id: 'l1', fromDevice: 'd1', toDevice: 'd2', lineType: 'transmission', properties: { voltage: '500' } },
    { id: 'l2', fromDevice: 'd2', toDevice: 'd3', lineType: 'distribution', properties: { voltage: '10' } },
  ],
};

describe('GridTopology 渲染层（修复：层级切换重渲染崩溃）', () => {
  it('首次 render 不抛错，lines/device 两个 source 已建立', () => {
    const map = makeMap();
    const topo = new GridTopology({ map: map as never, dataset, colorBy: 'voltage', layerPrefix: 'g' });
    expect(() => topo.render()).not.toThrow();
    expect(map.instance.getSource('g-lines-src')).toBeDefined();
    expect(map.instance.getSource('g-devices-src')).toBeDefined();
  });

  it('setLevel 重渲染（clear+addSource 多轮）不抛 "already exists"', () => {
    const map = makeMap();
    const topo = new GridTopology({ map: map as never, dataset, colorBy: 'voltage', layerPrefix: 'g' });
    topo.render();
    // 连续切 3 次层级，每次都 clear + 重建 source（旧实现会抛错）
    for (const lv of ['L2', 'L3', 'L2'] as const) {
      expect(() => topo.setLevel(lv)).not.toThrow();
    }
    // source 仍唯一存在（clear 已移除）
    expect(map.instance.getSource('g-lines-src')).toBeDefined();
  });

  it('切换着色模式（voltage/loadRate/commissionYear）不抛错', () => {
    const map = makeMap();
    const topo = new GridTopology({ map: map as never, dataset, colorBy: 'voltage', layerPrefix: 'g' });
    topo.render();
    expect(() => topo.setColorBy('loadRate')).not.toThrow();
    expect(() => topo.setColorBy('commissionYear')).not.toThrow();
  });
});
