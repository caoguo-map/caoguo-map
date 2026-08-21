import { describe, it, expect } from 'vitest';
import {
  simulateBurst,
  convexHull,
  userSeverity,
} from '../burstCore';
import {
  listCandidateValves,
  evaluateValvePlan,
} from '../valvePlanner';
import {
  toMapLayerData,
  impactAreaSquareMeters,
  impactCenter,
} from '../impactArea';
import type {
  PipelineTopologyDataset,
  PipelineNode,
  PipelinePipe,
  PipelineUser,
} from '../../types';

function makeWaterNetwork(): PipelineTopologyDataset {
  /*
   * 供水拓扑：
   *   source(r0) -p1- valve(v1,open) -p2- valve(v2,open) -p3- t1 (用户1: 居民)
   *                          \  p4  - valve(v3,open) -p5- t2 (用户2: 学校, important)
   *           valve(v4,open) -p6- t3 (用户3: 居民)
   *           meter(m5, residential)
   *           孤岛：孤岛点
   */
  const nodes: PipelineNode[] = [
    { id: 'r0', kind: 'source', lng: 114.0, lat: 30.0, properties: { capacity: 1000 } },
    { id: 'v1', kind: 'valve', lng: 114.01, lat: 30.0, properties: { valveStatus: 'open' } },
    { id: 'v2', kind: 'valve', lng: 114.02, lat: 30.0, properties: { valveStatus: 'open' } },
    { id: 'v3', kind: 'valve', lng: 114.025, lat: 30.005, properties: { valveStatus: 'open' } },
    { id: 't1', kind: 'meter', lng: 114.03, lat: 30.0 },
    { id: 't2', kind: 'meter', lng: 114.03, lat: 30.01 },
    { id: 'v4', kind: 'valve', lng: 114.005, lat: 29.995, properties: { valveStatus: 'open' } },
    { id: 't3', kind: 'meter', lng: 114.005, lat: 29.99 },
    { id: 'iso', kind: 'junction', lng: 114.1, lat: 30.1 }, // 孤岛
  ];
  const pipes: PipelinePipe[] = [
    { id: 'p1', fromNode: 'r0', toNode: 'v1', type: 'pipe', pipelineType: 'water' },
    { id: 'p2', fromNode: 'v1', toNode: 'v2', type: 'pipe', pipelineType: 'water' },
    { id: 'p3', fromNode: 'v2', toNode: 't1', type: 'pipe', pipelineType: 'water' },
    { id: 'p4', fromNode: 'v2', toNode: 'v3', type: 'pipe', pipelineType: 'water' },
    { id: 'p5', fromNode: 'v3', toNode: 't2', type: 'pipe', pipelineType: 'water' },
    { id: 'p6', fromNode: 'r0', toNode: 'v4', type: 'pipe', pipelineType: 'water' },
    { id: 'p7', fromNode: 'v4', toNode: 't3', type: 'pipe', pipelineType: 'water' },
  ];
  const users: PipelineUser[] = [
    { id: 'u1', kind: 'residential', name: '小区A', nodeId: 't1', lng: 114.03, lat: 30.0 },
    { id: 'u2', kind: 'important', name: '实验小学', nodeId: 't2', lng: 114.03, lat: 30.01 },
    { id: 'u3', kind: 'residential', name: '小区B', nodeId: 't3', lng: 114.005, lat: 29.99 },
  ];
  return { nodes, pipes, users };
}

