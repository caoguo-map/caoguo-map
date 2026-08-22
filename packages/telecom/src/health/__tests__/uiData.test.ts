import { describe, it, expect } from 'vitest';
import { buildStationCard, buildOnlineRateSeries, buildCapacitySeries } from '../uiData';
import type { BaseStation } from '../../types';

const stations: BaseStation[] = [
  { id: 'b1', name: '关山站', carrier: '中国移动', type: 'macro', lng: 114.31, lat: 30.51, properties: { status: 'online', throughputMbps: 600, userCount: 320, capacityMbps: 1000 } },
  { id: 'b2', carrier: '中国联通', type: 'micro', lng: 114.32, lat: 30.52, properties: { status: 'fault', throughputMbps: 5, userCount: 600 } },
];

describe('P2-c telecom 基站卡片/折线数据层', () => {
  it('buildStationCard 生成卡片 + 容量利用率', () => {
    const card = buildStationCard(stations[0]);
    expect(card.title).toBe('关山站');
    expect(card.capacityUtil).toBeCloseTo(0.6, 2);
    expect(card.statusColor).toBe('#22c55e');
    const fault = buildStationCard(stations[1]);
    expect(fault.capacityUtil).toBeUndefined(); // 无额定容量
    expect(fault.statusColor).toBe('#ef4444');
  });

  it('buildOnlineRateSeries 分组折线', () => {
    const series = buildOnlineRateSeries([
      { group: 'cmcc', total: 10, online: 9, onlineRate: 0.9 },
      { group: 'cucc', total: 5, online: 3, onlineRate: 0.6 },
    ]);
    expect(series.labels).toEqual(['cmcc', 'cucc']);
    expect(series.values).toEqual([0.9, 0.6]);
  });

  it('buildCapacitySeries 按容量利用率降序过滤无额定', () => {
    const series = buildCapacitySeries(stations);
    expect(series.labels).toEqual(['关山站']);
    expect(series.values[0]).toBeCloseTo(0.6, 2);
  });
});
