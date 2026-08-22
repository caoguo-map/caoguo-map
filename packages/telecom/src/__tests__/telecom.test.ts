import { describe, it, expect, vi } from 'vitest';
import {
  detectCoverageGaps,
  buildSectors,
  pointInPolygon,
  coverageOverlapRatio,
  classifySamples,
  rsrpWeight,
} from '../coverage';
import { CellCoverage } from '../coverage';
import { NetworkHealth } from '../health';
import { parseTelecomQuery } from '../nlpg';
import { classifyRsrp } from '../style';
import type { TelecomTopologyDataset } from '../types';

function makeTopology(): TelecomTopologyDataset {
  return {
    baseStations: [
      { id: 'bs1', type: 'macro', name: '站1', carrier: '中国移动', lng: 114.30, lat: 30.50, properties: { technology: '5G', status: 'online', azimuth: [0, 120, 240], region: '江汉' } },
      { id: 'bs2', type: 'micro', name: '站2', carrier: '中国联通', lng: 114.31, lat: 30.51, properties: { technology: '4G', status: 'fault', region: '江汉' } },
      { id: 'bs3', type: 'macro', name: '站3', carrier: '中国电信', lng: 114.32, lat: 30.52, properties: { technology: '5G', status: 'online', region: '江岸' } },
    ],
    coverageAreas: [
      { stationId: 'bs1', geom: [[114.29, 30.49], [114.31, 30.49], [114.31, 30.51], [114.29, 30.51]], signalLevel: 'excellent' },
      { stationId: 'bs3', geom: [[114.31, 30.51], [114.33, 30.51], [114.33, 30.53], [114.31, 30.53]], signalLevel: 'good' },
    ],
  };
}

describe('telecom/coverage', () => {
  it('pointInPolygon 射线法判断', () => {
    const poly: [number, number][] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(pointInPolygon(1, 1, poly)).toBe(true);
    expect(pointInPolygon(3, 3, poly)).toBe(false);
  });

  it('detectCoverageGaps 识别盲区', () => {
    const topo = makeTopology();
    const samples = [
      { lng: 114.30, lat: 30.50, rsrp: -80 }, // 在 bs1 覆盖内，良好
      { lng: 114.40, lat: 30.60, rsrp: -120 }, // 无覆盖
    ];
    const gaps = detectCoverageGaps(samples, topo.coverageAreas);
    expect(gaps.length).toBe(1);
    expect(gaps[0].level).toBe('none');
  });

  it('buildSectors 生成扇区', () => {
    const topo = makeTopology();
    const sectors = buildSectors(topo.baseStations[0]);
    expect(sectors.length).toBe(3);
    expect(sectors[0].azimuth).toBe(0);
  });

  it('coverageOverlapRatio 计算重叠率', () => {
    const topo = makeTopology();
    const ratio = coverageOverlapRatio(topo.coverageAreas, topo, '5G', '4G');
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it('classifySamples 分类信号', () => {
    const samples = [{ lng: 114, lat: 30, rsrp: -70 }];
    const r = classifySamples(samples);
    expect(r[0].level).toBe('good');
  });

  it('classifyRsrp 正确分级', () => {
    expect(classifyRsrp(-60)).toBe('excellent');
    expect(classifyRsrp(-75)).toBe('good');
    expect(classifyRsrp(-85)).toBe('fair');
    expect(classifyRsrp(-100)).toBe('poor');
  });
});

describe('telecom/CellCoverage 渲染', () => {
  const makeMap = () => ({
    instance: {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
    },
    removeLayer: vi.fn(),
  });

  it('CC-3 渲染连续信号强度热力图（heatmap 图层，提供 signalSamples 时）', () => {
    const topo = makeTopology();
    topo.signalSamples = [
      { lng: 114.305, lat: 30.505, rsrp: -70 },
      { lng: 114.315, lat: 30.515, rsrp: -110 },
    ];
    const map = makeMap();
    const cov = new CellCoverage({ map: map as never, dataset: topo });
    cov.render();
    const layers = (map.instance.addLayer as unknown as vi.Mock).mock.calls.map(
      (c: unknown[]) => c[0] as { id: string; type: string; paint?: Record<string, unknown> }
    );
    expect(layers.map((l) => l.id)).toContain('cg-cell-coverage-fill');
    expect(layers.map((l) => l.id)).toContain('cg-cell-station-pt');
    const heat = layers.find((l) => l.id === 'cg-cell-signal-heat');
    expect(heat).toBeDefined();
    expect(heat!.type).toBe('heatmap');
    expect(heat!.paint).toHaveProperty('heatmap-color');
  });

  it('rsrpWeight 将 RSRP 归一化为 0~1 权重（极弱有基础权重）', () => {
    expect(rsrpWeight(-120)).toBeCloseTo(0.15, 5);
    expect(rsrpWeight(-65)).toBeCloseTo(1, 5);
    expect(rsrpWeight(-92.5)).toBeCloseTo((0.15 + (27.5 / 55) * 0.85), 5);
  });

  it('未提供 signalSamples 时不渲染信号层', () => {
    const map = makeMap();
    const cov = new CellCoverage({ map: map as never, dataset: makeTopology() });
    cov.render();
    const ids = (map.instance.addLayer as unknown as vi.Mock).mock.calls.map(
      (c: unknown[]) => (c[0] as { id: string }).id
    );
    expect(ids).not.toContain('cg-cell-signal-pt');
  });
});

describe('telecom/health', () => {
  it('onlineRateByCarrier 统计在线率', () => {
    const health = new NetworkHealth({ dataset: makeTopology() });
    const stats = health.onlineRateByCarrier();
    const mobile = stats.find((s) => s.group === '中国移动');
    expect(mobile!.onlineRate).toBe(1);
    const unicom = stats.find((s) => s.group === '中国联通');
    expect(unicom!.onlineRate).toBe(0);
  });

  it('faultAlerts 返回故障基站', () => {
    const health = new NetworkHealth({ dataset: makeTopology() });
    const alerts = health.faultAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].station.id).toBe('bs2');
  });
});

describe('telecom/nlpg', () => {
  it('识别故障率意图', () => {
    const r = parseTelecomQuery('5G 基站中近 7 天故障率超过 5% 的');
    expect(r.intent).toBe('fault_rate');
    expect(r.filters.technology).toBe('5G');
    expect(r.filters.faultRateThreshold).toBeCloseTo(0.05);
  });

  it('识别重叠分析意图', () => {
    const r = parseTelecomQuery('这个区域内 4G 和 5G 覆盖的重叠率');
    expect(r.intent).toBe('overlap_analysis');
    expect(r.filters.techA).toBe('4G');
    expect(r.filters.techB).toBe('5G');
  });

  it('识别高负载意图', () => {
    const r = parseTelecomQuery('周边 2 公里内哪些基站负载最高？');
    expect(r.intent).toBe('high_load');
    expect(r.filters.radius).toBe(2000);
  });
});
