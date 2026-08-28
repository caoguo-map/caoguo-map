import { describe, it, expect } from 'vitest';
import type { BaseStation } from '../../types';
import { NetworkHealth } from '../NetworkHealth';
import { diagnoseFaultStation, diagnoseFaults } from '../faultDiagnosis';

function station(id: string, props: Record<string, unknown> = {}): BaseStation {
  return {
    id,
    type: 'macro',
    name: `站-${id}`,
    carrier: '中国移动',
    lng: 114.3,
    lat: 30.5,
    properties: { status: 'fault', region: '江汉', ...props } as never,
  };
}

describe('diagnoseFaultStation（NH-4 多因子诊断）', () => {
  it('命中多个因子时全部返回，而非只返回第一个', () => {
    const d = diagnoseFaultStation(station('a', { throughputMbps: 5, userCount: 900 }));
    expect(d.reasons.map((r) => r.code).sort()).toEqual(['low_throughput', 'user_overload']);
  });

  it('主因取严重度最高者（功率异常 > 吞吐/过载）', () => {
    const d = diagnoseFaultStation(
      station('a', { throughputMbps: 5, userCount: 900, powerDbm: 20 })
    );
    expect(d.primary.code).toBe('low_power');
    expect(d.reasons[0].code).toBe('low_power');
  });

  it('每条根因带可解释的证据文案', () => {
    const d = diagnoseFaultStation(station('a', { throughputMbps: 5 }));
    expect(d.reasons[0].evidence).toContain('5');
    expect(d.reasons[0].evidence).toContain('10'); // 默认阈值
  });

  it('无异常时主因为 unknown，置信度 0', () => {
    const d = diagnoseFaultStation(station('a', { throughputMbps: 500, userCount: 100, powerDbm: 46 }));
    expect(d.primary.code).toBe('unknown');
    expect(d.reasons).toEqual([]);
    expect(d.confidence).toBe(0);
  });

  it('阈值可通过 options 覆盖', () => {
    const strict = diagnoseFaultStation(station('a', { throughputMbps: 50 }), {
      minThroughputMbps: 100,
    });
    expect(strict.primary.code).toBe('low_throughput');

    const loose = diagnoseFaultStation(station('a', { throughputMbps: 50 }), {
      minThroughputMbps: 10,
    });
    expect(loose.primary.code).toBe('unknown');
  });

  it('字段缺失时该因子不参与判定（不误报）', () => {
    const d = diagnoseFaultStation(station('a', {}));
    expect(d.primary.code).toBe('unknown');
  });

  it('置信度随命中因子数提高', () => {
    const one = diagnoseFaultStation(station('a', { throughputMbps: 5 })).confidence;
    const two = diagnoseFaultStation(
      station('a', { throughputMbps: 5, userCount: 900 })
    ).confidence;
    expect(two).toBeGreaterThan(one);
  });

  it('传入 clusterFaultRegions 时追加区域性聚集根因', () => {
    const d = diagnoseFaultStation(station('a', { throughputMbps: 500 }), {
      clusterFaultRegions: new Set(['江汉']),
    });
    expect(d.reasons.map((r) => r.code)).toContain('cluster_outage');
    expect(d.primary.code).toBe('cluster_outage');
  });
});

