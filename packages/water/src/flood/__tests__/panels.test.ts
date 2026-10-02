import { describe, it, expect } from 'vitest';
import { renderFloodParamsHtml } from '../panels';

/** F-1 淹没参数面板：此前零测试，补齐字段、回填、转义与缺省分支 */

describe('renderFloodParamsHtml（F-1 淹没参数面板）', () => {
  it('输出降雨量/来水量两个 data-field 供事件委托', () => {
    const html = renderFloodParamsHtml();
    expect(html).toContain('data-field="rainfall"');
    expect(html).toContain('data-field="inflow"');
    expect(html).toContain('cg-panel--flood-params');
  });

  it('未传 reaches 时不输出河段 select', () => {
    expect(renderFloodParamsHtml()).not.toContain('data-field="reachId"');
  });

  it('传入 reaches 时输出 select，并回填当前 reachId 为 selected', () => {
    const html = renderFloodParamsHtml({
      reaches: [
        { id: 'r1', name: '长江干流' },
        { id: 'r2', name: '汉江支流' },
      ],
      reachId: 'r2',
    });
    expect(html).toContain('data-field="reachId"');
    expect(html).toContain('<option value="r2" selected>');
    expect(html).toContain('长江干流');
  });

  it('回填数值，未传时用默认值', () => {
    expect(renderFloodParamsHtml({ rainfall: 250, inflow: 400 })).toContain('value="250"');
    expect(renderFloodParamsHtml()).toContain('value="100"'); // rainfall 默认
    expect(renderFloodParamsHtml()).toContain('value="200"'); // inflow 默认
  });

  it('河段名含 HTML 特殊字符时转义（防注入）', () => {
    const html = renderFloodParamsHtml({
      reaches: [{ id: 'x"y', name: '<img src=x onerror=alert(1)>' }],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&quot;');
  });

  it('class 模式不带内联样式', () => {
    expect(renderFloodParamsHtml({ style: 'class' })).not.toContain('style=');
  });
});
