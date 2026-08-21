import { describe, it, expect } from 'vitest';
import {
  INDUSTRY_TEMPLATES,
  CARRIER_STYLES,
  extractDominantColor,
  adjustBrightness,
  generateBrandStyle,
  generateIndustryStyle,
  generateCarrierStyle,
  toggleMode,
} from '../styleGenerator';

describe('ai/stylegen', () => {
  it('行业模板包含六张网', () => {
    expect(Object.keys(INDUSTRY_TEMPLATES).length).toBe(6);
    expect(INDUSTRY_TEMPLATES.pipeline.primary).toBe('#f59e0b');
  });

  it('运营商主题包含三大运营商', () => {
    expect(CARRIER_STYLES['中国移动'].primary).toBe('#4ade80');
    expect(CARRIER_STYLES['中国联通'].primary).toBe('#ef4444');
    expect(CARRIER_STYLES['中国电信'].primary).toBe('#3b82f6');
  });

  it('extractDominantColor 提取主色', () => {
    // 全红图片（量化到 8 级桶，中心偏移 +4，故 255 → 252 = 0xfc）
    const pixels = new Uint8ClampedArray(16 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
    const color = extractDominantColor(pixels);
    expect(color).toBe('#fc0404');
  });

  it('adjustBrightness 变暗/变亮', () => {
    const darker = adjustBrightness('#ffffff', 0.5);
    // 255 * 0.5 = 127.5 → Math.round = 128（0x80）
    expect(darker).toBe('#808080');
    const brighter = adjustBrightness('#000000', 1.0);
    expect(brighter).toBe('#000000');
    // 变亮：黑 * 2 仍是黑（因 clamp 到 0）
    const brighter2 = adjustBrightness('#404040', 2.0);
    expect(brighter2).toBe('#808080');
  });

  it('generateBrandStyle 生成品牌样式', () => {
    const s = generateBrandStyle({ brandColor: '#3b82f6', mode: 'dark' });
    expect(s.lineColor).toBe('#3b82f6');
    expect(s.mode).toBe('dark');
  });

  it('generateIndustryStyle 生成行业样式', () => {
    const s = generateIndustryStyle('transport');
    expect(s.scheme.name).toBe('交通');
  });

  it('generateCarrierStyle 生成运营商样式', () => {
    const s = generateCarrierStyle('中国电信');
    expect(s.scheme.primary).toBe('#3b82f6');
  });

  it('toggleMode 昼夜切换', () => {
    const s = generateIndustryStyle('pipeline', 'dark');
    const light = toggleMode(s);
    expect(light.mode).toBe('light');
    const dark = toggleMode(light);
    expect(dark.mode).toBe('dark');
  });
});
