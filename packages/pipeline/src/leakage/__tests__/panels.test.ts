import { describe, it, expect } from 'vitest';
import { renderLeakParamsHtml, leakParamsFromForm } from '../panels';
import { windDegToRadians } from '../weather';

describe('L-1 泄漏参数面板 panels', () => {
  it('输出五个可调字段并带 data-field（供事件委托）', () => {
    const html = renderLeakParamsHtml();
    for (const field of ['windDirectionDeg', 'windSpeed', 'leakRate', 'releaseHeight', 'stability']) {
      expect(html).toContain(`data-field="${field}"`);
    }
    expect(html).toContain('cg-panel--leak-params');
  });

  it('回填当前参数值', () => {
    const html = renderLeakParamsHtml({
      windDirectionDeg: 315,
      windSpeed: 8,
      leakRate: 5,
      releaseHeight: 10,
      stability: 'C',
    });
    expect(html).toContain('value="315"');
    expect(html).toContain('value="8"');
    expect(html).toContain('value="5"');
    expect(html).toContain('value="10"');
    expect(html).toContain('<option value="C" selected>');
  });

  it('class 模式不带内联样式', () => {
    const html = renderLeakParamsHtml({ style: 'class' });
    expect(html).not.toContain('style=');
  });

  it('leakParamsFromForm 把面板度数转成烟羽弧度', () => {
    // 北风（来向 0°）→ 下风向南 → -π/2
    const p = leakParamsFromForm({ windDirectionDeg: '0', windSpeed: '4', leakRate: '2' });
    expect(p.windDirection).toBeCloseTo(windDegToRadians(0), 9);
    expect(p.windDirection).toBeCloseTo(-Math.PI / 2, 6);
    expect(p.windSpeed).toBe(4);
    expect(p.leakRate).toBe(2);
  });

  it('leakParamsFromForm 对非法/缺失值用默认值兜底', () => {
    const p = leakParamsFromForm({ windDirectionDeg: 'abc', windSpeed: '', stability: 'X' });
    expect(Number.isFinite(p.windDirection)).toBe(true);
    expect(p.windSpeed).toBe(3); // 默认风速
    expect(p.stability).toBeUndefined(); // 'X' 不是合法稳定度
  });
});
