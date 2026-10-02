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

  it('空图（无节点无边）不抛错且无路线', () => {
    const plan = planEvacuation({ nodes: [], edges: [] }, { floodPolygons: [flood] });
    expect(plan.originIds).toEqual([]);
    expect(plan.shelterIds).toEqual([]);
    expect(plan.blockedEdges).toEqual([]);
    expect(plan.routes).toEqual([]);
  });

  it('无淹没范围时全员安全 → 无撤离路线（语义明确）', () => {
    // 不传 floodPolygons：没有任何节点落在淹没区，故无需撤离
    const plan = planEvacuation(graph);
    expect(plan.originIds).toEqual([]);
    expect(plan.shelterIds.sort()).toEqual(['a', 'b', 'c']);
    expect(plan.routes).toEqual([]);
  });

  it('内部采样点数为 0 时降级为 1（不除零、仍能判定）', () => {
    // samplesPerEdge: 0 → Math.max(1, 0) → 1，即只取中点。
    // 宽淹没区（lng ≤ 114.3035）下 a-b 中点 114.302 落在区内，仅取中点也应判出淹没边
    const wide: [number, number][] = [
      [114.299, 30.499],
      [114.3035, 30.499],
      [114.3035, 30.501],
      [114.299, 30.501],
    ];
    const plan = planEvacuation(graph, { floodPolygons: [wide], samplesPerEdge: 0 });
    expect(plan.blockedEdges).toEqual(['a|b']);
    // 窄淹没区下中点 114.302 在区外 → 不禁行（与默认 3 点采样行为一致）
    const narrow = planEvacuation(graph, { floodPolygons: [flood], samplesPerEdge: 0 });
    expect(narrow.blockedEdges).toEqual([]);
  });
});
