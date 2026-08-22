import { describe, it, expect, vi } from 'vitest';
import {
  aggregateOd,
  predictOd,
  suggestLineOptimization,
  odKey,
} from '../od';
import { TransitHeatmap } from '../TransitHeatmap';
import type { OdRecord, TransitStation } from '../types';

const stations: TransitStation[] = [
  { id: 's1', name: '甲站', lng: 116.0, lat: 39.0 },
  { id: 's2', name: '乙站', lng: 116.1, lat: 39.1 },
  { id: 's3', name: '丙站', lng: 116.2, lat: 39.2 },
];

const records: OdRecord[] = [
  { origin: 's1', dest: 's2', volume: 2000 },
  { origin: 's1', dest: 's3', volume: 1500 },
  { origin: 's2', dest: 's3', volume: 800 },
];

describe('transit/od aggregateOd', () => {
  it('聚合站点吞吐与 OD 权重', () => {
    const agg = aggregateOd(records);
    expect(agg.throughput['s1'].board).toBe(3500); // 2000+1500
    expect(agg.throughput['s2'].alight).toBe(2000);
    expect(agg.throughput['s3'].alight).toBe(2300);
    expect(agg.odWeights[odKey('s1', 's2')]).toBe(2000);
    expect(agg.maxOd).toBe(2000);
    expect(agg.maxThroughput).toBe(3500);
  });

  it('空记录返回零值聚合', () => {
    const agg = aggregateOd([]);
    expect(agg.maxOd).toBe(0);
    expect(Object.keys(agg.throughput)).toHaveLength(0);
  });
});

describe('transit/od predictOd', () => {
  it('按增长率外推 OD 流量', () => {
    const agg = aggregateOd(records);
    const pred = predictOd(agg.odWeights, 0.1);
    expect(pred.odWeights[odKey('s1', 's2')]).toBe(2200); // 2000*1.1
    expect(pred.growthRate).toBe(0.1);
    expect(pred.confidence).toBe(0.8);
  });
});

describe('transit/od suggestLineOptimization', () => {
  it('对无直达的高流量 OD 给出加线建议', () => {
    const direct = new Set<string>([odKey('s1', 's2')]);
    const sugg = suggestLineOptimization(records, direct, 500);
    // s1->s3 (1500) 与 s2->s3 (800) 不在直达集 → 建议；s1->s2 直达被排除
    expect(sugg.length).toBe(2);
    expect(sugg[0].from).toBe('s1');
    expect(sugg[0].to).toBe('s3');
    expect(sugg[0].unservedVolume).toBe(1500);
    expect(sugg[0].suggestion).toContain('建议新增直达线路');
  });

  it('低于阈值的不建议', () => {
    const onlySmall = [{ origin: 's2', dest: 's3', volume: 500 }];
    const sugg = suggestLineOptimization(onlySmall, new Set(), 1000);
    expect(sugg).toHaveLength(0);
  });
});

describe('transit/TransitHeatmap 渲染', () => {
  const makeMap = () => ({
    instance: {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
    },
    removeLayer: vi.fn(),
  });

  it('render 创建站点热力点与 OD 连线两层', () => {
    const map = makeMap();
    const hm = new TransitHeatmap({ map: map as never, stations });
    hm.render(records);
    expect(map.instance.addSource).toHaveBeenCalledTimes(2); // station + od
    expect(map.instance.addLayer).toHaveBeenCalledTimes(2);
  });

  it('destroy 清理两层', () => {
    const map = makeMap();
    const hm = new TransitHeatmap({ map: map as never, stations });
    hm.render(records);
    hm.destroy();
    expect(map.removeLayer).toHaveBeenCalledWith('cg-transit-station-heat');
    expect(map.removeLayer).toHaveBeenCalledWith('cg-transit-od-line');
  });

  it('renderPredicted 用预测权重重绘紫色连线', () => {
    const map = makeMap();
    const hm = new TransitHeatmap({ map: map as never, stations });
    const agg = aggregateOd(records);
    const pred = predictOd(agg.odWeights, 0.1);
    hm.renderPredicted(records, pred.odWeights);
    expect(map.instance.addSource).toHaveBeenCalled();
    expect(map.instance.addLayer).toHaveBeenCalled();
  });
});
