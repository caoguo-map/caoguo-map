/**
 * 主题切换控件（T8 / F-1.9）。
 *
 * 在暗色（caoguo-dark）与亮色（caoguo-light）官方矢量主题间切换，
 * 调用 `map.setStyle` 并保留当前视图（center/zoom）与现有 GeoJSON 源/图层。
 *
 * 设计为「纯函数 core + 薄 DOM 绑定」：
 * - `toggleTheme` / `themeFromStyle` 为纯逻辑，可独立单测；
 * - `ThemeSwitcher` 类负责渲染按钮并绑定点击事件。
 */

import { caoguoStyle } from '../styles';
import type { ThemeName } from '@caoguo/theme';

export interface ThemeSwitcherOptions {
  /** 挂载容器（可选） */
  container?: HTMLElement;
  /** 初始主题 */
  initial?: ThemeName;
}

export function oppositeTheme(theme: ThemeName): ThemeName {
  return theme === 'caoguo-dark' ? 'caoguo-light' : 'caoguo-dark';
}

/**
 * 从当前 style 对象推断主题名（依据其 JSON 标识）。
 * 非草果主题时回退到传入的 fallback。
 */
export function themeFromStyle(
  style: { name?: string } | string | null | undefined,
  fallback: ThemeName = 'caoguo-dark'
): ThemeName {
  if (!style) return fallback;
  const name = typeof style === 'string' ? style : style.name;
  if (name === 'caoguo-dark' || name === 'caoguo-light') return name;
  return fallback;
}

export class ThemeSwitcher {
  private el: HTMLElement;
  private btn: HTMLButtonElement;
  private current: ThemeName;
  private map: {
    getStyle: () => { name?: string } | undefined;
    setStyle: (s: unknown, opts?: { diff?: boolean }) => void;
  };

  constructor(map: ThemeSwitcher['map'], options: ThemeSwitcherOptions = {}) {
    this.map = map;
    this.current = options.initial ?? themeFromStyle(map.getStyle?.(), 'caoguo-dark');

    this.el = options.container ?? document.createElement('div');
    this.el.className = 'caoguo-theme-switcher';
    this.el.style.cssText =
      'position:absolute;right:10px;top:10px;z-index:3;';

    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.applyLabel();
    this.btn.style.cssText =
      'cursor:pointer;padding:4px 10px;border:1px solid #2a3550;border-radius:6px;' +
      'background:rgba(10,15,30,.7);color:#cfe;font:12px system-ui,sans-serif;';
    this.btn.addEventListener('click', () => this.toggle());
    this.el.append(this.btn);
  }

  private applyLabel(): void {
    this.btn.textContent = this.current === 'caoguo-dark' ? '🌙 暗色' : '☀ 亮色';
  }

  /** 当前主题 */
  getTheme(): ThemeName {
    return this.current;
  }

  /** 切换到指定主题（保留视图，diff 模式避免闪烁） */
  setTheme(theme: ThemeName): void {
    if (theme === this.current) return;
    this.current = theme;
    this.applyLabel();
    this.map.setStyle(caoguoStyle(theme), { diff: true });
  }

  /** 在明暗之间切换 */
  toggle(): void {
    this.setTheme(oppositeTheme(this.current));
  }

  /** 挂到容器 */
  addTo(container: HTMLElement): this {
    if (!this.el.parentElement) container.appendChild(this.el);
    return this;
  }

  /** 移除 */
  remove(): void {
    this.btn.removeEventListener('click', () => this.toggle());
    this.el.remove();
  }
}
