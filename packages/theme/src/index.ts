export { buildStyle, darkStyle, lightStyle } from './build';
export type { ThemeName, BuildStyleOptions } from './build';
export const themeNames = ['caoguo-dark', 'caoguo-light'] as const;

/**
 * 在客户端为 <html> 设置 data-theme，使对应主题的 CSS 变量生效。
 * VitePress 为 SPA，需在 enhanceApp 中调用以确保首屏即应用主题。
 */
export function injectTheme(name: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', name);
  }
}
