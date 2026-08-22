import { describe, it, expect } from 'vitest';
import { parseTransportQuery } from '../transportNlp';
import { executeTransportQuery } from '../execute';
import type { RoadNetworkDataset } from '../../types';

describe('transport/nlpg', () => {
  it('识别"速度最低"意图', () => {
    const r = parseTransportQuery('当前全网平均速度最低的 10 条路段');
    expect(r.intent).toBe('slowest_roads');
    expect(r.filters.topN).toBe(10);
  });

  it('识别"附近摄像头"意图', () => {
    const r = parseTransportQuery('这个事故点 3 公里内有多少摄像头？');
    expect(r.intent).toBe('nearby_poi');
    expect(r.filters.poiKind).toBe('camera');
    expect(r.filters.radius).toBe(3000);
  });

  it('识别"预测拥堵"意图', () => {
    const r = parseTransportQuery('预测未来 1 小时三环的拥堵变化');
    expect(r.intent).toBe('predict_congestion');
    expect(r.filters.minutesAhead).toBe(60);
    expect(r.filters.roadClass).toBe('urban');
  });

  it('识别"同比拥堵"意图', () => {
    const r = parseTransportQuery('今天早高峰拥堵比昨天严重吗？');
    expect(r.intent).toBe('compare_congestion');
    expect(r.filters.timeWindow).toBe('morning');
  });

  it('未知查询返回 unknown', () => {
    const r = parseTransportQuery('你好');
    expect(r.intent).toBe('unknown');
  });
});

const dataset: RoadNetworkDataset = {
  nodes: [
    { id: 'a', lng: 116.0, lat: 39.0 },
    { id: 'b', lng: 116.1, lat: 39.0 },
    { id: 'cam1', lng: 116.001, lat: 39.001, kind: 'camera' },
    { id: 'cam2', lng: 116.05, lat: 39.05, kind: 'camera' },
    { id: 'hosp1', lng: 116.002, lat: 39.002, kind: 'hospital' },
    { id: 'res1', lng: 116.2, lat: 39.2, kind: 'rescue' },
  ],
  edges: [
    { id: 'e1', fromNode: 'a', toNode: 'b', roadClass: 'highway' },
  ],
  speeds: [
    { edgeId: 'e1', speed: 30 },
    { edgeId: 'e2', speed: 10 },
    { edgeId: 'e3', speed: 80 },
  ],
};

describe('executeTransportQuery (执行层桥接真实数据)', () => {
  it('nearby_poi：返回半径内摄像头数量', () => {
    const res = executeTransportQuery('事故点 3 公里内有多少摄像头？', {
      center: { lng: 116.0, lat: 39.0 },
      dataset,
    });
    expect(res.intent).toBe('nearby_poi');
    if (res.data.type !== 'nearby_poi') throw new Error('unexpected');
    const camera = res.data.results.find((r) => r.kind === 'camera');
    // cam1 很近(~0.15km)，cam2 在 ~7.8km 外应被半径过滤
    expect(camera?.count).toBe(1);
  });

  it('nearby_poi：未指定类型时返回三类资源', () => {
    const res = executeTransportQuery('附近 3 公里内有什么资源？', {
      center: { lng: 116.0, lat: 39.0 },
      dataset,
    });
    if (res.data.type !== 'nearby_poi') throw new Error('unexpected');
    expect(res.data.results).toHaveLength(3);
  });

  it('slowest_roads：返回 Top N 最慢路段（升序）', () => {
    const res = executeTransportQuery('平均速度最低的 2 条路段', {
      dataset,
    });
    if (res.data.type !== 'slowest_roads') throw new Error('unexpected');
    expect(res.data.roads).toHaveLength(2);
    expect(res.data.roads[0].speed).toBe(10);
    expect(res.data.roads[1].speed).toBe(30);
  });

  it('predict_congestion：返回预测速度与拥堵等级', () => {
    const res = executeTransportQuery('预测未来 30 分钟拥堵', {
      dataset,
      historicalSpeeds: [60, 60, 60],
      recentSpeeds: [50, 45, 40],
      minutesAhead: 30,
    });
    if (res.data.type !== 'predict_congestion') throw new Error('unexpected');
    expect(res.data.prediction.speed).toBeGreaterThanOrEqual(0);
    expect(typeof res.data.prediction.congestionLevel).toBe('string');
  });

  it('compare_congestion：有双序列时给出同比结论', () => {
    const res = executeTransportQuery('今天早高峰比昨天严重吗？', {
      dataset,
      todaySpeeds: [20, 25, 20],
      yesterdaySpeeds: [50, 55, 50],
    });
    if (res.data.type !== 'compare_congestion') throw new Error('unexpected');
    expect(res.data.compare.hasData).toBe(true);
    expect(res.data.compare.worse).toBe(true);
    expect(res.data.compare.delta).toBeLessThan(0);
  });

  it('compare_congestion：缺序列时返回未就绪占位', () => {
    const res = executeTransportQuery('今天早高峰比昨天严重吗？', {
      dataset,
    });
    if (res.data.type !== 'compare_congestion') throw new Error('unexpected');
    expect(res.data.compare.hasData).toBe(false);
  });
});
