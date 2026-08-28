import { describe, it, expect } from 'vitest';
import type { LatencyRecord } from '../../types';
import { latencyTrendSeries, multiLatencyTrendSeries } from '../trend';

const T0 = 1_700_000_000_000;

const records: LatencyRecord[] = [
  { linkId: 'l1', latencyMs: 10, timestamp: T0 },
  { linkId: 'l1', latencyMs: 20, timestamp: T0 + 3600_000 },
  { linkId: 'l1', latencyMs: 30, timestamp: T0 + 7200_000 },
  { linkId: 'l2', latencyMs: 50, timestamp: T0 },
  { linkId: 'l2', latencyMs: 40, timestamp: T0 + 3600_000 },
];

describe('latencyTrendSeries（LM-3 延迟趋势数据层）', () => {
  it('按时间升序输出逐点序列', () => {
    const s = latencyTrendSeries(records, 'l1');
    expect(s.points.length).toBe(3);
    expect(s.points.map((p) => p.latencyMs)).toEqual([10, 20, 30]);
    expect(s.points[0].t).toBeLessThan(s.points[1].t);
    expect(s.points[1].t).toBeLessThan(s.points[2].t);
  });

  it('统计摘要与趋势方向（上升）', () => {
    const s = latencyTrendSeries(records, 'l1');
    expect(s.min).toBe(10);
    expect(s.max).toBe(30);
    expect(s.avg).toBe(20);
    expect(s.direction).toBe('up');
    expect(s.changeRate).toBeCloseTo(2, 5); // (30-10)/10 = 2
  });

  it('趋势方向（下降）', () => {
    const s = latencyTrendSeries(records, 'l2');
    expect(s.direction).toBe('down');
  });

  it('变化小于阈值时判定为平稳', () => {
    const flat: LatencyRecord[] = [
      { linkId: 'l3', latencyMs: 100, timestamp: T0 },
      { linkId: 'l3', latencyMs: 102, timestamp: T0 + 3600_000 },
    ];
    expect(latencyTrendSeries(flat, 'l3').direction).toBe('flat');
  });

  it('支持自定义 flatThreshold', () => {
    const flat: LatencyRecord[] = [
      { linkId: 'l3', latencyMs: 100, timestamp: T0 },
      { linkId: 'l3', latencyMs: 102, timestamp: T0 + 3600_000 },
    ];
    expect(latencyTrendSeries(flat, 'l3', { flatThreshold: 0.01 }).direction).toBe('up');
  });

  it('无 timestamp 的记录按 stepMs 合成时间轴', () => {
    const noTs: LatencyRecord[] = [
      { linkId: 'l4', latencyMs: 5 },
      { linkId: 'l4', latencyMs: 8 },
      { linkId: 'l4', latencyMs: 12 },
    ];
    const s = latencyTrendSeries(noTs, 'l4', { startTime: T0, stepMs: 60_000 });
    expect(s.points.map((p) => p.t)).toEqual([T0, T0 + 60_000, T0 + 120_000]);
  });

  it('同一时间戳重复时保留最后一条', () => {
    const dup: LatencyRecord[] = [
      { linkId: 'l5', latencyMs: 10, timestamp: T0 },
      { linkId: 'l5', latencyMs: 99, timestamp: T0 },
    ];
    const s = latencyTrendSeries(dup, 'l5');
    expect(s.points.length).toBe(1);
    expect(s.points[0].latencyMs).toBe(99);
  });

  it('无匹配记录时返回空序列（不抛错）', () => {
    const s = latencyTrendSeries(records, 'not-exist');
    expect(s.points).toEqual([]);
    expect(s.min).toBe(0);
    expect(s.max).toBe(0);
    expect(s.avg).toBe(0);
    expect(s.direction).toBe('flat');
  });

  it('records 为 undefined 时返回空序列', () => {
    expect(latencyTrendSeries(undefined, 'l1').points).toEqual([]);
  });
});

describe('multiLatencyTrendSeries', () => {
  it('未指定 linkIds 时对全部链路生成（按 id 升序）', () => {
    const all = multiLatencyTrendSeries(records);
    expect(all.map((s) => s.linkId)).toEqual(['l1', 'l2']);
  });

  it('可指定链路子集', () => {
    const sub = multiLatencyTrendSeries(records, ['l2']);
    expect(sub.length).toBe(1);
    expect(sub[0].points.length).toBe(2);
  });
});
