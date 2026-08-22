import { describe, it, expect, vi } from 'vitest';
import { stationCapacityStat, stationCapacityStats, capacityUtilizationPoints, CapacityHeatmap } from '../index';
import type { BaseStation, TelecomTopologyDataset } from '../../types';

const stations: BaseStation[] = [
  { id: 'b1', name: '关山', carrier: '中国移动', type: 'macro', lng: 114.31, lat: 30.51, properties: { throughputMbps: 900, capacityMbps: 1000, userCount: 400, capacityUserCount: 500 } },
  { id: 'b2', name: '光谷', carrier: '中国移动', type: 'macro', lng: 114.32, lat: 30.52, properties: { throughputMbps: 950, capacityMbps: 1000, userCount: 600, capacityUserCount: 500 } },
  { id: 'b3', carrier: '中国联通', type: 'micro', lng: 114.33, lat: 30.53, properties: { throughputMbps: 50 } },
];

const dataset: TelecomTopologyDataset = { baseStations: stations, coverageAreas: [] };

describe('CH 容量核心纯函数', () => {
  it('stationCapacityStat 计算利用率/用户负载/超载', () => {
    const s1 = stationCapacityStat(stations[0]);
    expect(s1.utilization).toBeCloseTo(0.9, 2);
    expect(s1.userLoad).toBeCloseTo(0.8, 2);
    expect(s1.overloaded).toBe(true); // 0.9 > 0.8

    const s3 = stationCapacityStat(stations[2]);
    expect(s3.utilization).toBeUndefined();
    expect(s3.overloaded).toBe(false);
  });

  it('stationCapacityStats 汇总平均利用率与超载数', () => {
    const sum = stationCapacityStats(stations);
    expect(sum.total).toBe(3);
    expect(sum.withCapacity).toBe(2);
    expect(sum.avgUtilization).toBeCloseTo(0.925, 2);
    expect(sum.overloadedCount).toBe(2);
    expect(sum.overloadedStations.map((s) => s.id)).toEqual(['b1', 'b2']);
  });

  it('capacityUtilizationPoints 生成热力点（weight 按 kind）', () => {
    const util = capacityUtilizationPoints(stations, 'utilization');
    expect(util.features).toHaveLength(3);
    expect(util.features[0].properties?.weight).toBeCloseTo(0.9, 2);

    const userLoad = capacityUtilizationPoints(stations, 'userLoad');
    expect(userLoad.features[0].properties?.weight).toBeCloseTo(0.8, 2);
  });
});

describe('CH CapacityHeatmap 渲染薄壳', () => {
  it('render 生成 heatmap 图层', () => {
    const addLayer = vi.fn();
    const m = {
      removeLayer: vi.fn(),
      instance: { addSource: vi.fn(), addLayer, getSource: vi.fn() },
    } as never;
    const ch = new CapacityHeatmap({ map: m, dataset });
    ch.render('utilization');
    expect(addLayer).toHaveBeenCalledTimes(1);
    const layer = addLayer.mock.calls[0][0] as { type: string };
    expect(layer.type).toBe('heatmap');
    ch.clear();
  });
});
