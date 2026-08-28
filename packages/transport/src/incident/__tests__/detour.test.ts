import { describe, it, expect } from 'vitest';
import type { RoadNetworkDataset } from '../../types';
import { detourToPolyline, findConnectingEdge, circleRing } from '../detour';

const dataset: RoadNetworkDataset = {
  nodes: [
    { id: 'a', kind: 'intersection', lng: 114.3, lat: 30.5 },
    { id: 'b', kind: 'intersection', lng: 114.31, lat: 30.5 },
    { id: 'c', kind: 'intersection', lng: 114.32, lat: 30.5 },
  ],
  edges: [
    {
      id: 'e1',
      fromNode: 'a',
      toNode: 'b',
      roadClass: 'urban',
      length: 1000,
      geometry: [
        [114.3, 30.5],
        [114.305, 30.502],
        [114.31, 30.5],
      ],
    },
    { id: 'e2', fromNode: 'b', toNode: 'c', roadClass: 'urban' },
  ],
};

describe('detourToPolyline（IM-4 绕行路径数据层）', () => {
  it('节点数不足时返回空几何', () => {
    expect(detourToPolyline(dataset, []).coordinates).toEqual([]);
    expect(detourToPolyline(dataset, ['a']).coordinates).toEqual([]);
  });

  it('优先使用路段自带 geometry（保留真实走向，点数多于纯节点路径）', () => {
    const r = detourToPolyline(dataset, ['a', 'b']);
    // geometry 3 点：起点 + 后 2 点
    expect(r.coordinates.length).toBe(3);
    expect(r.coordinates[0]).toEqual([114.3, 30.5]);
    expect(r.coordinates[2]).toEqual([114.31, 30.5]);
    expect(r.edgeIds).toEqual(['e1']);
  });

  it('无 geometry 时退化为节点直线', () => {
    const r = detourToPolyline(dataset, ['b', 'c']);
    expect(r.coordinates).toEqual([
      [114.31, 30.5],
      [114.32, 30.5],
    ]);
  });

  it('长度优先取路段 length，缺失时用直线距离', () => {
    const withLen = detourToPolyline(dataset, ['a', 'b']);
    expect(withLen.lengthM).toBe(1000);

    const noLen = detourToPolyline(dataset, ['b', 'c']);
    expect(noLen.lengthM).toBeGreaterThan(0);
    expect(noLen.lengthM).toBeLessThan(2000);
  });

  it('多段路径拼接：不重复压入中间节点', () => {
    const r = detourToPolyline(dataset, ['a', 'b', 'c']);
    // a→b 用 geometry（3 点）+ b→c 直线（补 1 点）= 4 点
    expect(r.coordinates.length).toBe(4);
    expect(r.edgeIds).toEqual(['e1', 'e2']);
    // 中间节点 b 只出现一次（作为上一段末点）
    const bCount = r.coordinates.filter(
      (c) => c[0] === 114.31 && c[1] === 30.5
    ).length;
    expect(bCount).toBe(1);
  });

  it('节点缺失时跳过该段而非中断整条路径', () => {
    const r = detourToPolyline(dataset, ['a', 'ghost', 'c']);
    // a→ghost 跳过；ghost→c 也跳过（起点缺失）→ 空
    expect(r.coordinates).toEqual([]);
  });

  it('geometry 反向存储时自动对齐遍历方向', () => {
    const reversed: RoadNetworkDataset = {
      ...dataset,
      edges: dataset.edges.map((e) =>
        e.id === 'e1'
          ? {
              ...e,
              geometry: [
                [114.31, 30.5],
                [114.305, 30.502],
                [114.3, 30.5],
              ] as [number, number][],
            }
          : e
      ),
    };
    const r = detourToPolyline(reversed, ['a', 'b']);
    expect(r.coordinates[0]).toEqual([114.3, 30.5]);
    expect(r.coordinates[r.coordinates.length - 1]).toEqual([114.31, 30.5]);
  });
});

describe('findConnectingEdge', () => {
  it('双向都能找到连接路段', () => {
    expect(findConnectingEdge(dataset.edges, 'a', 'b')?.id).toBe('e1');
    expect(findConnectingEdge(dataset.edges, 'b', 'a')?.id).toBe('e1');
  });

  it('无连接时返回 undefined', () => {
    expect(findConnectingEdge(dataset.edges, 'a', 'c')).toBeUndefined();
  });
});

describe('circleRing（影响范围圆）', () => {
  it('生成闭合环（首尾重合，步数+1 个点）', () => {
    const ring = circleRing(114.3, 30.5, 1000, 32);
    expect(ring.length).toBe(33);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('半径越大环越大', () => {
    const small = circleRing(114.3, 30.5, 500, 16);
    const big = circleRing(114.3, 30.5, 2000, 16);
    const span = (r: [number, number][]) =>
      Math.max(...r.map((p) => p[0])) - Math.min(...r.map((p) => p[0]));
    expect(span(big)).toBeGreaterThan(span(small));
  });

  it('圆心位于环的经纬中点附近', () => {
    const ring = circleRing(114.3, 30.5, 1000, 64);
    const lngs = ring.map((p) => p[0]);
    const lats = ring.map((p) => p[1]);
    const midLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
    const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    expect(midLng).toBeCloseTo(114.3, 5);
    expect(midLat).toBeCloseTo(30.5, 5);
  });
});
