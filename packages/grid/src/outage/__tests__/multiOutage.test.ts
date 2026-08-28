import { describe, it, expect } from 'vitest';
import { analyzeMultiOutage } from '../multiOutage';
import type { GridTopologyDataset } from '../../types';

const dataset: GridTopologyDataset = {
  devices: [
    { id: 'd1', kind: 'plant', lng: 114.3, lat: 30.5, name: '电厂', properties: { voltage: '500', status: 'running' } },
    { id: 'd2', kind: 'substation', lng: 114.31, lat: 30.51, name: 'A 站', properties: { voltage: '220', status: 'running' } },
    { id: 'd3', kind: 'substation', lng: 114.32, lat: 30.52, name: 'B 站', properties: { voltage: '110', status: 'running' } },
    { id: 'd4', kind: 'transformer', lng: 114.33, lat: 30.53, name: '配变 X', properties: { voltage: '10', status: 'running' } },
    { id: 'u1', kind: 'user', lng: 114.34, lat: 30.54 },
    { id: 'u2', kind: 'user', lng: 114.35, lat: 30.55 },
  ],
  lines: [
    { id: 'l1', fromDevice: 'd1', toDevice: 'd2', lineType: 'transmission', properties: { voltage: '220' } },
    { id: 'l2', fromDevice: 'd1', toDevice: 'd3', lineType: 'transmission', properties: { voltage: '110' } },
    { id: 'l3', fromDevice: 'd2', toDevice: 'd4', lineType: 'distribution', properties: { voltage: '10' } },
    { id: 'l4', fromDevice: 'd3', toDevice: 'd4', lineType: 'distribution', properties: { voltage: '10' } },
  ],
};

describe('analyzeMultiOutage（O-7 多故障叠加）', () => {
  it('单故障：与 analyzeOutage 结果一致', () => {
    const r = analyzeMultiOutage(dataset, ['d1']);
    expect(r.faultCount).toBe(1);
    expect(r.results.length).toBe(1);
    expect(r.criticalDeviceIds).toEqual([]); // 单故障无叠加
  });

  it('多故障：影响面去重合并，共保设备计入叠加', () => {
    // d2、d3 同时故障：d4 由两条馈线供电，会被双方同时波及
    const r = analyzeMultiOutage(dataset, ['d2', 'd3']);
    expect(r.faultCount).toBe(2);
    const ids = r.affectedDevices.map((d) => d.id);
    expect(ids).toContain('d2');
    expect(ids).toContain('d3');
    expect(ids).toContain('d4'); // 双路同时失电
    const d4 = r.affectedDevices.find((d) => d.id === 'd4')!;
    expect(d4.count).toBe(2); // 被两个故障叠加影响
    expect(r.criticalDeviceIds).toContain('d4');
  });

  it('criticalDeviceIds 按 count 降序', () => {
    const r = analyzeMultiOutage(dataset, ['d1', 'd2', 'd3']);
    const counts = r.affectedDevices.filter((d) => d.count >= 2).map((d) => d.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('userIdsPerFault 注入时可计算用户级叠加', () => {
    const r = analyzeMultiOutage(dataset, ['d2', 'd3'], {
      userIdsPerFault: [['u1', 'u2'], ['u2']],
    });
    expect(r.totalAffectedUsers).toBe(2); // u1、u2 去重
    expect(r.overlappedUserIds).toEqual(['u2']); // u2 被双故障波及
  });

  it('不注入 userIdsPerFault 时退化为各故障统计之和', () => {
    const r = analyzeMultiOutage(dataset, ['d2', 'd3']);
    const perFault = r.results.reduce((s, x) => s + x.affectedUsers.total, 0);
    expect(r.totalAffectedUsers).toBe(perFault);
  });

  it('空故障列表返回零结果', () => {
    const r = analyzeMultiOutage(dataset, []);
    expect(r.faultCount).toBe(0);
    expect(r.results).toEqual([]);
    expect(r.affectedDevices).toEqual([]);
    expect(r.criticalDeviceIds).toEqual([]);
  });
});
