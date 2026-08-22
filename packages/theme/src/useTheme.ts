import { injectTheme } from './index';
import type { ThemeName } from './build';

export interface UseThemeOptions {
  /** 默认值，默认从 <html data-theme> 读取，否则 'caoguo-dark' */
  initial?: ThemeName;
  /** 切换主题后的回调（如联动地图 setStyle） */
  onChange?: (name: ThemeName) => void;
}

export interface UseThemeReturn {
  /** 当前主题名 */
  theme: { value: ThemeName };
  /** 切换到指定主题 */
  setTheme: (name: ThemeName) => void;
  /** 在明暗之间切换 */
  toggle: () => void;
}

/**
 * 轻量主题 composable（框架无关，仅依赖 DOM）。
 * 内部封装 `injectTheme` 并监听 `cg:themechange` 事件——
 * 任何地方（含地图实例）切换主题时，这里都会同步。
 *
 * 例：
 * ```ts
 * const { theme, setTheme, toggle } = useTheme();
 * setTheme('caoguo-light');
 * ```
 */
export function useTheme(opts: UseThemeOptions = {}): UseThemeReturn {
  const readInitial = (): ThemeName => {
    if (typeof document !== 'undefined') {
      const v = document.documentElement.getAttribute('data-theme');
      if (v === 'caoguo-light' || v === 'caoguo-dark') return v;
    }
    return opts.initial ?? 'caoguo-dark';
  };

  const state = { value: readInitial() };

  const apply = (name: ThemeName) => {
    injectTheme(name, (n) => {
      state.value = n as ThemeName;
      opts.onChange?.(n as ThemeName);
    });
  };

  const setTheme = (name: ThemeName) => apply(name);

  const toggle = () =>
    setTheme(state.value === 'caoguo-dark' ? 'caoguo-light' : 'caoguo-dark');

  // 跟随外部（地图实例等）发起的主题切换事件
  if (typeof window !== 'undefined') {
    window.addEventListener('cg:themechange', ((e: CustomEvent) => {
      const n = e.detail?.name;
      if (n === 'caoguo-light' || n === 'caoguo-dark') state.value = n;
    }) as EventListener);
  }

  return { theme: state, setTheme, toggle };
}
