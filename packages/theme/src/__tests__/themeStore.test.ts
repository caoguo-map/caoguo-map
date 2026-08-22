// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createThemeStore, globalThemeStore, setTheme } from '../themeStore';
import { registerTheme } from '../build';

describe('ThemeStore (vanilla)', () => {
  beforeEach(() => {
    // 清理 DOM data-theme 状态
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  describe('createThemeStore', () => {
    it('默认 initial 为 caoguo-dark', () => {
      const store = createThemeStore();
      expect(store.get()).toBe('caoguo-dark');
    });

    it('初始主题可配置', () => {
      const store = createThemeStore({ initial: 'caoguo-light' });
      expect(store.get()).toBe('caoguo-light');
    });

    it('DOM data-theme 优先于 initial', () => {
      document.documentElement.setAttribute('data-theme', 'caoguo-light');
      const store = createThemeStore({ initial: 'caoguo-dark' });
      expect(store.get()).toBe('caoguo-light');
    });

    it('set 切换主题并更新 get', () => {
      const store = createThemeStore();
      store.set('caoguo-light');
      expect(store.get()).toBe('caoguo-light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('caoguo-light');
      store.set('caoguo-dark');
      expect(store.get()).toBe('caoguo-dark');
    });

    it('toggle 在 dark/light 之间切换', () => {
      const store = createThemeStore();
      expect(store.get()).toBe('caoguo-dark');
      store.toggle();
      expect(store.get()).toBe('caoguo-light');
      store.toggle();
      expect(store.get()).toBe('caoguo-dark');
    });

    it('set 触发订阅者回调', () => {
      const store = createThemeStore();
      const cb = vi.fn();
      store.subscribe(cb);
      store.set('caoguo-light');
      expect(cb).toHaveBeenCalledWith('caoguo-light');
    });

    it('subscribe 返回的卸载函数生效', () => {
      const store = createThemeStore();
      const cb = vi.fn();
      const unsub = store.subscribe(cb);
      store.set('caoguo-light');
      expect(cb).toHaveBeenCalledTimes(1);
      unsub();
      store.set('caoguo-dark');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('单个订阅者抛错不影响其他订阅者', () => {
      const store = createThemeStore();
      const cbErr = vi.fn(() => {
        throw new Error('boom');
      });
      const cbOk = vi.fn();
      store.subscribe(cbErr);
      store.subscribe(cbOk);
      // spy on console.error so test not noisy
      const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
      store.set('caoguo-light');
      expect(cbErr).toHaveBeenCalled();
      expect(cbOk).toHaveBeenCalledWith('caoguo-light');
      consoleErr.mockRestore();
    });

    it('onChange 回调在主题切换时触发', () => {
      const onChange = vi.fn();
      const store = createThemeStore({ onChange });
      store.set('caoguo-light');
      expect(onChange).toHaveBeenCalledWith('caoguo-light');
    });

    it('list 返回所有已注册主题（含内置）', () => {
      const store = createThemeStore();
      const themes = store.list();
      expect(themes).toContain('caoguo-dark');
      expect(themes).toContain('caoguo-light');
    });

    it('list 包含运行时 registerTheme 注册的主题', () => {
      const store = createThemeStore();
      registerTheme('test-petrol', {
        version: 8,
        name: 'test-petrol',
        sources: {},
        layers: [],
      } as never);
      expect(store.list()).toContain('test-petrol');
    });
  });

  describe('globalThemeStore (singleton)', () => {
    it('同一实例多次访问', () => {
      expect(globalThemeStore).toBeDefined();
      expect(typeof globalThemeStore.get).toBe('function');
      expect(typeof globalThemeStore.set).toBe('function');
    });

    it('singleton 状态在多次 set 后保持', () => {
      globalThemeStore.set('caoguo-light');
      expect(globalThemeStore.get()).toBe('caoguo-light');
      globalThemeStore.set('caoguo-dark');
      expect(globalThemeStore.get()).toBe('caoguo-dark');
    });
  });

  describe('setTheme 全局快捷方法', () => {
    it('等价 globalThemeStore.set', () => {
      const cb = vi.fn();
      globalThemeStore.subscribe(cb);
      setTheme('caoguo-light');
      expect(globalThemeStore.get()).toBe('caoguo-light');
      expect(cb).toHaveBeenCalledWith('caoguo-light');
    });
  });
});