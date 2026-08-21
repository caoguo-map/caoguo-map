import { describe, it, expect } from 'vitest';
import { analyzeOutage } from '../outageCore';
import { predictLoad, overloadedDevices, loadRateColor } from '../../load/loadCore';
import type { GridTopologyDataset } from '../../types';

const dataset: GridTopologyDataset = {
  devices: [
    { id: 'plant', kind: 'plant', lng: 114.2, lat: 30.5, properties: { voltage: '500' } },
    { id: 'sub-a', kind: 'substation', lng: 114.3, lat: 30.5, properties: { voltage: '220' } },
    { id: 'trans-a', kind: 'transformer', lng: 114.4, lat: 30.5, properties: { voltage: '10', loadRate: 0.9 } },
    { id: 'trans-b', kind: 'transformer', lng: 114.45, lat: 30.5, properties: { voltage: '10', loadRate: 0.3 } },
  ],
  lines: [
    { id: 'l1', fromDevice: 'plant', toDevice: 'sub-a', lineType: 'transmission', properties: { voltage: '500' } },
    { id: 'l2', fromDevice: 'sub-a', toDevice: 'trans-a', lineType: 'distribution', properties: { voltage: '10' } },
    { id: 'l3', fromDevice: 'sub-a', toDevice: 'trans-b', lineType: 'distribution', properties: { voltage: '10' } },
  ],
  users: [
    { id: 'u1', kind: 'residential', deviceId: 'trans-a', lng: 114.4, lat: 30.5 },
    { id: 'u2', kind: 'important', name: '市医院', reason: '医院', deviceId: 'trans-a', lng: 114.41, lat: 30.51 },
    { id: 'u3', kind: 'commercial', deviceId: 'trans-b', lng: 114.45, lat: 30.5 },
  ],
};

describe('analyzeOutage', () => {
  it('变电站故障影响下游配变与用户', () => {
    const r = analyzeOutage(dataset, 'sub-a');
    expect(r.affectedUsers.total).toBeGreaterThanOrEqual(2);
    expect(r.affectedUsers.important.length).toBe(1);
    expect(r.affectedUsers.important[0].name).toBe('市医院');
  });

  it('线路故障影响 toDevice 下游', () => {
    const r = analyzeOutage(dataset, 'l2');
    expect(r.affectedDevices.some((d) => d.id === 'trans-a')).toBe(true);
  });

  it('故障设备不存在时抛错', () => {
    expect(() => analyzeOutage(dataset, 'not-exist')).toThrow();
  });
});

describe('loadCore', () => {
  it('负荷预测高温修正', () => {
    const normal = predictLoad({ base: 100, temperature: 25 });
    const hot = predictLoad({ base: 100, temperature: 31 });
    expect(hot).toBeGreaterThan(normal);
  });

  it('过载设备识别（负荷率 ≥ 80%）', () => {
    const overloaded = overloadedDevices(dataset);
    expect(overloaded.map((d) => d.id)).toContain('trans-a');
    expect(overloaded.map((d) => d.id)).not.toContain('trans-b');
  });

  it('负荷率着色', () => {
    expect(loadRateColor(0.9)).toBe('#ef4444');
    expect(loadRateColor(0.3)).toBe('#22c55e');
  });
});
