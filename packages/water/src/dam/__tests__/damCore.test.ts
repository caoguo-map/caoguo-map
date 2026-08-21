import { describe, it, expect } from 'vitest';
import {
  updateStorageRate,
  reservoirStatus,
  downstreamLevelChange,
  simulateDamSchedule,
} from '../damCore';
import type { WaterDataset } from '../../types';

describe('updateStorageRate', () => {
  it('出库增加蓄水率下降', () => {
    expect(updateStorageRate(0.6, 10)).toBeLessThan(0.6);
  });

  it('蓄水率在 [0,1] 区间', () => {
    expect(updateStorageRate(0.05, 20)).toBe(0);
    expect(updateStorageRate(0.95, -20)).toBe(1);
  });
});

describe('reservoirStatus', () => {
  it('满库泄洪', () => {
    expect(reservoirStatus(0.95)).toBe('discharging');
  });
  it('低库容蓄水', () => {
    expect(reservoirStatus(0.2)).toBe('storing');
  });
  it('正常平衡', () => {
    expect(reservoirStatus(0.5)).toBe('balanced');
  });
});

describe('downstreamLevelChange', () => {
  it('距离越远影响越小', () => {
    const near = downstreamLevelChange(100, 5);
    const far = downstreamLevelChange(100, 50);
    expect(near).toBeGreaterThan(far);
  });
});

describe('simulateDamSchedule', () => {
  const dataset: WaterDataset = {
    features: [
      { id: 'res-a', kind: 'reservoir', lng: 114.3, lat: 30.5, properties: { storageRate: 0.5 } },
      { id: 'ws-1', kind: 'waterStation', lng: 114.4, lat: 30.5, properties: { waterLevel: 25 } },
    ],
  };

  it('调度方案影响下游水位', () => {
    const r = simulateDamSchedule(dataset, { outflows: { 'res-a': 50 } });
    expect(r.reservoirStates.length).toBe(1);
    expect(r.downstreamLevels.length).toBe(1);
    expect(r.downstreamLevels[0].levelChange).toBeGreaterThan(0);
    expect(r.downstreamLevels[0].level).toBeGreaterThan(25);
  });

  it('无调度时水位不变', () => {
    const r = simulateDamSchedule(dataset, { outflows: {} });
    expect(r.downstreamLevels[0].levelChange).toBe(0);
  });
});
