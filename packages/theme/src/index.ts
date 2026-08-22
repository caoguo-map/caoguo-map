export { buildStyle, darkStyle, lightStyle, registerTheme, getRegisteredThemes, getThemeList, hasTheme, DEFAULT_GLYPHS, checkZoomCoverage } from './build';
export type { ThemeName, AnyTheme, BuildStyleOptions, ZoomGap, ZoomCoverageReport } from './build';
export { useTheme } from './useTheme';
export type { UseThemeOptions, UseThemeReturn } from './useTheme';
export { createThemeStore, globalThemeStore, setTheme } from './themeStore';
export type { ThemeStore, ThemeListener } from './themeStore';
/** 六张网行业主题真实配色：色板、行业主题注册与派生底图 */
export {
  INDUSTRY_META,
  INDUSTRY_PALETTES,
  buildIndustryStyle,
  registerIndustryThemes,
} from './themes/industries';
export type { IndustryKey, IndustryMeta, IndustryTheme, Palette } from './themes/industries';

/** 内置基础主题名（向后兼容常量）；运行时注册的行业主题请用 `getRegisteredThemes()` */
export const themeNames = ['caoguo-dark', 'caoguo-light'] as const;

/**
 * 在客户端为 <html> 设置 data-theme，使对应主题的 CSS 变量生效。
 * VitePress 为 SPA，需在 enhanceApp 中调用以确保首屏即应用主题。
 *
 * @param name 主题名（应是 `themeNames` 之一）
 * @param onChange 可选回调，注入主题后触发。可用于联动 MapLibre `setStyle`，
 *                 实现「UI 换肤 + 地图换肤」同步。
 */
export function injectTheme(name: string, onChange?: (name: string) => void): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', name);
    if (onChange) onChange(name);
    // 派发事件，方便未持有 onChange 引用的模块（如监听主题切换的地图实例）同步
    window.dispatchEvent(new CustomEvent('cg:themechange', { detail: { name } }));
  } else if (onChange) {
    onChange(name);
  }
}
