import { describe, it, expect } from 'vitest';
import { readImages, readMaintenance, readCardFields, renderCardHtml } from '../cardFields';

describe('readImages', () => {
  it('读取字符串数组', () => {
    expect(readImages({ images: ['a.jpg', 'b.jpg'] })).toEqual(['a.jpg', 'b.jpg']);
  });

  it('过滤非字符串项', () => {
    expect(readImages({ images: ['a.jpg', 123, null, 'b.jpg'] })).toEqual(['a.jpg', 'b.jpg']);
  });

  it('非数组 / 缺失 / undefined 均返回空数组', () => {
    expect(readImages({ images: 'not-an-array' })).toEqual([]);
    expect(readImages({})).toEqual([]);
    expect(readImages(undefined)).toEqual([]);
  });
});

describe('readMaintenance', () => {
  it('读取合法记录（含可选字段）', () => {
    expect(
      readMaintenance({
        maintenance: [{ date: '2026-03-12', type: '例行巡检', operator: '张工', note: '正常' }],
      })
    ).toEqual([{ date: '2026-03-12', type: '例行巡检', operator: '张工', note: '正常' }]);
  });

  it('缺少 date 或 type 的记录被丢弃', () => {
    expect(
      readMaintenance({
        maintenance: [
          { date: '2026-01-01', type: '巡检' },
          { date: 'bad-record' },
          { type: '缺日期' },
          'not-an-object',
          null,
        ],
      })
    ).toEqual([{ date: '2026-01-01', type: '巡检' }]);
  });

  it('忽略类型不符的可选字段', () => {
    expect(
      readMaintenance({
        maintenance: [{ date: '2026-01-01', type: '巡检', operator: 42, note: 7 }],
      })
    ).toEqual([{ date: '2026-01-01', type: '巡检' }]);
  });

  it('非数组 / undefined 返回空数组', () => {
    expect(readMaintenance({ maintenance: 'x' })).toEqual([]);
    expect(readMaintenance(undefined)).toEqual([]);
  });
});

describe('readCardFields', () => {
  it('一次性返回两类字段', () => {
    expect(
      readCardFields({
        images: ['a.jpg'],
        maintenance: [{ date: '2026-01-01', type: '巡检' }],
      })
    ).toEqual({
      images: ['a.jpg'],
      maintenance: [{ date: '2026-01-01', type: '巡检' }],
    });
  });

  it('空 extra 返回两个空数组', () => {
    expect(readCardFields({})).toEqual({ images: [], maintenance: [] });
  });
});

describe('renderCardHtml（G-2/P-3/R-2 共用 DOM 外壳）', () => {
  const card = {
    title: '关山变电站',
    subtitle: '变电站 · SS-001',
    statusLabel: '运行中',
    statusColor: '#4ade80',
    rows: [
      { label: '电压等级', value: '500 kV' },
      { label: '下游用户', value: '2 户' },
    ],
    images: ['https://example.com/a.jpg'],
    maintenance: [{ date: '2026-03-12', type: '例行巡检', operator: '张工', note: '正常' }],
  };

  it('生成包含标题/状态/明细/图片/维护记录的结构', () => {
    const html = renderCardHtml(card);
    expect(html).toContain('cg-card');
    expect(html).toContain('关山变电站');
    expect(html).toContain('运行中');
    expect(html).toContain('500 kV');
    expect(html).toContain('https://example.com/a.jpg');
    expect(html).toContain('例行巡检');
    expect(html).toContain('2026-03-12');
  });

  it('内容做 HTML 转义（防注入）', () => {
    const html = renderCardHtml({ title: '<img src=x onerror=alert(1)>', rows: [{ label: '<b>', value: '&' }] });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
    expect(html).toContain('&amp;');
  });

  it('可选字段缺失时不输出对应区块', () => {
    const html = renderCardHtml({ title: 'T' });
    expect(html).not.toContain('cg-card__status');
    expect(html).not.toContain('cg-card__row');
    expect(html).not.toContain('cg-card__maint');
    expect(html).not.toContain('<img');
  });

  it('accentColor 渲染为左侧强调条', () => {
    const html = renderCardHtml({ title: 'T', accentColor: '#ef4444' });
    expect(html).toContain('border-left:3px solid #ef4444');
  });

  it('style:class 模式不带内联样式', () => {
    const html = renderCardHtml({ title: 'T', statusLabel: 'S' }, { style: 'class' });
    expect(html).not.toContain('style=');
    expect(html).toContain('cg-card__status');
  });
});
