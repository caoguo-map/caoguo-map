import { describe, it, expect } from 'vitest';
import { forecastLoadSeries, predictLoad } from '../loadCore';

const T0 = 1_700_000_000_000;

describe('forecastLoadSeries（LH-2 负荷预测的图表数据层）', () => {
  it('输出点数与气温序列一致，且每个点都带时间戳', () => {
    const points = forecastLoadSeries({ base: 100, temps: [28, 30, 32, 31], startTime: T0 });
    expect(points.length).toBe(4);
    for (const p of points) {
      expect(typeof p.t).toBe('number');
      expect(p.predicted).toBe(true);
    }
  });

  it('默认步长 1 小时，首点为 startTime + 1h', () => {
    const points = forecastLoadSeries({ base: 100, temps: [28, 30], startTime: T0 });
    expect(points[0].t).toBe(T0 + 3_600_000);
    expect(points[1].t).toBe(T0 + 7_200_000);
  });

  it('支持自定义步长', () => {
    const points = forecastLoadSeries({
      base: 100,
      temps: [28, 30],
      startTime: T0,
      stepMs: 1_800_000,
    });
    expect(points[0].t).toBe(T0 + 1_800_000);
    expect(points[1].t).toBe(T0 + 3_600_000);
  });

  it('负荷值与 predictLoad 一致（逐点对齐）', () => {
    const temps = [27, 30, 35];
    const points = forecastLoadSeries({ base: 200, temps });
    temps.forEach((t, i) => {
      expect(points[i].load).toBeCloseTo(predictLoad({ base: 200, temperature: t }), 10);
    });
  });

  it('高温时负荷高于基准（>26℃ 每度 +2%）', () => {
    const [p] = forecastLoadSeries({ base: 100, temps: [31] });
    // 100 × (1 + 0.02 × 5) = 110
    expect(p.load).toBeCloseTo(110, 10);
  });

  it('节假日因子 0.7 生效', () => {
    const holiday = forecastLoadSeries({ base: 100, temps: [30], isHoliday: true });
    const normal = forecastLoadSeries({ base: 100, temps: [30] });
    expect(holiday[0].load).toBeCloseTo(normal[0].load * 0.7, 10);
  });

  it('事件修正因子生效', () => {
    const withEvent = forecastLoadSeries({ base: 100, temps: [30], eventFactor: 1.5 });
    const normal = forecastLoadSeries({ base: 100, temps: [30] });
    expect(withEvent[0].load).toBeCloseTo(normal[0].load * 1.5, 10);
  });

  it('气温序列为空时返回空数组', () => {
    expect(forecastLoadSeries({ base: 100, temps: [] })).toEqual([]);
  });
});
