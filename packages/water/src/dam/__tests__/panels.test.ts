import { describe, it, expect } from 'vitest';
import type { WaterDataset } from '../../types';
import { renderReservoirPanelHtml, renderScheduleEditorHtml } from '../panels';
import { getReservoirDetails } from '../../river/reservoirCard';

const dataset: WaterDataset = {
  features: [
    {
      id: 'res-1',
      kind: 'reservoir',
      name: '夏家寺水库',
      lng: 114.32,
      lat: 30.52,
      properties: { storageRate: 0.68, waterLevel: 168.5, warningLevel: 170, capacity: 12000 },
    },
    {
      id: 'res-2',
      kind: 'reservoir',
      name: '梅店水库',
      lng: 114.35,
      lat: 30.55,
      properties: { storageRate: 0.95, waterLevel: 172, warningLevel: 170 },
    },
  ],
};

describe('renderReservoirPanelHtml（DO-1 多水库状态面板）', () => {
  it('包含全部水库行与关键列', () => {
    const html = renderReservoirPanelHtml(getReservoirDetails(dataset));
    expect(html).toContain('夏家寺水库');
    expect(html).toContain('梅店水库');
    expect(html).toContain('68%');
    expect(html).toContain('12,000 万 m³');
  });

  it('超警戒水库名称标红', () => {
    const html = renderReservoirPanelHtml(getReservoirDetails(dataset));
    expect(html).toContain('#f87171');
  });

  it('内容转义防注入', () => {
    const evil = getReservoirDetails({
      features: [
        {
          id: 'r',
          kind: 'reservoir',
          name: '<script>alert(1)</script>',
          lng: 0,
          lat: 0,
          properties: {},
        },
      ],
    });
    const html = renderReservoirPanelHtml(evil);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('renderScheduleEditorHtml（DO-2 调度方案编辑器）', () => {
  it('每水库一行滑杆，data-reservoir-id 可供事件委托', () => {
    const html = renderScheduleEditorHtml(getReservoirDetails(dataset), {
      outflows: { 'res-1': 50 },
    });
    expect((html.match(/data-reservoir-id/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('value="50"'); // res-1 回填
    expect(html).toContain('value="0"'); // res-2 默认
  });

  it('出库为正/蓄水为负的口径提示', () => {
    expect(renderScheduleEditorHtml(getReservoirDetails(dataset))).toContain('出库为正');
  });
});
