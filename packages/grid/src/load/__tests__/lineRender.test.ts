import { describe, it, expect, vi } from 'vitest';
import { LoadHeatmap } from '../loadClass';
import type { GridTopologyDataset } from '../../types';

function makeMap() {
  const layers = new Set<string>();
  return {
    layers,
    removeLayer(id: string) {
      layers.delete(id);
    },
    instance: {
      addSource: vi.fn(),
      addLayer: vi.fn((l: { id: string }) => {
        layers.add(l.id);
      }),
      getSource: vi.fn(() => undefined),
    },
  } as any;
}

const dataset: GridTopologyDataset = {
  devices: [
    { id: 'd1', kind: 'transformer', lng: 114.3, lat: 30.5, properties: { loadRate: 0.9 } },
    { id: 'd2', kind: 'transformer', lng: 114.31, lat: 30.51, properties: { loadRate: 0.4 } },
  ],
  lines: [
    // 有 loadRate → 参与线路着色
    { id: 'l1', fromDevice: 'd1', toDevice: 'd2', lineType: 'distribution', properties: { loadRate: 0.85 } },
    // 无 loadRate → 不参与
    { id: 'l2', fromDevice: 'd1', toDevice: 'd2', lineType: 'service', properties: {} },
  ],
};

describe('LH-2 线路负荷着色', () => {
  it('render 同时创建线路层与设备点层', () => {
    const map = makeMap();
    const hm = new LoadHeatmap({ map, dataset, layerPrefix: 'lh' });
    hm.render();
    expect(map.layers.has('lh-lines')).toBe(true);
    expect(map.layers.has('lh-circle')).toBe(true);
  });

  it('仅含 loadRate 的线路进入要素集，颜色按负荷率分级', () => {
    const map = makeMap();
    const hm = new LoadHeatmap({ map, dataset, layerPrefix: 'lh' });
    hm.render();
    const call = map.instance.addSource.mock.calls.find(([id]) => id === 'lh-lines-src');
    const features = call?.[1]?.features ?? [];
    expect(features.length).toBe(1); // l2 无 loadRate 被排除
    expect(features[0].properties.lineId).toBe('l1');
    expect(features[0].properties.color).toBe('#ef4444'); // 0.85 ≥ 0.8 过载红
  });

  it('clear 同时清除线路层与点层', () => {
    const map = makeMap();
    const hm = new LoadHeatmap({ map, dataset, layerPrefix: 'lh' });
    hm.render();
    hm.clear();
    expect(map.layers.has('lh-lines')).toBe(false);
    expect(map.layers.has('lh-circle')).toBe(false);
  });

  it('无带负荷线路时不创建线路层', () => {
    const map = makeMap();
    const empty: GridTopologyDataset = { ...dataset, lines: [dataset.lines[1]] };
    new LoadHeatmap({ map, dataset: empty, layerPrefix: 'lh' }).render();
    expect(map.layers.has('lh-lines')).toBe(false);
  });
});
