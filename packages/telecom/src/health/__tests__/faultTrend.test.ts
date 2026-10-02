import { describe, it, expect } from 'vitest';
import { NetworkHealth } from '../NetworkHealth';

/**
 * NH-3 故障趋势（QA 审计 P1）：faultTrend 此前零测试。
 * 固化三类分桶语义：day=UTC 日期、month=UTC 年月、week=**epoch 起算的周序号**
 * （非自然周/ISO 周——这是实现口径，测试即文档）。
 */

const DAY = 86_400_000;

function nh() {
  return new NetworkHealth({ dataset: {} as never });
}

describe('NH-3 faultTrend 分桶', () => {
  it('day：按 UTC 日期聚合并升序', () => {
    const out = nh().faultTrend(
      [
        { stationId: 'a', timestamp: Date.UTC(2026, 0, 15, 10) },
        { stationId: 'b', timestamp: Date.UTC(2026, 0, 15, 20) },
        { stationId: 'c', timestamp: Date.UTC(2026, 0, 16, 8) },
      ],
      'day',
    );
    expect(out).toEqual([
      { bucket: '2026-01-15', count: 2 },
      { bucket: '2026-01-16', count: 1 },
    ]);
  });

  it('month：按 UTC 年月聚合', () => {
    const out = nh().faultTrend(
      [
        { stationId: 'a', timestamp: Date.UTC(2026, 0, 5) },
        { stationId: 'b', timestamp: Date.UTC(2026, 1, 5) },
      ],
      'month',
    );
    expect(out).toEqual([
      { bucket: '2026-01', count: 1 },
      { bucket: '2026-02', count: 1 },
    ]);
  });

  it('week：epoch 周序号（非自然周）——t=0 → week-0', () => {
    const out = nh().faultTrend(
      [
        { stationId: 'a', timestamp: 0 },
        { stationId: 'b', timestamp: 7 * DAY }, // 恰好第 1 周
        { stationId: 'c', timestamp: 7 * DAY + 3 * DAY }, // 仍在第 1 周
      ],
      'week',
    );
    expect(out).toEqual([
      { bucket: 'week-0', count: 1 },
      { bucket: 'week-1', count: 2 },
    ]);
  });

  it('空记录 → 空数组，不抛错', () => {
    expect(nh().faultTrend([], 'day')).toEqual([]);
  });

  it('升序排序为字符串序（同前缀下字典序）', () => {
    const out = nh().faultTrend(
      [
        { stationId: 'a', timestamp: Date.UTC(2026, 2, 1) },
        { stationId: 'b', timestamp: Date.UTC(2026, 0, 1) },
      ],
      'month',
    );
    expect(out.map((o) => o.bucket)).toEqual(['2026-01', '2026-03']);
  });
});
