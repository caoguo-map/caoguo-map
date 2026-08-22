import { describe, it, expect } from 'vitest';
import { executeComputeQuery } from '../execute';
import type { ComputeTopologyDataset } from '../../types';

function makeTopology(): ComputeTopologyDataset {
  return {
    nodes: [
      { id: 'dc1', type: 'datacenter', name: '北京', lng: 116.4, lat: 39.9, properties: { gpuUtilization: 0.2, region: '华北', status: 'online' } },
      { id: 'dc2', type: 'datacenter', name: '上海', lng: 121.5, lat: 31.2, properties: { gpuUtilization: 0.9, region: '华东', status: 'online' } },
      { id: 'dc3', type: 'edge_node', name: '武汉', lng: 114.3, lat: 30.5, properties: { gpuUtilization: 0.95, region: '华中', status: 'offline' } },
    ],
    links: [
      { id: 'l1', fromNode: 'dc1', toNode: 'dc2', properties: { latencyMs: 25, utilization: 0.3, bandwidthGbps: 100, type: 'fiber' } },
      { id: 'l2', fromNode: 'dc2', toNode: 'dc3', properties: { latencyMs: 15, utilization: 0.9, bandwidthGbps: 40, type: 'fiber' } },
    ],
  };
}

const cityToNodeId: Record<string, string> = { 北京: 'dc1', 上海: 'dc2', 武汉: 'dc3' };

describe('executeComputeQuery (PRD §6.2 NLPG 执行层)', () => {
  it('low_utilization：返回利用率低于阈值的节点', () => {
    const topo = makeTopology();
    const exec = executeComputeQuery('列出利用率低于 30% 的 GPU 节点', {
      dataset: topo,
      cityToNodeId,
    });
    expect(exec.intent).toBe('low_utilization');
    if (exec.data.type !== 'low_utilization') throw new Error('type mismatch');
    // dc1 0.2 < 0.3 命中；dc2/dc3 偏高不命中
    expect(exec.data.nodes.map((n) => n.id)).toContain('dc1');
    expect(exec.data.nodes.find((n) => n.id === 'dc2')).toBeFalsy();
    expect(exec.summary).toContain('GPU 节点');
  });

  it('fiber_routes：返回两城市间光缆路径', () => {
    const topo = makeTopology();
    const exec = executeComputeQuery('北京到上海之间有哪些光缆路由？', {
      dataset: topo,
      cityToNodeId,
    });
    expect(exec.intent).toBe('fiber_routes');
    if (exec.data.type !== 'fiber_routes') throw new Error('type mismatch');
    expect(exec.data.routes.length).toBeGreaterThan(0);
    expect(exec.data.routes[0].path[0]).toBe('dc1');
    expect(exec.data.routes[0].path.at(-1)).toBe('dc2');
  });

  it('fiber_routes：节点 name 不含城市且无映射时返回空路由（占位）', () => {
    // 构造 name 不含城市名的节点，且无 cityToNodeId → 解析失败 → 占位
    const topo: ComputeTopologyDataset = {
      nodes: [
        { id: 'dc1', type: 'datacenter', name: '华北中心', lng: 116.4, lat: 39.9, properties: { region: '华北' } },
        { id: 'dc2', type: 'datacenter', name: '华东中心', lng: 121.5, lat: 31.2, properties: { region: '华东' } },
      ],
      links: [{ id: 'l1', fromNode: 'dc1', toNode: 'dc2', properties: { latencyMs: 25, bandwidthGbps: 100, type: 'fiber' } }],
    };
    const exec = executeComputeQuery('北京到上海之间有哪些光缆路由？', { dataset: topo });
    if (exec.data.type !== 'fiber_routes') throw new Error('type mismatch');
    expect(exec.data.routes).toEqual([]);
    expect(exec.summary).toContain('未能解析路由端点');
  });

  it('predict_gap：返回各区域算力缺口预测', () => {
    const topo = makeTopology();
    const exec = executeComputeQuery('预测下个月华东区的算力缺口', {
      dataset: topo,
      cityToNodeId,
    });
    expect(exec.intent).toBe('predict_gap');
    if (exec.data.type !== 'predict_gap') throw new Error('type mismatch');
    // 仅华东（dc2 利用率 0.9 + 预测增长 → 缺口）
    const east = exec.data.forecasts.find((f) => f.region === '华东');
    expect(east).toBeTruthy();
    expect(east?.isGap).toBe(true);
    expect(exec.summary).toContain('华东');
  });

  it('unknown：无法识别时返回 unknown', () => {
    const topo = makeTopology();
    const exec = executeComputeQuery('今天天气怎么样', { dataset: topo, cityToNodeId });
    expect(exec.intent).toBe('unknown');
    expect(exec.data.type).toBe('unknown');
  });
});
