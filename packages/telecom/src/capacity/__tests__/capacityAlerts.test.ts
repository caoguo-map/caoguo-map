import { describe, it, expect } from 'vitest';
import {
  capacityAlerts,
  alertSeveritySummary,
  topOverloadedStations,
  DEFAULT_ALERT_THRESHOLDS,
} from '../capacityCore';
import type { BaseStation } from '../../types';

function st(id: string, capacityMbps: number | undefined, throughputMbps: number | undefined): BaseStation {
  return {
    id,
    type: 'macro',
    lng: 116 + Math.random() * 0.01,
    lat: 39 + Math.random() * 0.01,
    properties: { capacityMbps, throughputMbps },
  };
}

describe('CH-3 capacityAlerts 容量预警', () => {
  it('按利用率降序排列', () => {
    const stations = [
      st('s1', 1000, 850), // 0.85 warning
      st('s2', 1000, 980), // 0.98 critical
      st('s3', 1000, 500), // 0.5 info 阈值以下
    ];
    const alerts = capacityAlerts(stations);
    expect(alerts.length).toBe(2);
    expect(alerts[0].stationId).toBe('s2');
    expect(alerts[0].utilization).toBe(0.98);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[1].stationId).toBe('s1');
    expect(alerts[1].severity).toBe('warning');
  });

  it('默认阈值：critical≥0.95, warning≥0.85, info≥0.80', () => {
    const stations = [
      st('a', 1000, 960), // 0.96 critical
      st('b', 1000, 900), // 0.9 warning
      st('c', 1000, 820), // 0.82 info
      st('d', 1000, 700), // 0.7 阈值以下
    ];
    const alerts = capacityAlerts(stations);
    const sev = alertSeveritySummary(alerts);
    expect(sev.critical).toBe(1);
    expect(sev.warning).toBe(1);
    expect(sev.info).toBe(1);
    expect(alerts).toHaveLength(3);
  });

  it('阈值低于利用率时 → critical', () => {
    const stations = [st('x', 1000, 920)];
    const alerts = capacityAlerts(stations, { critical: 0.5, warning: 0.3, info: 0.1 });
    expect(alerts[0].severity).toBe('critical');
  });

  it('超出阈值比例 exceed 正确', () => {
    const stations = [st('x', 1000, 900)];
    const alerts = capacityAlerts(stations);
    expect(alerts[0].exceed).toBeCloseTo(0.1, 5);
  });

  it('缺 capacityMbps 的基站不出现在预警中', () => {
    const stations = [
      st('no_cap', undefined, 500), // utilization undefined
    ];
    expect(capacityAlerts(stations)).toEqual([]);
  });

  it('空输入返回空数组', () => {
    expect(capacityAlerts([])).toEqual([]);
  });

  it('DEFAULT_ALERT_THRESHOLDS 默认 critical=0.95', () => {
    expect(DEFAULT_ALERT_THRESHOLDS.critical).toBe(0.95);
    expect(DEFAULT_ALERT_THRESHOLDS.warning).toBe(0.85);
    expect(DEFAULT_ALERT_THRESHOLDS.info).toBe(0.8);
  });
});

describe('topOverloadedStations', () => {
  it('返回 Top N 超载基站', () => {
    const stations = [
      st('s1', 1000, 900),
      st('s2', 1000, 950),
      st('s3', 1000, 850),
      st('s4', 1000, 700), // 不超载
    ];
    const top = topOverloadedStations(stations, 2);
    expect(top.length).toBe(2);
    expect(top[0].id).toBe('s2'); // 0.95
    expect(top[1].id).toBe('s1'); // 0.9
  });

  it('自定义阈值生效', () => {
    const stations = [
      st('a', 1000, 900), // 0.9
      st('b', 1000, 700), // 0.7
    ];
    const top = topOverloadedStations(stations, 5, 0.6);
    expect(top.length).toBe(2);
  });

  it('空输入返回空数组', () => {
    expect(topOverloadedStations([], 5)).toEqual([]);
  });
});