describe('diagnoseFaults（批量 + 区域聚集）', () => {
  it('只诊断 status=fault 的基站', () => {
    const stations = [
      station('a', {}),
      { ...station('b', {}), properties: { status: 'online', region: '江汉' } as never },
    ];
    expect(diagnoseFaults(stations).total).toBe(1);
    expect(diagnoseFaults(stations).details[0].stationId).toBe('a');
  });

  it('同区域多站故障判定为区域性聚集', () => {
    const stations = [
      station('a', { region: '江汉' }),
      station('b', { region: '江汉' }),
      station('c', { region: '武昌' }),
    ];
    const r = diagnoseFaults(stations);
    expect(r.clusterRegions).toEqual([{ region: '江汉', faultCount: 2 }]);
    // 江汉两站均带 cluster_outage
    const jianghan = r.details.filter((d) => ['a', 'b'].includes(d.stationId));
    for (const d of jianghan) {
      expect(d.reasons.map((x) => x.code)).toContain('cluster_outage');
    }
  });

  it('clusterMinFaults 可调（设 0 关闭聚集检测）', () => {
    const stations = [station('a', { region: '江汉' }), station('b', { region: '江汉' })];
    expect(diagnoseFaults(stations, { clusterMinFaults: 0 }).clusterRegions).toEqual([]);
    expect(diagnoseFaults(stations, { clusterMinFaults: 3 }).clusterRegions).toEqual([]);
  });

  it('按主因计数（各站分属不同区域，避免聚集效应干扰）', () => {
    const stations = [
      station('a', { powerDbm: 20, region: '江汉' }),
      station('b', { throughputMbps: 1, region: '武昌' }),
      station('c', { throughputMbps: 1, region: '洪山' }),
    ];
    const r = diagnoseFaults(stations);
    expect(r.byReason.low_power).toBe(1);
    expect(r.byReason.low_throughput).toBe(2);
  });

  it('区域聚集为 critical，会压过单站指标异常成为主因', () => {
    // 三站同区域同时故障 → 更可能是区域性断电/传输中断，而非各站独立故障
    const stations = [
      station('a', { powerDbm: 20, region: '江汉' }),
      station('b', { throughputMbps: 1, region: '江汉' }),
      station('c', { throughputMbps: 1, region: '江汉' }),
    ];
    const r = diagnoseFaults(stations);
    expect(r.byReason.cluster_outage).toBe(3);
    expect(r.byReason.low_power).toBe(0);
  });

  it('无故障站时返回空结果', () => {
    const stations = [
      { ...station('a', {}), properties: { status: 'online', region: '江汉' } as never },
    ];
    const r = diagnoseFaults(stations);
    expect(r.total).toBe(0);
    expect(r.details).toEqual([]);
    expect(r.clusterRegions).toEqual([]);
  });
});

describe('NetworkHealth 接入（NH-4）', () => {
  const dataset = {
    baseStations: [
      station('a', { powerDbm: 20, region: '江汉' }),
      station('b', { region: '江汉' }),
      station('c', { throughputMbps: 2, region: '武昌' }),
    ],
  } as never;

  it('faultDiagnosis 返回单站完整诊断（a 与 b 同区域，故主因为区域性聚集）', () => {
    const nh = new NetworkHealth({ dataset });
    const d = nh.faultDiagnosis('a')!;
    const codes = d.reasons.map((r) => r.code);
    expect(codes).toContain('low_power'); // 单站证据仍在
    expect(codes).toContain('cluster_outage');
    expect(d.primary.code).toBe('cluster_outage'); // 更全局的原因优先
  });

  it('faultDiagnosis 对不存在的站返回 undefined', () => {
    const nh = new NetworkHealth({ dataset });
    expect(nh.faultDiagnosis('not-exist')).toBeUndefined();
  });

  it('diagnoseFaults 汇总（含区域聚集）', () => {
    const nh = new NetworkHealth({ dataset });
    const r = nh.diagnoseFaults();
    expect(r.total).toBe(3);
    expect(r.clusterRegions).toEqual([{ region: '江汉', faultCount: 2 }]);
  });

  it('guessFaultReason 保持兼容：返回主因文案', () => {
    const nh = new NetworkHealth({ dataset });
    // c 站独立区域（武昌），不触发聚集 → 主因即单站指标异常
    expect(nh.guessFaultReason(dataset.baseStations[2])).toBe('吞吐量异常偏低');
    // a 站与 b 站同区域 → 主因为区域性聚集
    expect(nh.guessFaultReason(dataset.baseStations[0])).toBe('区域性聚集故障');
  });

  it('guessFaultReason 单站场景（无聚集）回到原行为', () => {
    const nh = new NetworkHealth({
      dataset: { baseStations: [station('x', { powerDbm: 20, region: '汉阳' })] } as never,
    });
    expect(nh.guessFaultReason(nh['dataset'].baseStations[0])).toBe('发射功率异常');
  });

  it('faultAlerts 仍然可用（reason 为文案）', () => {
    const nh = new NetworkHealth({ dataset });
    const alerts = nh.faultAlerts();
    expect(alerts.length).toBe(3);
    expect(typeof alerts[0].reason).toBe('string');
  });
});
