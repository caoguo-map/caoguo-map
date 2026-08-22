import { describe, it, expect, vi } from 'vitest';
import { stationFootprint, stationHeightMeters, stationHalfSizeMeters, Station3D } from '../index';
import type { GridTopologyDataset } from '../../types';

const dataset: GridTopologyDataset = {
  devices: [
    { id: 's1', kind: 'substation', lng: 114.31, lat: 30.51, properties: { voltage: '500', capacity: 750 } },
    { id: 's2', kind: 'substation', lng: 114.32, lat: 30.52, properties: { voltage: '110' } },
    { id: 't1', kind: 'transformer', lng: 114.33, lat: 30.53 },
  ],
  lines: [],
};

describe('G-6 station3dCore 纯函数', () => {
  it('stationHeightMeters 按电压等级映射，容量微调', () => {
    expect(stationHeightMeters(dataset.devices[0])).toBeGreaterThan(120); // 500kV 基础120 + 容量
    expect(stationHeightMeters(dataset.devices[1])).toBe(50); // 110kV
    const capped = stationHeightMeters({ id: 'x', kind: 'substation', lng: 0, lat: 0, properties: { capacity: 99999 } });
    expect(capped).toBeLessThanOrEqual(200);
  });

  it('stationFootprint 生成闭合 5 点矩形', () => {
    const fp = stationFootprint(dataset.devices[0]);
    expect(fp.type).toBe('Polygon');
    expect(fp.coordinates[0]).toHaveLength(5);
    // 闭合
    const ring = fp.coordinates[0];
    expect(ring[0]).toEqual(ring[4]);
    // 半边长随容量增大
    expect(stationHalfSizeMeters(dataset.devices[0])).toBeGreaterThan(stationHalfSizeMeters(dataset.devices[2]));
  });
});

describe('G-6 Station3D 渲染薄壳', () => {
  it('render 仅对 substation 生成 fill-extrusion 图层并启用地形', () => {
    const enableTerrain = vi.fn();
    const addLayer = vi.fn();
    const m = {
      enableTerrain,
      removeLayer: vi.fn(),
      instance: { addSource: vi.fn(), addLayer, getSource: vi.fn() },
    } as never;
    const s3d = new Station3D({ map: m, dataset });
    s3d.render();
    expect(enableTerrain).toHaveBeenCalled();
    expect(addLayer).toHaveBeenCalledTimes(1);
    const layer = addLayer.mock.calls[0][0] as { type: string; paint: Record<string, unknown> };
    expect(layer.type).toBe('fill-extrusion');
    expect(layer.paint['fill-extrusion-height']).toBeDefined();
  });
});