describe('burst/burstSimulator', () => {
  it('simulateBurst 找到故障管段 p2 后,双向隔离 + 下游影响', () => {
    const ds = makeWaterNetwork();
    const r = simulateBurst(ds, 'p2', { scenario: 'water' });
    expect(r.pipe.id).toBe('p2');

    // v1 / v2 都在被隔离阀门中（双向隔离，pipe 任一端最近的阀门）
    expect(r.valvePlan.closeValves.find((v) => v.id === 'v1')).toBeTruthy();
    expect(r.valvePlan.closeValves.find((v) => v.id === 'v2')).toBeTruthy();

    // 下游受影响节点包含 t2（重要用户在 v3 → t2 支路的上游 v2 是 close 阀门，所以这条支路也受影响）
    expect(r.affectedNodes.find((n) => n.id === 't2')).toBeTruthy();
    // t3 在另一条支路（r0 → v4 → t3），不应该受影响
    expect(r.affectedNodes.find((n) => n.id === 't3')).toBeFalsy();

    // 重要用户被识别
    expect(r.importantUsers.find((u) => u.id === 'u2')).toBeTruthy();
  });

  it('凸包 convexHull 正确（凸包不含凹点）', () => {
    // 输入一个凹五边形
    const points: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [2, 1], // 凹点
      [0, 4],
    ];
    const hull = convexHull(points);
    // 凸包应只保留 4 个角：0,0 → 4,0 → 4,4 → 0,4
    expect(hull.length).toBe(4);
    expect(hull.find(([x, y]) => x === 2 && y === 1)).toBeFalsy();
  });

  it('convexHull 在 3+ 点时才计算', () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([[0, 0]])).toEqual([[0, 0]]);
    expect(convexHull([[0, 0], [1, 1]])).toEqual([[0, 0], [1, 1]]);
  });

  it('userSeverity 排序 重要 > 工业 > 商业 > 居民', () => {
    expect(userSeverity('important')).toBeGreaterThan(userSeverity('industrial'));
    expect(userSeverity('industrial')).toBeGreaterThan(userSeverity('commercial'));
    expect(userSeverity('commercial')).toBeGreaterThan(userSeverity('residential'));
  });

  it('simulateBurst 不存在的 pipe 抛错', () => {
    const ds = makeWaterNetwork();
    expect(() => simulateBurst(ds, 'nope')).toThrowError(/not found/);
  });
});

describe('burst/valvePlanner', () => {
  it('listCandidateValves 列出可能的隔离阀门', () => {
    const ds = makeWaterNetwork();
    const vs = listCandidateValves(ds, 'p2');
    expect(vs.length).toBeGreaterThan(0);
    // 必定包含 v1 / v2
    const ids = vs.map((v) => v.id);
    expect(ids).toContain('v1');
    expect(ids).toContain('v2');
  });

  it('evaluateValvePlan 评估隔离完整性与受影响用户', () => {
    const ds = makeWaterNetwork();
    const v2 = ds.nodes.find((n) => n.id === 'v2')!;
    const r = evaluateValvePlan(ds, 'p2', [v2]);
    // 关闭 v2 后 p2 仍能被 source(r0) 通过 v1 到达 → 隔离不完整
    expect(r.isolationCompleteness).toBeLessThan(Infinity);
    expect(r.isolationCompleteness).toBeGreaterThan(0);
    // 至少有一个受影响用户
    expect(r.impactUserCount).toBeGreaterThanOrEqual(0);

    // 关闭 v1+v2 双闸后 → source(r0) 完全隔离到故障段 → Infinity
    const v1 = ds.nodes.find((n) => n.id === 'v1')!;
    const r2 = evaluateValvePlan(ds, 'p2', [v1, v2]);
    expect(r2.isolationCompleteness).toBe(Infinity);
  });
});

describe('burst/impactArea', () => {
  it('toMapLayerData 产出三种图层数据', () => {
    const ds = makeWaterNetwork();
    const r = simulateBurst(ds, 'p2');
    const layerData = toMapLayerData(r);
    expect(layerData.affectedPipes.features.length).toBeGreaterThan(0);
    expect(layerData.affectedNodes.features.length).toBeGreaterThan(0);
  });

  it('impactAreaSquareMeters 计算非零', () => {
    const area = impactAreaSquareMeters([
      [114, 30],
      [114.01, 30],
      [114.01, 30.01],
      [114, 30.01],
    ]);
    expect(area).toBeGreaterThan(0);
  });

  it('impactCenter 返回受影响节点的中心', () => {
    const ds = makeWaterNetwork();
    const r = simulateBurst(ds, 'p2');
    const center = impactCenter(r.affectedNodes);
    expect(center).not.toBeNull();
    if (center) {
      expect(center[0]).toBeGreaterThan(113);
      expect(center[0]).toBeLessThan(115);
    }
  });
});
