import { describe, it, expect } from 'vitest';
import type { StyleSpecification } from '@caoguo/maplibre';
import { buildCarrierThemeStyle, CARRIER_THEMES } from '../telecomTheme';

const baseStyle = {
  version: 8,
  name: 'base',
  sources: {},
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#000000' } },
    { id: 'water', type: 'fill', source: '', paint: { 'fill-color': '#123456' } },
    { id: 'road', type: 'line', source: '', paint: { 'line-color': '#888888' } },
  ],
} as unknown as StyleSpecification;

describe('buildCarrierThemeStyle (PRD §5.3 品牌大屏切换)', () => {
  it('夜间模式注入运营商 secondary 为背景色', () => {
    const styled = buildCarrierThemeStyle(baseStyle, '中国移动', 'night');
    const bg = styled.layers?.find((l) => l.id === 'bg') as unknown as {
      paint: { 'background-color': string };
    };
    expect(bg.paint['background-color']).toBe(CARRIER_THEMES['中国移动'].secondary);
  });

  it('白天模式注入运营商 primary 为背景色', () => {
    const styled = buildCarrierThemeStyle(baseStyle, '中国联通', 'day');
    const bg = styled.layers?.find((l) => l.id === 'bg') as unknown as {
      paint: { 'background-color': string };
    };
    expect(bg.paint['background-color']).toBe(CARRIER_THEMES['中国联通'].primary);
  });

  it('水体层 fill-color 跟随主题调整', () => {
    const styled = buildCarrierThemeStyle(baseStyle, '中国电信', 'night');
    const water = styled.layers?.find((l) => l.id === 'water') as unknown as {
      paint: { 'fill-color': string };
    };
    expect(water.paint['fill-color']).not.toBe('#123456');
  });

  it('不修改原 style（不可变克隆）', () => {
    const before = (baseStyle.layers?.[0] as unknown as { paint: { 'background-color': string } })
      .paint['background-color'];
    buildCarrierThemeStyle(baseStyle, '中国移动', 'night');
    const after = (baseStyle.layers?.[0] as unknown as { paint: { 'background-color': string } })
      .paint['background-color'];
    expect(after).toBe(before);
  });
});
