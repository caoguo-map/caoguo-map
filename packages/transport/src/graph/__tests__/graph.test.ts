import { describe, it, expect } from 'vitest';
import {
  buildRoadAdjacency,
  bfs,
  dijkstra,
  haversine,
  nodesWithinRadius,
} from '../index';
import type { RoadNetworkDataset } from '../../types';

function makeNetwork(): RoadNetworkDataset {
  return {
    nodes: [
      { id: 'a', kind: 'intersection', lng: 114.0, lat: 30.0 },
      { id: 'b', kind: 'intersection', lng: 114.01, lat: 30.0 },
      { id: 'c', kind: 'intersection', lng: 114.02, lat: 30.0 },
      { id: 'd', kind: 'intersection', lng: 114.01, lat: 30.01 },
    ],
    edges: [
      { id: 'e1', fromNode: 'a', toNode: 'b', roadClass: 'urban' },
      { id: 'e2', fromNode: 'b', toNode: 'c', roadClass: 'urban' },
      { id: 'e3', fromNode: 'b', toNode: 'd', roadClass: 'urban' },
    ],
  };
}

describe('transport/graph', () => {
  it('buildRoadAdjacency 构建双向邻接表', () => {
    const adj = buildRoadAdjacency(makeNetwork());
    expect(adj.get('a')!.length).toBe(1);
    expect(adj.get('b')!.length).toBe(3);
  });

  it('bfs 遍历可达节点', () => {
    const adj = buildRoadAdjacency(makeNetwork());
    const r = bfs(adj, 'a');
    expect(r.visited).toContain('c');
    expect(r.visited).toContain('d');
  });

  it('dijkstra 找到最短路径', () => {
    const adj = buildRoadAdjacency(makeNetwork());
    const r = dijkstra(adj, 'a', 'c');
    expect(r.found).toBe(true);
    expect(r.path[0]).toBe('a');
    expect(r.path[r.path.length - 1]).toBe('c');
  });

  it('haversine 距离合理', () => {
    const d = haversine(114.0, 30.0, 114.01, 30.0);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });

  it('nodesWithinRadius 缓冲查询', () => {
    const nodes = [
      { id: 'n1', lng: 114.0, lat: 30.0 },
      { id: 'n2', lng: 114.1, lat: 30.0 },
    ];
    const r = nodesWithinRadius(nodes, 114.0, 30.0, 1000);
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('n1');
  });
});
