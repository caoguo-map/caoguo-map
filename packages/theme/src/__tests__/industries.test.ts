import { describe, expect, it, beforeAll } from 'vitest';
import {
  INDUSTRY_META,
  INDUSTRY_PALETTES,
  buildIndustryStyle,
  registerIndustryThemes,
  getThemeList,
  hasTheme,
  buildStyle,
} from '../index';
import type { IndustryKey } from '../themes/industries';

const KEYS: IndustryKey[] = ['pipeline', 'grid', 'water', 'transport', 'compute', 'telecom'];

describe('六张网行业主题真实配色', () => {
  beforeAll(() => {
    registerIndustryThemes();
  });

  it('六张网元信息完整且主色互不撞色', () => {
    const primaries = KEYS.map((k) => INDUSTRY_META[k].primary);
    expect(primaries.length).toBe(6);
    expect(new Set(primaries).size).toBe(6); // 无重复
    for (const k of KEYS) {
      expect(INDUSTRY_META[k].themeId).toBe(`caoguo-ind-${k}`);
    }
  });

  it('每张网色板含语义色、分级色、状态色且为合法 hex', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const k of KEYS) {
      const t = INDUSTRY_PALETTES[k];
      expect(Object.keys(t.palette).length).toBeGreaterThan(0);
      expect(t.ramp.length).toBeGreaterThan(1);
      expect(Object.keys(t.status).length).toBeGreaterThan(0);
      [...Object.values(t.palette), ...t.ramp, ...Object.values(t.status)].forEach((c) =>
        expect(c).toMatch(hex),
      );
    }
  });

  it('registerIndustryThemes 注入六张网行业主题到注册表', () => {
    for (const k of KEYS) {
      expect(hasTheme(INDUSTRY_META[k].themeId)).toBe(true);
    }
    const list = getThemeList();
    KEYS.forEach((k) => expect(list).toContain(INDUSTRY_META[k].themeId));
  });

  it('buildStyle({ theme: 行业主题 }) 返回合法 v8 style 且带行业 metadata', () => {
    for (const k of KEYS) {
      const style = buildStyle({ theme: INDUSTRY_META[k].themeId }) as {
        version: number;
        layers: unknown[];
        metadata?: Record<string, unknown>;
      };
      expect(style.version).toBe(8);
      expect(Array.isArray(style.layers)).toBe(true);
      expect(style.metadata?.['cg:industry']).toBe(k);
      expect(style.metadata?.['cg:industry-primary']).toBe(INDUSTRY_META[k].primary);
    }
  });

  it('buildIndustryStyle 直接派生行业底图（暗/亮）', () => {
    const dark = buildIndustryStyle('grid', 'dark');
    const light = buildIndustryStyle('grid', 'light');
    expect(dark.metadata?.['cg:industry-label']).toBe('电网');
    expect(light.metadata?.['cg:industry-label']).toBe('电网');
  });
});
