import { describe, it, expect } from 'vitest';
import { buildGridAdjacency, gridBfs, haversine } from '../gridGraph';
import type { GridTopologyDataset } from '../../types';

const dataset: GridTopologyDataset = {
  devices: [
    { id: 'plant', kind: 'plant', lng: 114.2, lat: 30.5, properties: { voltage: '500' } },
    { id: 'sub-a', kind: 'substation', lng: 114.3, lat: 30.5, properties: { voltage: '220' } },
    { id: 'sub-b', kind: 'substation', lng: 114.4, lat: 30.5, properties: { voltage: '220' } },
    { id: 'trans', kind: 'transformer', lng: 114.45, lat: 30.5, properties: { voltage: '10' } },
  ],
  lines: [
    { id: 'l1', fromDevice: 'plant', toDevice: 'sub-a', lineType: 'transmission', properties: { voltage: '500' } },
    { id: 'l2', fromDevice: 'sub-a', toDevice: 'sub-b', lineType: 'transmission', properties: { voltage: '220' } },
    { id: 'l3', fromDevice: 'sub-b', toDevice: 'trans', lineType: 'distribution', properties: { voltage: '10' } },
  ],
  users: [{ id: 'u1', kind: 'residential', deviceId: 'trans', lng: 114.45, lat: 30.5 }],
};

describe('buildGridAdjacency', () => {
  it('构建双向邻接表', () => {
    const adj = buildGridAdjacency(dataset);
    expect(adj.get('plant')?.map((e) => e.to)).toContain('sub-a');
    expect(adj.get('sub-a')?.map((e) => e.to)).toContain('plant');
  });
});

describe('gridBfs', () => {
  it('下游方向遍历', () => {
    const adj = buildGridAdjacency(dataset);
    const reached = gridBfs(adj, dataset, 'sub-a', 'downstream');
    expect(reached.has('sub-b')).toBe(true);
    expect(reached.has('trans')).toBe(true);
    expect(reached.has('plant')).toBe(false); // 下游不含上游电厂
  });

  it('上游方向遍历（供电路径追踪）', () => {
    const adj = buildGridAdjacency(dataset);
    const reached = gridBfs(adj, dataset, 'trans', 'upstream');
    expect(reached.has('sub-b')).toBe(true);
    expect(reached.has('sub-a')).toBe(true);
    expect(reached.has('plant')).toBe(true);
  });
});

describe('haversine', () => {
  it('两点距离计算', () => {
    const d = haversine(114.0, 30.0, 114.01, 30.0);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });
});
