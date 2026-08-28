import { describe, it, expect } from 'vitest';
import type { ComputeNode } from '../../types';
import { assignTask, assignTasks, nodeCapacity } from '../assignment';

function node(
  id: string,
  opts: {
    total?: string;
    used?: string;
    region?: string;
    type?: ComputeNode['type'];
    status?: ComputeNode['properties'] extends undefined ? never : 'online' | 'offline';
    lng?: number;
    lat?: number;
  } = {}
): ComputeNode {
  return {
    id,
    type: opts.type ?? 'center',
    lng: opts.lng ?? 114.3,
    lat: opts.lat ?? 30.5,
    name: `节点-${id}`,
    properties: {
      totalCompute: opts.total ?? '1000 TFLOPS',
      usedCompute: opts.used ?? '0 TFLOPS',
      gpuUtilization: 0.3,
      status: opts.status ?? 'online',
      ...(opts.region ? { region: opts.region } : {}),
    },
  };
}

const nodes = [
  node('a', { total: '1000 TFLOPS', used: '900 TFLOPS', region: '武昌' }), // free 100
  node('b', { total: '1000 TFLOPS', used: '200 TFLOPS', region: '洪山' }), // free 800
  node('c', { total: '2000 TFLOPS', used: '1000 TFLOPS', region: '江汉' }), // free 1000
  node('d', { total: '500 TFLOPS', used: '0 TFLOPS', region: '武昌', status: 'offline' }),
];

describe('nodeCapacity', () => {
  it('解析 TFLOPS 字符串并计算剩余', () => {
    expect(nodeCapacity(nodes[0])).toEqual({ total: 1000, used: 900, free: 100 });
  });
});

describe('assignTask（C-4 任务分配）', () => {
  it('balanced：剩余算力占比最大者优先', () => {
    const r = assignTask(nodes, { id: 't1', demandTflops: 500 }, 'balanced');
    // free 占比：b 80% > c 50% > a 10%
    expect(r.nodeId).toBe('b');
    expect(r.utilizationBefore).toBeCloseTo(0.3, 5);
    // 分配后：(200+500)/1000 = 0.7
    expect(r.utilizationAfter).toBeCloseTo(0.7, 3);
  });

  it('capacity：总算力最大者优先', () => {
    const r = assignTask(nodes, { id: 't1', demandTflops: 500 }, 'capacity');
    expect(r.nodeId).toBe('c'); // 2000 TFLOPS
  });

  it('nearest：距任务坐标最近者优先', () => {
    const near = [
      node('far', { lng: 116.4, lat: 39.9 }), // 北京
      node('near', { lng: 114.31, lat: 30.51 }), // 武汉近郊
    ];
    const r = assignTask(near, { id: 't1', demandTflops: 100, lng: 114.3, lat: 30.5 }, 'nearest');
    expect(r.nodeId).toBe('near');
  });

  it('nearest 无坐标时退化为 balanced', () => {
    const r = assignTask(nodes, { id: 't1', demandTflops: 500 }, 'nearest');
    expect(r.nodeId).toBe('b'); // 与 balanced 同结果
    expect(r.strategy).toBe('nearest');
  });

  it('region 过滤：仅同区候选（strictRegion 默认开启）', () => {
    const r = assignTask(nodes, { id: 't1', demandTflops: 500, region: '武昌' }, 'balanced');
    // 武昌在线节点只有 a（free 100 < 500）→ 宽松重试跨区 → 选 b
    expect(r.nodeId).toBe('b');
  });

  it('types 过滤', () => {
    const typed = [...nodes, node('edge1', { type: 'edge', total: '300 TFLOPS', region: '洪山' })];
    const r = assignTask(typed, { id: 't1', demandTflops: 200, types: ['edge'] }, 'balanced');
    expect(r.nodeId).toBe('edge1');
  });

  it('offline 节点不参与分配', () => {
    const onlyOffline = [node('d', { status: 'offline' })];
    const r = assignTask(onlyOffline, { id: 't1', demandTflops: 100 });
    expect(r.nodeId).toBeUndefined();
    expect(r.reason).toBe('no-candidate');
  });

  it('所有节点容量不足时返回 insufficient-capacity', () => {
    const r = assignTask(nodes, { id: 't1', demandTflops: 9999 });
    expect(r.nodeId).toBeUndefined();
    expect(r.reason).toBe('insufficient-capacity');
  });

  it('demand 为 0 的任务总能分配', () => {
    const r = assignTask(nodes, { id: 't1', demandTflops: 0 }, 'balanced');
    expect(r.nodeId).toBeDefined();
  });
});

describe('assignTasks（批量贪心）', () => {
  it('按任务顺序逐个分配，互不干扰（不回写数据集）', () => {
    const results = assignTasks(nodes, [
      { id: 't1', demandTflops: 500 },
      { id: 't2', demandTflops: 500 },
    ]);
    // 纯函数不回写：两个任务都基于同一份节点数据 → 都选 b
    expect(results.map((r) => r.nodeId)).toEqual(['b', 'b']);
    expect(results.every((r) => r.taskId)).toBe(true);
  });

  it('支持混用策略', () => {
    const results = assignTasks(
      nodes,
      [
        { id: 't1', demandTflops: 500, lng: 116.4, lat: 39.9 },
        { id: 't2', demandTflops: 500 },
      ],
      'nearest'
    );
    expect(results[0].strategy).toBe('nearest');
    expect(results[1].strategy).toBe('nearest');
  });
});
