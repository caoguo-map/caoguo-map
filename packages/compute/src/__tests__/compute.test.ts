import { describe, it, expect } from 'vitest';
import { recommendBestNode, lowestLatencyPath, findRoutes, buildComputeAdjacency } from '../graph';
import { predictSupplyDemand } from '../predict';
import { latencyLevel } from '../latency';
import { parseComputeQuery } from '../nlpg';
import type { ComputeTopologyDataset } from '../types';

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

describe('compute/graph', () => {
  it('recommendBestNode 按延迟排序且过滤离线', () => {
    const topo = makeTopology();
    const r = recommendBestNode(
      topo.nodes.map((n) => ({ id: n.id, lng: n.lng, lat: n.lat, online: n.properties?.status !== 'offline' })),
      116.4, 39.9
    );
    // dc3 离线被过滤
    expect(r.find((x) => x.id === 'dc3')).toBeFalsy();
    // dc1 最近
    expect(r[0].id).toBe('dc1');
  });

  it('lowestLatencyPath 找到最低延迟路径', () => {
    const adj = buildComputeAdjacency(makeTopology());
    const r = lowestLatencyPath(adj, 'dc1', 'dc2');
    expect(r.found).toBe(true);
    expect(r.path[0]).toBe('dc1');
  });

  it('findRoutes 找到多条路由', () => {
    const adj = buildComputeAdjacency(makeTopology());
    const routes = findRoutes(adj, 'dc1', 'dc2', { maxRoutes: 3 });
    expect(routes.length).toBeGreaterThan(0);
  });
});

describe('compute/predict', () => {
  it('predictSupplyDemand 识别缺口', () => {
    const topo = makeTopology();
    const gaps = predictSupplyDemand(topo, { daysAhead: 7, growthRate: 0.05 });
    // 华东 dc2 利用率 0.9，会预测缺口
    const east = gaps.find((g) => g.region === '华东');
    expect(east).toBeTruthy();
    expect(east!.isGap).toBe(true);
  });
});

describe('compute/latency', () => {
  it('latencyLevel 正确分级', () => {
    expect(latencyLevel(5)).toBe('excellent');
    expect(latencyLevel(20)).toBe('good');
    expect(latencyLevel(45)).toBe('fair');
    expect(latencyLevel(100)).toBe('poor');
  });
});

describe('compute/nlpg', () => {
  it('识别低利用率意图', () => {
    const r = parseComputeQuery('利用率低于 30% 的 GPU 节点');
    expect(r.intent).toBe('low_utilization');
    expect(r.filters.maxUtilization).toBeCloseTo(0.3);
  });

  it('识别光缆路由意图', () => {
    const r = parseComputeQuery('北京到上海之间有哪些光缆路由？');
    expect(r.intent).toBe('fiber_routes');
    expect(r.filters.from).toBe('北京');
    expect(r.filters.to).toBe('上海');
  });

  it('识别算力缺口意图', () => {
    const r = parseComputeQuery('预测下个月华东区的算力缺口');
    expect(r.intent).toBe('predict_gap');
    expect(r.filters.region).toBe('华东');
    expect(r.filters.timeWindow).toBe('30d');
  });
});
