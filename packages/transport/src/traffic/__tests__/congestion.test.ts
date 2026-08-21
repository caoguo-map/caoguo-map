import { describe, it, expect } from 'vitest';
import {
  predictCongestion,
  linearRegressionSlope,
  historicalStats,
} from '../congestionPredict';
import { classifySpeed } from '../../style/transportTheme';

describe('transport/traffic/congestionPredict', () => {
  it('linearRegressionSlope 上升序列斜率为正', () => {
    const slope = linearRegressionSlope([40, 45, 50, 55, 60]);
    expect(slope).toBeGreaterThan(0);
  });

  it('linearRegressionSlope 下降序列斜率为负', () => {
    const slope = linearRegressionSlope([60, 55, 50, 45, 40]);
    expect(slope).toBeLessThan(0);
  });

  it('linearRegressionSlope 空序列为 0', () => {
    expect(linearRegressionSlope([])).toBe(0);
    expect(linearRegressionSlope([1])).toBe(0);
  });

  it('historicalStats 计算均值和标准差', () => {
    const { mean, std } = historicalStats([50, 60, 70]);
    expect(mean).toBe(60);
    expect(std).toBeGreaterThan(0);
  });

  it('predictCongestion 返回合理结果', () => {
    const r = predictCongestion({
      historicalSpeeds: [60, 60, 60],
      recentSpeeds: [50, 45, 40, 35, 30],
      minutesAhead: 30,
    });
    expect(r.speed).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.congestionLevel).toBeTruthy();
  });

  it('classifySpeed 正确分级', () => {
    expect(classifySpeed(90)).toBe('free');
    expect(classifySpeed(70)).toBe('smooth');
    expect(classifySpeed(50)).toBe('slow');
    expect(classifySpeed(30)).toBe('congested');
    expect(classifySpeed(10)).toBe('jammed');
  });
});
