import { describe, it, expect } from 'vitest';
import {
  readThresholdRule,
  evalThreshold,
  thresholdColor,
  resolveDeviceColor,
} from '../thresholds';

describe('thresholds', () => {
  it('readThresholdRule 解析扁平 key', () => {
    expect(readThresholdRule({ thrField: 'load', thrWarn: 70, thrCrit: 90 })).toEqual({
      field: 'load',
      warn: 70,
      crit: 90,
    });
    expect(readThresholdRule({ thrWarn: '60' })).toEqual({ field: undefined, warn: 60, crit: undefined });
    expect(readThresholdRule(undefined)).toEqual({ field: undefined, warn: undefined, crit: undefined });
  });

  it('evalThreshold 判定级别', () => {
    const rule = { field: 'load', warn: 70, crit: 90 };
    expect(evalThreshold(rule, 50)).toBe('none');
    expect(evalThreshold(rule, 70)).toBe('warn');
    expect(evalThreshold(rule, 85)).toBe('warn');
    expect(evalThreshold(rule, 90)).toBe('crit');
    expect(evalThreshold(rule, 100)).toBe('crit');
  });

  it('evalThreshold 缺字段或无值返回 none', () => {
    expect(evalThreshold({ field: 'load', warn: 1 }, undefined)).toBe('none');
    expect(evalThreshold({}, 99)).toBe('none');
  });

  it('thresholdColor 返回对应颜色', () => {
    expect(thresholdColor('crit')).toBe('#f87171');
    expect(thresholdColor('warn')).toBe('#fbbf24');
    expect(thresholdColor('none')).toBeNull();
  });

  it('resolveDeviceColor 本地阈值优先于回退色', () => {
    const rule = { field: 'load', warn: 70, crit: 90 };
    expect(resolveDeviceColor(rule, { load: 95 }, '#3b82f6')).toBe('#f87171');
    expect(resolveDeviceColor(rule, { load: 80 }, '#3b82f6')).toBe('#fbbf24');
    expect(resolveDeviceColor(rule, { load: 30 }, '#3b82f6')).toBe('#3b82f6');
    // 规则未配置字段时使用回退色
    expect(resolveDeviceColor({ field: '' }, { load: 95 }, '#3b82f6')).toBe('#3b82f6');
  });
});
