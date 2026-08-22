import { describe, it, expect } from 'vitest';
import { buildRoadAdjacency, aStar, nearestNeighborVrp } from '../index';
import type { RoadNetworkDataset, RoadNode } from '../../types';

function gridNetwork(): RoadNetworkDataset {
  // 4x4 网格（共 16 节点），横纵连接各 1 单位长（约 1100m）
  const nodes: RoadNode[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      nodes.push({
        id: `n${i}${j}`,
        kind: 'intersection',
        lng: 114.0 + j * 0.01,
        lat: 30.0 + i * 0.01,
      });
    }
  }
  const edges: RoadNetworkDataset['edges'] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (j < 3) {
        edges.push({
          id: `h${i}${j}`,
          fromNode: `n${i}${j}`,
          toNode: `n${i}${j + 1}`,
          roadClass: 'urban',
          length: 1100,
        });
      }
      if (i < 3) {
        edges.push({
          id: `v${i}${j}`,
          fromNode: `n${i}${j}`,
          toNode: `n${i + 1}${j}`,
          roadClass: 'urban',
          length: 1100,
        });
      }
    }
  }
  return { nodes, edges };
}

function nodesMap(ds: RoadNetworkDataset): Map<string, { lng: number; lat: number }> {
  return new Map(ds.nodes.map((n) => [n.id, { lng: n.lng, lat: n.lat }]));
}

describe('A* 最短路径', () => {
  it('找到从 n00 到 n33 的最短路径（4x4 网格，6 段 6600m）', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const r = aStar(adj, 'n00', 'n33', nodesMap(ds));
    expect(r.found).toBe(true);
    expect(r.path[0]).toBe('n00');
    expect(r.path[r.path.length - 1]).toBe('n33');
    // 4x4 网格从 (0,0) 到 (3,3) 需 3+3=6 段（最短 6 步），6 × 1100 = 6600m
    expect(r.distance).toBeCloseTo(6600, -1);
  });

  it('起点或终点不存在时返回未找到', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const r1 = aStar(adj, 'xxx', 'n33', nodesMap(ds));
    expect(r1.found).toBe(false);
    const r2 = aStar(adj, 'n00', 'xxx', nodesMap(ds));
    expect(r2.found).toBe(false);
  });

  it('路径节点坐标缺失时返回未找到', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const nodes = nodesMap(ds);
    nodes.delete('n33');
    const r = aStar(adj, 'n00', 'n33', nodes);
    expect(r.found).toBe(false);
  });

  it('相同起终点距离为 0', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const r = aStar(adj, 'n22', 'n22', nodesMap(ds));
    expect(r.found).toBe(true);
    expect(r.distance).toBe(0);
    expect(r.path).toEqual(['n22']);
  });
});

describe('VRP 多目标调度（最近邻贪心）', () => {
  it('capacity 充足时单路径配送所有点', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const nodes = nodesMap(ds);
    const r = nearestNeighborVrp(
      {
        depotId: 'n00',
        capacity: 100,
        stops: [
          { id: 's1', lng: 114.0, lat: 30.01, demand: 1 },
          { id: 's2', lng: 114.02, lat: 30.0, demand: 1 },
          { id: 's3', lng: 114.02, lat: 30.02, demand: 1 },
        ],
      },
      adj,
      nodes
    );
    expect(r.routes.length).toBe(1);
    expect(r.routes[0].path[0]).toBe('n00');
    expect(r.routes[0].path[r.routes[0].path.length - 1]).toBe('n00');
    expect(r.undelivered.length).toBe(0);
    expect(r.routes[0].totalDemand).toBe(3);
  });

  it('capacity 不够时分多条路径', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const nodes = nodesMap(ds);
    const r = nearestNeighborVrp(
      {
        depotId: 'n00',
        capacity: 2,
        stops: [
          { id: 's1', lng: 114.0, lat: 30.01, demand: 1 },
          { id: 's2', lng: 114.02, lat: 30.0, demand: 1 },
          { id: 's3', lng: 114.02, lat: 30.02, demand: 1 },
          { id: 's4', lng: 114.0, lat: 30.03, demand: 1 },
        ],
      },
      adj,
      nodes
    );
    expect(r.routes.length).toBeGreaterThanOrEqual(2);
    expect(r.undelivered.length).toBe(0);
    // 每条路径 totalDemand ≤ 2
    for (const route of r.routes) expect(route.totalDemand).toBeLessThanOrEqual(2);
  });

  it('所有配送点 demand 默认按 1 计算（缺 demand 字段）', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const nodes = nodesMap(ds);
    const r = nearestNeighborVrp(
      {
        depotId: 'n00',
        capacity: 2,
        stops: [
          { id: 's1', lng: 114.0, lat: 30.01 }, // demand 缺省
          { id: 's2', lng: 114.02, lat: 30.0 },
        ],
      },
      adj,
      nodes
    );
    expect(r.routes[0].totalDemand).toBe(2);
  });

  it('空配送点列表返回空 routes', () => {
    const ds = gridNetwork();
    const adj = buildRoadAdjacency(ds);
    const nodes = nodesMap(ds);
    const r = nearestNeighborVrp({ depotId: 'n00', capacity: 100, stops: [] }, adj, nodes);
    expect(r.routes).toEqual([]);
    expect(r.undelivered).toEqual([]);
  });
});