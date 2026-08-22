import { describe, it, expect } from 'vitest';
import {
  buildAdjacency,
  haversine,
  pipeLengthFromGeometry,
} from '../adjacency';
import { bfs, multiSourceBfs } from '../bfs';
import { dfs, detectCycles } from '../dfs';
import { findConnectedComponents, highlightConnectivity, findUpstreamNode } from '../connectivity';
import { dijkstra } from '../shortestPath';
import type {
  PipelineTopologyDataset,
  PipelineNode,
  PipelinePipe,
} from '../../types';

/** 工具：创建一个简单的燃气管网图 */
function makeToyDataset(): PipelineTopologyDataset {
  /*
   *  节点拓扑：
   *      s(源) --A-- v1 --B-- v2 --C-- t1 (表/用户1)
   *                       \D-- v3 --E-- t2
   *      孤岛节点：v4
   */
  const nodes: PipelineNode[] = [
    { id: 's', kind: 'source', lng: 114.0, lat: 30.0 },
    { id: 'v1', kind: 'valve', lng: 114.01, lat: 30.0 },
    { id: 'v2', kind: 'valve', lng: 114.02, lat: 30.0 },
    { id: 'v3', kind: 'valve', lng: 114.025, lat: 30.005 },
    { id: 't1', kind: 'meter', lng: 114.03, lat: 30.0 },
    { id: 't2', kind: 'meter', lng: 114.03, lat: 30.01 },
    { id: 'v4', kind: 'valve', lng: 114.05, lat: 30.05 }, // 孤岛
  ];
  const pipes: PipelinePipe[] = [
    { id: 'A', fromNode: 's', toNode: 'v1', type: 'pipe' },
    { id: 'B', fromNode: 'v1', toNode: 'v2', type: 'pipe' },
    { id: 'C', fromNode: 'v2', toNode: 't1', type: 'pipe' },
    { id: 'D', fromNode: 'v2', toNode: 'v3', type: 'pipe' },
    { id: 'E', fromNode: 'v3', toNode: 't2', type: 'pipe' },
  ];
  return { nodes, pipes };
}

describe('graph/adjacency', () => {
  it('buildAdjacency 双向建表，对称', () => {
    const adj = buildAdjacency(makeToyDataset());
    expect(adj.has('s')).toBe(true);
    expect(adj.get('s')!.map((e) => e.to).sort()).toEqual(['v1']);
    expect(adj.get('v2')!.map((e) => e.to).sort()).toEqual(['t1', 'v1', 'v3']);
  });

  it('haversine 距离合理（武汉 0.01 度 ≈ 960m）', () => {
    const d = haversine(114.0, 30.0, 114.01, 30.0);
    expect(d).toBeGreaterThan(800);
    expect(d).toBeLessThan(1100);
  });

  it('haversine 相同点=0', () => {
    expect(haversine(114.0, 30.0, 114.0, 30.0)).toBe(0);
  });

  it('pipeLengthFromGeometry uses geometry when provided', () => {
    const ds = makeToyDataset();
    const pipe = { ...ds.pipes[0], geometry: [[114, 30], [114.005, 30], [114.01, 30]] };
    const len = pipeLengthFromGeometry(pipe as PipelinePipe, ds.nodes);
    expect(len).toBeGreaterThan(0);
  });

  it('孤立节点不与任何邻居相连', () => {
    const adj = buildAdjacency(makeToyDataset());
    expect(adj.get('v4')).toEqual([]);
    expect(adj.get('s')!.length).toBe(1);
  });
});

describe('graph/bfs', () => {
  const adj = buildAdjacency(makeToyDataset());

  it('BFS 从 s 扩散到所有连通节点', () => {
    const r = bfs(adj, 's');
    expect(new Set(r.visited).size).toBe(6);
    expect(r.visited).toContain('t2');
    expect(r.visited).not.toContain('v4'); // 孤岛不应命中
  });

  it('BFS until 命中即停', () => {
    const r = bfs(adj, 's', { until: (n) => n === 't1' });
    expect(r.end).toBe('t1');
    expect(r.visited).toContain('t1');
  });

  it('BFS maxDepth 限制层数（maxDepth=N 表示最多 N 条边）', () => {
    // 边 A 连接 s-v1（1 条边），B 连接 v1-v2（2 条边）
    // maxDepth=1：应到达 s, v1，不应到达 v2
    const r = bfs(adj, 's', { maxDepth: 1 });
    expect(new Set(r.visited)).toEqual(new Set(['s', 'v1']));

    // maxDepth=2：应到达 s, v1, v2
    const r2 = bfs(adj, 's', { maxDepth: 2 });
    expect(r2.visited).toContain('v2');
  });

  it('BFS maxDepth=0 仅返回起点', () => {
    const r = bfs(adj, 's', { maxDepth: 0 });
    expect(r.visited).toEqual(['s']);
  });

  it('allowEdge 过滤掉指定方向', () => {
    const r = bfs(adj, 'v2', {
      allowEdge: (_, __, to) => to === 't1' || to === 'v2',
    });
    // 应只走到 t1（和 v2 自己循环回退）
    expect(r.visited).toContain('t1');
    expect(r.visited).not.toContain('t2');
  });

  it('multiSourceBfs 多源扩散', () => {
    const r = multiSourceBfs(adj, ['t1', 't2']);
    expect(r.visited).toContain('s');
    expect(r.sourceMap.get('s')).toBe('t1'); // t1 先入队
  });
});

