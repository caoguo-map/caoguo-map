import { describe, it, expect, vi } from 'vitest';
import {
  stationAccessoryDevices,
  allStationAccessories,
  accessoryHeightMeters,
  Station3D,
} from '../index';
import type { GridTopologyDataset } from '../../types';

const dataset: GridTopologyDataset = {
  devices: [
    { id: 's1', kind: 'substation', lng: 114.31, lat: 30.51, properties: { voltage: '500' } },
    { id: 's2', kind: 'substation', lng: 114.40, lat: 30.60, properties: { voltage: '110' } },
    { id: 't1', kind: 'transformer', lng: 114.32, lat: 30.52 },
    { id: 't2', kind: 'transformer', lng: 114.33, lat: 30.53 },
    { id: 'tw1', kind: 'tower', lng: 114.34, lat: 30.54 },
    { id: 'u1', kind: 'user', lng: 114.35, lat: 30.55 },
    { id: 'orphan', kind: 'transformer', lng: 120.0, lat: 40.0 }, // 不连接 s1
  ],
  lines: [
    { id: 'l1', fromDevice: 's1', toDevice: 't1', lineType: 'distribution' },
    { id: 'l2', fromDevice: 's1', toDevice: 't2', lineType: 'distribution' },
    { id: 'l3', fromDevice: 's1', toDevice: 'tw1', lineType: 'transmission' },
    { id: 'l4', fromDevice: 'tw1', toDevice: 'u1', lineType: 'service' },
    { id: 'l5', fromDevice: 's1', toDevice: 's2', lineType: 'transmission' },
  ],
};

describe('G-6 进阶：附属设备聚合', () => {
  it('stationAccessoryDevices 收集 s1 的非 substation 邻接设备', () => {
    const acc = stationAccessoryDevices('s1', dataset);
    const ids = acc.devices.map((d) => d.id).sort();
    expect(ids).toEqual(['t1', 't2', 'tw1']);
    // u1 通过 tw1 间接连接，不计入直接附属
    expect(ids).not.toContain('u1');
    // lineCount 在下一个 it 中独立断言
  });

  it('lineCount 正确：与 s1 直接相连的所有线路', () => {
    const acc = stationAccessoryDevices('s1', dataset);
    // s1 在 l1/l2/l3/l5 中出现，4 条
    expect(acc.lineCount).toBe(4);
  });

  it('不存在 substation 返回空数组', () => {
    const acc = stationAccessoryDevices('s2', dataset);
    expect(acc.devices).toEqual([]);
    expect(acc.lineCount).toBe(1); // s2 只在 l5 中
  });

  it('未知 substation 返回空', () => {
    const acc = stationAccessoryDevices('xxx', dataset);
    expect(acc.devices).toEqual([]);
    expect(acc.lineCount).toBe(0);
  });

  it('allStationAccessories 返回所有变电站的附属', () => {
    const all = allStationAccessories(dataset);
    expect(all).toHaveLength(2);
    expect(all[0].stationId).toBe('s1');
    expect(all[1].stationId).toBe('s2');
  });

  it('accessoryHeightMeters 按设备类型差异化', () => {
    const tower = { id: 'x', kind: 'tower' as const, lng: 0, lat: 0 };
    const tra = { id: 'y', kind: 'transformer' as const, lng: 0, lat: 0 };
    const user = { id: 'z', kind: 'user' as const, lng: 0, lat: 0 };
    expect(accessoryHeightMeters(tower)).toBe(8);
    expect(accessoryHeightMeters(tra)).toBe(4);
    expect(accessoryHeightMeters(user)).toBe(2);
  });
});

describe('G-6 进阶：Station3D renderAccessories', () => {
  it('renderAccessories=true 生成 2 个 fill-extrusion 图层', () => {
    const addLayer = vi.fn();
    const enableTerrain = vi.fn();
    const m = {
      enableTerrain,
      removeLayer: vi.fn(),
      instance: { addSource: vi.fn(), addLayer, getSource: vi.fn() },
    } as never;
    const s3d = new Station3D({ map: m, dataset, renderAccessories: true });
    s3d.render();
    expect(enableTerrain).toHaveBeenCalled();
    expect(addLayer).toHaveBeenCalledTimes(2);
    const types = addLayer.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toEqual(['fill-extrusion', 'fill-extrusion']);
  });

  it('renderAccessories 默认 false 不生成 accessory 层', () => {
    const addLayer = vi.fn();
    const m = {
      enableTerrain: vi.fn(),
      removeLayer: vi.fn(),
      instance: { addSource: vi.fn(), addLayer, getSource: vi.fn() },
    } as never;
    const s3d = new Station3D({ map: m, dataset });
    s3d.render();
    expect(addLayer).toHaveBeenCalledTimes(1);
  });

  it('clear 同时移除主层和 accessory 层', () => {
    const removeLayer = vi.fn();
    const m = {
      enableTerrain: vi.fn(),
      removeLayer,
      instance: { addSource: vi.fn(), addLayer: vi.fn(), getSource: vi.fn() },
    } as never;
    const s3d = new Station3D({ map: m, dataset, renderAccessories: true });
    s3d.render();
    s3d.clear();
    expect(removeLayer).toHaveBeenCalled();
    expect(removeLayer.mock.calls.some((c) => String(c[0]).includes('-extrusion'))).toBe(true);
    expect(removeLayer.mock.calls.some((c) => String(c[0]).includes('-acc-extrusion'))).toBe(true);
  });
});