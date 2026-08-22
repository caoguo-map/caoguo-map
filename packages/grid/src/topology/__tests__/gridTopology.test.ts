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
    { id: 'd1', kind: 'plant', lng: 114.3, lat: 30.5, name: '阳逻电厂', properties: { installedCapacity: 1200, plantType: 'thermal' } },
    { id: 'd2', kind: 'substation', lng: 114.31, lat: 30.51, name: '关山变电站', properties: { voltage: '500', code: 'SS-001', capacity: 750, status: 'running' } },
    { id: 'd3', kind: 'transformer', lng: 114.32, lat: 30.52, properties: { voltage: '10', code: 'TT-009', capacity: 20 } },
    { id: 'u1', kind: 'user', lng: 114.33, lat: 30.53 },
    { id: 'u2', kind: 'user', lng: 114.34, lat: 30.54 },
  ],
  lines: [
    { id: 'l1', fromDevice: 'd1', toDevice: 'd2', lineType: 'transmission', properties: { voltage: '500' } },
    { id: 'l2', fromDevice: 'd2', toDevice: 'd3', lineType: 'distribution', properties: { voltage: '10' } },
    { id: 'l3', fromDevice: 'd3', toDevice: 'u1', lineType: 'service', properties: { voltage: '0.4' } },
    { id: 'l4', fromDevice: 'd3', toDevice: 'u2', lineType: 'service', properties: { voltage: '0.4' } },
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
    expect(() => topo.setColorBy('load')).not.toThrow();
    expect(() => topo.setColorBy('year')).not.toThrow();
  });
});

describe('GridTopology 设备搜索与卡片（PRD G-4 / G-2）', () => {
  it('findDevice 按名称/类型匹配（G-4）', () => {
    const topo = new GridTopology({ map: makeMap() as never, dataset, layerPrefix: 'g' });
    expect(topo.findDevice('关山')?.id).toBe('d2');
    expect(topo.findDevice({ kind: 'substation' })?.id).toBe('d2');
    expect(topo.findDevice('SS-001')?.id).toBe('d2');
    expect(topo.findDevice('不存在的设备')).toBeUndefined();
  });

  it('locateDevice 命中后调用底层 flyTo（G-4 定位）', () => {
    const map = makeMap();
    const topo = new GridTopology({ map: map as never, dataset, layerPrefix: 'g' });
    const flyTo = (map.instance as unknown as { flyTo?: (o: unknown) => void }).flyTo;
    let called = false;
    (map.instance as unknown as { flyTo: (o: unknown) => void }).flyTo = (o: unknown) => {
      called = true;
      expect((o as { center: [number, number] }).center).toEqual([114.31, 30.51]);
    };
    const dev = topo.locateDevice('关山变电站');
    expect(dev?.id).toBe('d2');
    expect(called).toBe(true);
  });

  it('getDeviceDetail 返回关联线路数/下游用户数/卡片字段（G-2）', () => {
    const topo = new GridTopology({ map: makeMap() as never, dataset, layerPrefix: 'g' });
    const d2 = topo.getDeviceDetail('d2');
    expect(d2?.connectedLines).toBe(2); // l1 + l2
    expect(d2?.downstreamUserCount).toBe(2); // u1 + u2
    expect(d2?.cardInfo.title).toBe('关山变电站');
    expect(d2?.cardInfo.capacityLabel).toContain('MVA');

    const d3 = topo.getDeviceDetail('d3');
    expect(d3?.connectedLines).toBe(3); // l2 + l3 + l4
    expect(d3?.downstreamUserCount).toBe(2);

    expect(topo.getDeviceDetail('no-such')).toBeUndefined();
  });
});
