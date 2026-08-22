import { describe, it, expect, vi } from 'vitest';
import { DamOperation } from '../DamOperation';
import type { WaterDataset } from '../../types';

const dataset: WaterDataset = {
  features: [
    { id: 'res-a', kind: 'reservoir', lng: 114.3, lat: 30.5, properties: { storageRate: 0.5 } },
    { id: 'g1', kind: 'gate', lng: 114.4, lat: 30.5, properties: { gateStatus: 'open', dischargeCapacity: 120 } },
    { id: 'ws-1', kind: 'waterStation', lng: 114.4, lat: 30.5, properties: { waterLevel: 25 } },
  ],
};

function makeMap() {
  return {
    addSource: vi.fn(),
    getSource: vi.fn(() => null),
    setData: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
  };
}

describe('DamOperation (水库联合调度封装)', () => {
  it('renderGates 渲染闸站点层', () => {
    const mlMap = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const dam = new DamOperation({ map, dataset });
    dam.renderGates();
    expect(mlMap.addLayer).toHaveBeenCalled();
  });

  it('simulate 基于 outflows 影响下游水位', () => {
    const map = { instance: makeMap(), removeLayer: makeMap().removeLayer } as never;
    const dam = new DamOperation({ map, dataset });
    const r = dam.simulate({ outflows: { 'res-a': 50 } });
    expect(r.downstreamLevels[0].levelChange).toBeGreaterThan(0);
  });

  it('setGateFlow 调整出库并重算', () => {
    const map = { instance: makeMap(), removeLayer: makeMap().removeLayer } as never;
    const dam = new DamOperation({ map, dataset });
    const r = dam.setGateFlow('res-a', 80);
    expect(r.downstreamLevels[0].level).toBeGreaterThan(25);
  });

  it('gateDetail 提取闸站详情', () => {
    const map = { instance: makeMap(), removeLayer: makeMap().removeLayer } as never;
    const dam = new DamOperation({ map, dataset });
    expect(dam.gateDetail('g1')).toMatchObject({ id: 'g1', status: 'open', dischargeCapacity: 120 });
  });

  it('storageRate 钳制在 [0,1]', () => {
    const map = { instance: makeMap(), removeLayer: makeMap().removeLayer } as never;
    const dam = new DamOperation({ map, dataset });
    // 大量出库 → 蓄水率下降并钳制到 0
    expect(dam.storageRate('res-a', 999)).toBe(0);
    // 大量入库 → 蓄水率上升并钳制到 1
    expect(dam.storageRate('res-a', -999)).toBe(1);
  });
});
