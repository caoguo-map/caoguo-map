import { describe, it, expect } from 'vitest';
import {
  findNeighborStations,
  buildAdjacencyGraph,
  connectivityComponents,
  stationCentrality,
  areStationsOverlapping,
} from '../topologyCore';
import type { TelecomTopologyDataset } from '../../types';

const baseDataset: TelecomTopologyDataset = {
  baseStations: [
    { id: 's1', type: 'macro', lng: 116.40, lat: 39.90, carrier: '中国移动', properties: { technology: '5G' } },
    { id: 's2', type: 'macro', lng: 116.41, lat: 39.91, carrier: '中国移动', properties: { technology: '5G' } },
    { id: 's3', type: 'micro', lng: 116.42, lat: 39.92, carrier: '中国联通', properties: { technology: '4G' } },
    { id: 's4', type: 'macro', lng: 121.50, lat: 31.20, carrier: '中国电信', properties: { technology: '5G' } },
  ],
  coverageAreas: [],
};

describe('findNeighborStations', () => {
  it('返回最近的 K 个基站', () => {
    const neighbors = findNeighborStations('s1', baseDataset, { k: 2 });
    expect(neighbors.length).toBe(2);
    expect(neighbors[0].distance).toBeLessThanOrEqual(neighbors[1].distance);
  });

  it('排除自身', () => {
    const neighbors = findNeighborStations('s1', baseDataset, { k: 10 });
    expect(neighbors.every((n) => n.to !== 's1')).toBe(true);
  });

  it('过远基站被 maxRadius 过滤', () => {
    // s4 在上海（~1100km），默认 maxRadius=50km 应过滤
    const neighbors = findNeighborStations('s1', baseDataset, { k: 10, maxRadius: 50_000 });
    expect(neighbors.find((n) => n.to === 's4')).toBeUndefined();
  });

  it('未知 stationId 返回空数组', () => {
    expect(findNeighborStations('xxx', baseDataset)).toEqual([]);
  });
});

describe('buildAdjacencyGraph', () => {
  it('图包含所有基站', () => {
    const graph = buildAdjacencyGraph(baseDataset, { k: 2 });
    expect(graph.size).toBe(4);
  });

  it('图为对称（A→B 包含 B→A）', () => {
    const graph = buildAdjacencyGraph(baseDataset, { k: 2 });
    const a = graph.get('s1') ?? [];
    const b = graph.get('s2') ?? [];
    expect(a.some((e) => e.to === 's2')).toBe(true);
    expect(b.some((e) => e.to === 's1')).toBe(true);
  });
});

describe('connectivityComponents', () => {
  it('远距离基站被分到不同分量', () => {
    // s1/s2/s3 在北京，s4 在上海 → 至少 2 个分量
    const graph = buildAdjacencyGraph(baseDataset, { k: 2, maxRadius: 50_000 });
    const comps = connectivityComponents(graph);
    expect(comps.length).toBeGreaterThanOrEqual(2);
    // 北京集群 size=3
    const bj = comps.find((c) => c.stationIds.includes('s1'));
    expect(bj?.size).toBe(3);
  });

  it('分量按 size 降序', () => {
    const graph = buildAdjacencyGraph(baseDataset, { k: 2, maxRadius: 50_000 });
    const comps = connectivityComponents(graph);
    for (let i = 1; i < comps.length; i++) {
      expect(comps[i].size).toBeLessThanOrEqual(comps[i - 1].size);
    }
  });
});

describe('stationCentrality', () => {
  it('返回所有基站的中心性', () => {
    const graph = buildAdjacencyGraph(baseDataset, { k: 2 });
    const c = stationCentrality(graph);
    expect(c.length).toBe(4);
  });

  it('按 degree 降序排列', () => {
    const graph = buildAdjacencyGraph(baseDataset, { k: 2 });
    const c = stationCentrality(graph);
    for (let i = 1; i < c.length; i++) {
      expect(c[i].degree).toBeLessThanOrEqual(c[i - 1].degree);
    }
  });
});

describe('areStationsOverlapping', () => {
  it('近距离基站覆盖重叠', () => {
    const ds: TelecomTopologyDataset = {
      ...baseDataset,
      coverageAreas: [
        {
          stationId: 's1',
          geom: [
            [116.39, 39.89],
            [116.41, 39.89],
            [116.41, 39.91],
            [116.39, 39.91],
          ],
        },
        {
          stationId: 's2',
          geom: [
            [116.40, 39.90],
            [116.42, 39.90],
            [116.42, 39.92],
            [116.40, 39.92],
          ],
        },
      ],
    };
    const a = ds.baseStations[0];
    const b = ds.baseStations[1];
    expect(areStationsOverlapping(a, b, ds.coverageAreas)).toBe(true);
  });

  it('无覆盖区域时返回 false', () => {
    const a = baseDataset.baseStations[0];
    const b = baseDataset.baseStations[1];
    expect(areStationsOverlapping(a, b, [])).toBe(false);
  });
});