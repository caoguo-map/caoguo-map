import { describe, it, expect } from 'vitest';
import type { EvacuationGraph } from '../evacuation';
import { planEvacuation, edgeKey, haversineMeters } from '../evacuation';

/** 淹没范围（lng 114.299~114.301, lat 30.499~30.501），仅覆盖 a 附近 */
const flood: [number, number][] = [
  [114.299, 30.499],
  [114.301, 30.499],
  [114.301, 30.501],
  [114.299, 30.501],
];

/** 路网：a（淹没区内）— b（区外）— c（区外） */
const graph: EvacuationGraph = {
  nodes: [
    { id: 'a', lng: 114.3, lat: 30.5 },
    { id: 'b', lng: 114.304, lat: 30.5 },
    { id: 'c', lng: 114.308, lat: 30.5 },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
};

describe('F-6 撤退路径推荐 evacuate', () => {
  it('edgeKey 无方向（字典序拼接）', () => {
    expect(edgeKey('x', 'y')).toBe(edgeKey('y', 'x'));
    expect(edgeKey('b', 'a')).toBe('a|b');
  });

  it('自动识别起点与安全点，并给出可达路线', () => {
    const plan = planEvacuation(graph, { floodPolygons: [flood] });
    expect(plan.originIds).toEqual(['a']);
    expect(plan.shelterIds.sort()).toEqual(['b', 'c']);
    expect(plan.blockedEdges).toEqual([]);

    const route = plan.routes[0];
    expect(route.originId).toBe('a');
    expect(route.reachable).toBe(true);
    expect(route.shelterId).toBe('b'); // 最近安全点
    expect(route.path).toEqual(['a', 'b']);
    expect(route.pathCoords).toEqual([
      [114.3, 30.5],
      [114.304, 30.5],
    ]);
    expect(route.distanceM).toBeCloseTo(haversineMeters([114.3, 30.5], [114.304, 30.5]), 6);
  });

  it('边中段穿越淹没区时禁行，被完全隔离的起点不可达', () => {
    // 淹没范围扩大到 lng 114.3035：a 的出口 a-b 中段落在区内
    const wide: [number, number][] = [
      [114.299, 30.499],
      [114.3035, 30.499],
      [114.3035, 30.501],
      [114.299, 30.501],
    ];
    const plan = planEvacuation(graph, { floodPolygons: [wide] });
    expect(plan.blockedEdges).toEqual(['a|b']);
    const route = plan.routes[0];
    expect(route.reachable).toBe(false);
    expect(route.shelterId).toBeNull();
    expect(route.path).toEqual(['a']);
  });

  it('起点本身即安全点时距离为 0（无需撤离）', () => {
    const plan = planEvacuation(graph, { originIds: ['b'], shelterIds: ['b'] });
    const route = plan.routes[0];
    expect(route.reachable).toBe(true);
    expect(route.distanceM).toBe(0);
    expect(route.path).toEqual(['b']);
  });

  it('显式指定 weight 时按给定权重取最短路', () => {
    // 增加一条 a-c 直连，权重很大；应仍走 a-b
    const g: EvacuationGraph = {
      nodes: graph.nodes,
      edges: [...graph.edges, { from: 'a', to: 'c', weight: 999999 }],
    };
    const plan = planEvacuation(g, { floodPolygons: [flood] });
    const route = plan.routes[0];
    expect(route.path).toEqual(['a', 'b']);
    expect(route.distanceM).toBeLessThan(999999);
  });

  it('未知节点 id 被忽略，不产生幽灵路线', () => {
    const plan = planEvacuation(graph, { originIds: ['zzz'], shelterIds: ['b'] });
    expect(plan.originIds).toEqual([]);
    expect(plan.routes).toEqual([]);
  });
});
