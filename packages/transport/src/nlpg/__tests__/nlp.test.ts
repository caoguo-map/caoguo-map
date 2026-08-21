import { describe, it, expect } from 'vitest';
import { parseTransportQuery } from '../transportNlp';

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
