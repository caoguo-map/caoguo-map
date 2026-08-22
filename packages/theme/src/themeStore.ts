/**
 * 框架无关主题 store（vanilla，可被任意框架消费）
 *
 * 为 React/原生 JS 提供稳定的"主题 store + 订阅"接口，避免 Vue-only 假设。
 *
 * - 内置响应订阅：subscribe(cb) 返回卸载函数
 * - 默认 singleton（`globalThemeStore`），也可通过 `createThemeStore` 自建隔离实例
 * - 切换主题会：① 写入 <html data-theme> ② 派发 `cg:themechange` 事件 ③ 通知订阅者
 * - 通过 `getRegisteredThemes()` 暴露行业主题列表
 *
 * React 18+ 用法（无需引入 react 到本包）：
 *   ```ts
 *   import { useSyncExternalStore } from 'react';
 *   import { globalThemeStore } from '@caoguo/theme';
 *   function useTheme() {
 *     return useSyncExternalStore(
 *       (cb) => globalThemeStore.subscribe(cb),
 *       () => globalThemeStore.get(),
 *       () => globalThemeStore.get()
 *     );
 *   }
 *   ```
 */
import { injectTheme } from './index';
import type { ThemeName } from './build';
import { getRegisteredThemes } from './build';

export type ThemeListener = (name: ThemeName) => void;

export interface ThemeStore {
  /** 获取当前主题 */
  get(): ThemeName;
  /** 设置主题（写入 DOM + 派发事件 + 通知订阅者） */
  set(name: ThemeName | string): void;
  /** 明暗主题之间切换（仅在内置 dark/light 之间） */
  toggle(): void;
  /** 订阅主题变化，返回卸载函数 */
  subscribe(listener: ThemeListener): () => void;
  /** 当前所有可用主题名（含运行时注册的） */
  list(): string[];
}

/** 检测 SSR 环境 */
const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

/** 从 <html data-theme> 读取当前主题（SSR 下回退 initial） */
function readCurrent(initial: ThemeName): ThemeName {
  if (hasDOM) {
    const v = document.documentElement.getAttribute('data-theme');
    if (v === 'caoguo-light' || v === 'caoguo-dark') return v;
  }
  return initial;
}

/**
 * 创建主题 store（独立实例，SSR/测试/多 Map 实例隔离场景可用）。
 * 默认创建全局 singleton 用 `globalThemeStore`。
 */
export function createThemeStore(options: {
  /** 初始主题，默认 'caoguo-dark' */
  initial?: ThemeName;
  /** 切换主题后的回调 */
  onChange?: (name: ThemeName) => void;
} = {}): ThemeStore {
  const initial = options.initial ?? 'caoguo-dark';
  const listeners = new Set<ThemeListener>();
  // SSR 下用变量记录；客户端从 DOM 读
  let current: ThemeName = hasDOM ? readCurrent(initial) : initial;

  const set = (name: ThemeName | string): void => {
    const target = (name === 'caoguo-light' || name === 'caoguo-dark') ? name : current;
    injectTheme(target, (n) => {
      current = n as ThemeName;
      options.onChange?.(n as ThemeName);
      for (const cb of listeners) {
        try {
          cb(n as ThemeName);
        } catch (err) {
          // 单个订阅者抛错不应阻断其他人
          // eslint-disable-next-line no-console
          console.error('[themeStore] listener error:', err);
        }
      }
    });
  };

  const toggle = (): void => {
    set(current === 'caoguo-dark' ? 'caoguo-light' : 'caoguo-dark');
  };

  const subscribe = (listener: ThemeListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const list = (): string[] => getRegisteredThemes();

  return { get: () => current, set, toggle, subscribe, list };
}

/**
 * 全局主题 store singleton（推荐默认使用）。
 *
 * 所有 subscribe 共享同一份订阅列表，并通过 `injectTheme` 与事件总线联通——
 * 即便用户使用 `injectTheme` 直接切换，所有订阅者也会同步收到通知。
 */
export const globalThemeStore: ThemeStore = createThemeStore();

/**
 * 切换主题的全局快捷方法（薄壳，等价 globalThemeStore.set）。
 */
export function setTheme(name: ThemeName | string): void {
  globalThemeStore.set(name);
}