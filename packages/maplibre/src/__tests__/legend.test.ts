// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { LegendControl, renderLegendHtml } from '../controls/LegendControl';

describe('LegendControl (通用图例控件)', () => {
  it('renderLegendHtml 生成色块 + 文案，并对标签转义', () => {
    const html = renderLegendHtml(
      [
        { label: '水深 > 3m', color: '#ef4444' },
        { label: '利用率高', color: '#f59e0b', shape: 'line' },
      ],
      '水深图例',
    );
    expect(html).toContain('cg-legend-title');
    expect(html).toContain('水深图例');
    expect(html).toContain('cg-legend-swatch');
    expect(html).toContain('cg-legend-swatch--line');
    expect(html).toContain('background:#ef4444');
    expect(html).toContain('水深 &gt; 3m'); // < 被转义
  });

  it('setItems 运行时更新图例内容', () => {
    const ctrl = new LegendControl({ items: [{ label: 'A', color: '#000' }] });
    expect(ctrl['el'].textContent).toContain('A');
    ctrl.setItems([{ label: 'B', color: '#fff' }], '新标题');
    expect(ctrl['el'].textContent).toContain('B');
    expect(ctrl['el'].textContent).toContain('新标题');
    ctrl.remove();
  });
});
