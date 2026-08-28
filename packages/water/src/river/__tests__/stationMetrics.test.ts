import { describe, it, expect, vi } from 'vitest';
import { RiverSystem } from '../RiverSystem';
import type { WaterDataset } from '../../types';
import {
  parseWaterMessage,
  applyMetricPatch,
  isOverWarning,
  rainfallLevelOf,
  stationSummary,
} from '../stationMetrics';

const feature = {
  id: 'st-1',
  kind: 'waterStation' as const,
  name: '汉口站',
  lng: 114.3,
  lat: 30.5,
  properties: { waterLevel: 27.5, warningLevel: 27.3, rainfall: 5 },
};

describe('parseWaterMessage（R-5 消息解析）', () => {
  it('解析精简键 {f, wl, rf, fr, ts}', () => {
    expect(parseWaterMessage('{"f":"st-1","wl":28.1,"rf":12,"fr":300,"ts":1700000000000}')).toEqual({
      featureId: 'st-1',
      waterLevel: 28.1,
      rainfall: 12,
      flowRate: 300,
      timestamp: 1700000000000,
    });
  });

  it('解析完整键', () => {
    expect(parseWaterMessage({ featureId: 'st-1', waterLevel: 28.1 })).toEqual({
      featureId: 'st-1',
      waterLevel: 28.1,
    });
  });

  it('非法 JSON 返回 null', () => {
    expect(parseWaterMessage('not-json')).toBeNull();
  });

  it('缺少 featureId 返回 null', () => {
    expect(parseWaterMessage('{"wl":28}')).toBeNull();
  });

  it('只有 id 无任何指标时返回 null', () => {
    expect(parseWaterMessage('{"f":"st-1"}')).toBeNull();
  });

  it('非数字指标被忽略', () => {
    expect(parseWaterMessage('{"f":"st-1","wl":"high"}')).toBeNull();
  });
});

describe('applyMetricPatch', () => {
  it('返回新对象且不修改原对象', () => {
    const next = applyMetricPatch(feature, { featureId: 'st-1', waterLevel: 28.2 })!;
    expect(next.properties?.waterLevel).toBe(28.2);
    expect(feature.properties?.waterLevel).toBe(27.5); // 原对象未被改动
    expect(next).not.toBe(feature);
  });

  it('只覆盖 patch 中给出的字段', () => {
    const next = applyMetricPatch(feature, { featureId: 'st-1', rainfall: 30 })!;
    expect(next.properties?.waterLevel).toBe(27.5);
    expect(next.properties?.rainfall).toBe(30);
  });

  it('id 不匹配或无有效字段时返回 null', () => {
    expect(applyMetricPatch(feature, { featureId: 'other', waterLevel: 1 })).toBeNull();
    expect(applyMetricPatch(feature, { featureId: 'st-1' })).toBeNull();
  });
});

describe('isOverWarning / rainfallLevelOf', () => {
  it('水位超警戒判定', () => {
    expect(isOverWarning(feature)).toBe(true); // 27.5 > 27.3
    expect(
      isOverWarning({ ...feature, properties: { waterLevel: 26, warningLevel: 27.3 } })
    ).toBe(false);
    expect(isOverWarning({ ...feature, properties: {} })).toBe(false);
  });

  it('降雨分级（中国气象降水量等级）', () => {
    expect(rainfallLevelOf(0)).toBe('none');
    expect(rainfallLevelOf(8)).toBe('light');
    expect(rainfallLevelOf(10)).toBe('moderate');
    expect(rainfallLevelOf(30)).toBe('heavy');
    expect(rainfallLevelOf(80)).toBe('torrential');
  });
});

describe('stationSummary', () => {
  const features: WaterDataset['features'] = [
    { ...feature },
    {
      id: 'st-2',
      kind: 'rainStation',
      lng: 114.4,
      lat: 30.6,
      properties: { rainfall: 62, waterLevel: 10, warningLevel: 20 },
    },
    { id: 'reach-1', kind: 'reach', lng: 114.5, lat: 30.7, geometry: [[114.5, 30.7], [114.6, 30.8]] },
  ];

  it('默认只统计雨量站/水位站/水库', () => {
    const s = stationSummary(features);
    expect(s.total).toBe(2); // reach 不计入
    expect(s.overWarning).toBe(1); // st-1 超警戒
    expect(s.maxRainfall).toBe(62);
  });

  it('可指定统计类型', () => {
    expect(stationSummary(features, ['reach']).total).toBe(1);
  });
});

describe('RiverSystem 实时指标接入（R-5）', () => {
  function makeMap() {
    const layers = new Set<string>();
    return {
      layers,
      removeLayer(id: string) {
        layers.delete(id);
      },
      instance: {
        addSource: vi.fn(),
        addLayer: vi.fn((l: { id: string }) => {
          layers.add(l.id);
        }),
        getSource: vi.fn(() => undefined),
        setPaintProperty: vi.fn(),
      },
    } as any;
  }

  const dataset: WaterDataset = {
    features: [
      { ...feature, properties: { ...feature.properties } },
      {
        id: 'st-2',
        kind: 'rainStation',
        name: '汉阳雨量站',
        lng: 114.4,
        lat: 30.6,
        properties: { rainfall: 12 },
      },
    ],
  };

  it('updateStationMetrics 写回数据集并返回变化的 id', () => {
    const river = new RiverSystem({ map: makeMap(), dataset, layerPrefix: 'w' });
    const changed = river.updateStationMetrics([
      { featureId: 'st-2', rainfall: 45 },
      { featureId: 'not-exist', rainfall: 1 },
    ]);
    expect(changed).toEqual(['st-2']);
    expect(dataset.features[1].properties?.rainfall).toBe(45);
  });

  it('parseStationMessage 与 updateStationMetrics 串联可用', () => {
    const river = new RiverSystem({ map: makeMap(), dataset, layerPrefix: 'w' });
    const patch = river.parseStationMessage('{"f":"st-1","wl":29.9}');
    expect(patch).not.toBeNull();
    expect(river.updateStationMetrics([patch!])).toEqual(['st-1']);
    expect(dataset.features[0].properties?.waterLevel).toBe(29.9);
  });

  it('renderStationMetrics 渲染站点图层并可清除', () => {
    const map = makeMap();
    const river = new RiverSystem({ map, dataset, layerPrefix: 'w' });
    expect(river.renderStationMetrics()).toBe(2);
    expect(map.layers.has('w-station-pt')).toBe(true);

    river.clearStationMetrics();
    expect(map.layers.has('w-station-pt')).toBe(false);
  });

  it('无站点要素时不创建设施图层', () => {
    const map = makeMap();
    const river = new RiverSystem({
      map,
      dataset: { features: [{ id: 'r1', kind: 'reach', lng: 114, lat: 30, geometry: [[114, 30], [114.1, 30.1]] }] },
      layerPrefix: 'w',
    });
    expect(river.renderStationMetrics()).toBe(0);
    expect(map.layers.has('w-station-pt')).toBe(false);
  });

  it('stationSummary 反映更新后的超警戒数', () => {
    const river = new RiverSystem({ map: makeMap(), dataset, layerPrefix: 'w' });
    expect(river.stationSummary().overWarning).toBe(1);
    river.updateStationMetrics([{ featureId: 'st-1', waterLevel: 26.5 }]);
    expect(river.stationSummary().overWarning).toBe(0);
  });
});
