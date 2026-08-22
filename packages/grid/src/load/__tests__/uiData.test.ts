import { describe, it, expect } from 'vitest';
import { buildLoadSeries, buildMultiLoadSeries } from '../uiData';

describe('P2-c grid 负荷折线数据层', () => {
  it('buildLoadSeries 按时间排序并标记过载', () => {
    const series = buildLoadSeries('d1', [
      { t: 2, loadRate: 0.9 },
      { t: 1, loadRate: 0.5 },
    ]);
    expect(series.labels).toHaveLength(2);
    expect(series.values).toEqual([0.5, 0.9]);
    expect(series.overloaded).toEqual([false, true]);
  });

  it('buildMultiLoadSeries 合并多设备到统一时间轴', () => {
    const out = buildMultiLoadSeries([
      { deviceId: 'd1', points: [{ t: 1, loadRate: 0.4 }, { t: 3, loadRate: 0.6 }] },
      { deviceId: 'd2', points: [{ t: 1, loadRate: 0.7 }] },
    ]);
    expect(out.labels).toHaveLength(2);
    expect(out.devices).toEqual(['d1', 'd2']);
    expect(out.values['d2']).toEqual([0.7, NaN]);
  });
});
