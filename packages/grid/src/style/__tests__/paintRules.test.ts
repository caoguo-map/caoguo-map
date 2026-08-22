import { describe, it, expect } from 'vitest';
import { paintLineWidthByVoltage, paintByVoltage } from '../paintRules';

/**
 * 回归：电压等级在 properties 中是**字符串**（'500'/'10'），
 * 旧的 paintLineWidthByVoltage 直接 interpolate 字符串 → NaN → 线宽 0 → 管线不显示。
 * 修复后表达式必须以 to-number 包裹电压取值。
 */
describe('paintLineWidthByVoltage（修复：字符串电压等级导致线宽 NaN）', () => {
  const expr = paintLineWidthByVoltage() as unknown[];
  const str = JSON.stringify(expr);

  it('interpolate 输入已用 to-number 包裹电压，避免对字符串求值 NaN', () => {
    expect(str).toContain('to-number');
    // to-number 应作用在 ["get","voltage"] 上
    expect(str).toContain('["get","voltage"]');
  });

  it('表达式结构为 interpolate/linear/输入值/档位，输入值经 to-number 转数值', () => {
    expect(expr[0]).toBe('interpolate');
    expect(expr[1]).toEqual(['linear']);
    // 第三项（输入表达式）必须包含 to-number，保证对字符串电压求值为数值而非 NaN
    expect(JSON.stringify(expr[2])).toContain('to-number');
  });

  it('电压等级着色用字符串键匹配（' + "'500'/'110' 等），颜色档齐全", () => {
    const colorExpr = paintByVoltage() as unknown[];
    // match 表达式
    expect(colorExpr[0]).toBe('match');
    const str = JSON.stringify(colorExpr);
    expect(str).toContain('"500"');
    expect(str).toContain('"110"');
    expect(str).toContain('"10"');
  });
});