describe('graph/dfs', () => {
  const adj = buildAdjacency(makeToyDataset());

  it('DFS 覆盖所有连通节点', () => {
    const r = dfs(adj, 's');
    expect(new Set(r.visited).size).toBe(6);
  });

  it('DFS maxDepth 截断', () => {
    const r = dfs(adj, 's', { maxDepth: 2 });
    expect(r.truncated).toBe(true);
    expect(r.visited.length).toBeLessThanOrEqual(3);
  });

  it('detectCycles 在无向树上（重复边）视为无环（环长>=3）', () => {
    // 双向建表：每条 pipe 在 from/toList 各加一条边，
    // 看上去是"s->v1->s"的小"环"，但实质是 2 个节点的回路，不是真环
    const cycles = detectCycles(adj);
    expect(cycles).toEqual([]);
  });

  it('detectCycles 在含真环图（≥3 节点）上识别环', () => {
    // 三角形 a-b-c-a：3 节点真环
    const nodes: PipelineNode[] = [
      { id: 'a', kind: 'junction', lng: 0, lat: 0 },
      { id: 'b', kind: 'junction', lng: 1, lat: 0 },
      { id: 'c', kind: 'junction', lng: 0.5, lat: 1 },
    ];
    const pipes: PipelinePipe[] = [
      { id: 'ab', fromNode: 'a', toNode: 'b', type: 'pipe' },
      { id: 'bc', fromNode: 'b', toNode: 'c', type: 'pipe' },
      { id: 'ca', fromNode: 'c', toNode: 'a', type: 'pipe' },
    ];
    const adj2 = buildAdjacency({ nodes, pipes });
    const cycles = detectCycles(adj2);
    expect(cycles.length).toBeGreaterThan(0);
    // 每条环应至少 3 个不同节点
    cycles.forEach((c) => {
      expect(new Set(c).size).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('graph/connectivity', () => {
  const ds = makeToyDataset();
  const adj = buildAdjacency(ds);

  it('findConnectedComponents 识别两个分量', () => {
    const comps = findConnectedComponents(adj, ds.nodes);
    expect(comps.length).toBe(2);
    const big = comps.find((c) => c.size === 6);
    const small = comps.find((c) => c.size === 1);
    expect(big?.hasSource).toBe(true);
    expect(small?.hasSource).toBe(false);
  });

  it('highlightConnectivity 返回连通节点+边', () => {
    const r = highlightConnectivity(adj, 'v2');
    expect(r.nodeIds.has('t1')).toBe(true);
    expect(r.nodeIds.has('v4')).toBe(false);
    expect(r.edgeIds.size).toBeGreaterThan(0);
  });

  it('findUpstreamNode 从下游管段找到最近阀门（不原路返回）', () => {
    // C 管段 fromNode=v2(阀门) → toNode=t1(表)。上游方向应命中 v2 自身（起点即阀门）
    const valve = findUpstreamNode(adj, 'C', ds, (n) => n.kind === 'valve');
    expect(valve).not.toBeNull();
    expect(valve!.kind).toBe('valve');
  });

  it('findUpstreamNode 从更远表段向上游收敛到阀门', () => {
    // E 管段 fromNode=v3(阀门) → toNode=t2(表)，起点 v3 是阀门
    const valve = findUpstreamNode(adj, 'E', ds, (n) => n.kind === 'valve');
    expect(valve).not.toBeNull();
    expect(valve!.id).toBe('v3');
  });

  it('findUpstreamNode 不存在的管段返回 null', () => {
    expect(findUpstreamNode(adj, 'ZZZ', ds, (n) => n.kind === 'valve')).toBeNull();
  });
});

describe('graph/shortestPath', () => {
  const adj = buildAdjacency(makeToyDataset());

  it('Dijkstra 找最短路径（含多分支）', () => {
    const r = dijkstra(adj, 's', 't2');
    expect(r.found).toBe(true);
    expect(r.path[0]).toBe('s');
    expect(r.path[r.path.length - 1]).toBe('t2');
    expect(r.distance).toBeGreaterThan(0);
  });

  it('Dijkstra 不连通节点返回 not found', () => {
    const r = dijkstra(adj, 's', 'v4');
    expect(r.found).toBe(false);
  });

  it('Dijkstra 同节点 distance=0', () => {
    const r = dijkstra(adj, 's', 's');
    expect(r.distance).toBe(0);
    expect(r.path).toEqual(['s']);
  });
});
