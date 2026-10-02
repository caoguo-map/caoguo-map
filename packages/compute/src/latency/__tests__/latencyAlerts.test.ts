import { describe, it, expect } from 'vitest';
import { LatencyMap, latencyLevel } from '../LatencyMap';

/**
 * LM-4 延迟告警（QA 审计 P1）：checkAlerts 此前零测试。
 * 固化三类关键语义：恰好等于阈值不告警、NaN 不告警、超 2 倍阈值为 critical。
 */

function makeMap() {
  return { instance: { addSource: () => {}, getSource: () => null, addLayer: () => {} } };
}

const links = [
  { id: 'l-crit', properties: { latencyMs: 120 } },
  { id: 'l-warn', properties: { latencyMs: 60 } },
  { id: 'l-equal', properties: { latencyMs: 50 } }, // 恰好等于阈值
  { id: 'l-nan', properties: { latencyMs: NaN } },
  { id: 'l-none', properties: {} }, // 缺省 → 0
];

describe('LM-4 checkAlerts', () => {
  it('默认阈值 50ms：仅 60/120 告警，按延迟降序', () => {
    const lm = new LatencyMap({ map: makeMap() as never, dataset: { nodes: [], links } as never });
    const alerts = lm.checkAlerts();
    expect(alerts.map((a) => a.linkId)).toEqual(['l-crit', 'l-warn']);
    expect(alerts[0].level).toBe('critical'); // 120 > 50×2
    expect(alerts[1].level).toBe('warning');
    expect(alerts[0].thresholdMs).toBe(50);
  });

  it('恰好等于阈值不告警（严格大于）', () => {
    const lm = new LatencyMap({
      map: makeMap() as never,
      dataset: { nodes: [], links: [links[2]] } as never,
    });
    expect(lm.checkAlerts()).toEqual([]);
  });

  it('NaN 延迟不告警（NaN > 阈值为 false）', () => {
    const lm = new LatencyMap({
      map: makeMap() as never,
      dataset: { nodes: [], links: [links[3]] } as never,
    });
    expect(lm.checkAlerts()).toEqual([]);
  });

  it('缺省延迟按 0 处理，不告警', () => {
    const lm = new LatencyMap({
      map: makeMap() as never,
      dataset: { nodes: [], links: [links[4]] } as never,
    });
    expect(lm.checkAlerts()).toEqual([]);
  });

  it('自定义阈值生效', () => {
    const lm = new LatencyMap({
      map: makeMap() as never,
      dataset: { nodes: [], links: [links[2]] } as never,
      thresholdMs: 40,
    });
    const alerts = lm.checkAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('warning'); // 50 ≤ 40×2
  });
});

describe('latencyLevel 分级边界', () => {
  it('≤10 excellent / ≤30 good / ≤60 fair / 其余 poor', () => {
    expect(latencyLevel(5)).toBe('excellent');
    expect(latencyLevel(10)).toBe('excellent'); // 恰好边界
    expect(latencyLevel(30)).toBe('good');
    expect(latencyLevel(60)).toBe('fair');
    expect(latencyLevel(61)).toBe('poor');
  });
});
