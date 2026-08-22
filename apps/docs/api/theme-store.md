# Theme Store（Vue 无关主题订阅）

> 隶属 `@caoguo/theme` 包。来源：`packages/theme/src/themeStore.ts`

为 React/原生 JS 用户提供**框架无关**的主题切换 + 订阅接口。Vue 用户继续用 `useTheme()`。

---

## 快速上手

```ts
import { globalThemeStore, setTheme } from '@caoguo/theme';

setTheme('caoguo-light');                  // 全局切换
globalThemeStore.get();                    // → 'caoguo-light'
globalThemeStore.toggle();                 // 暗 ↔ 亮
globalThemeStore.list();                   // → ['caoguo-dark', 'caoguo-light', ...]
```

## `ThemeStore` 接口

```ts
interface ThemeStore {
  get(): ThemeName;                                              // 当前主题
  set(name: ThemeName | string): void;                           // 切换
  toggle(): void;                                                // 暗 ↔ 亮
  subscribe(listener: (name: ThemeName) => void): () => void;    // 订阅
  list(): string[];                                              // 已注册主题
}
```

## `createThemeStore(options?)` 独立实例

```ts
import { createThemeStore } from '@caoguo/theme';

const store = createThemeStore({
  initial: 'caoguo-light',
  onChange: (name) => console.log('主题切换:', name),
});

const off = store.subscribe((name) => {
  // 任意切换（含其他 store/injectTheme）都会触发
});
off(); // 卸载
```

## React 18+ 用法（不引入 react 依赖）

```tsx
import { useSyncExternalStore } from 'react';
import { globalThemeStore } from '@caoguo/theme';

export function useTheme() {
  return useSyncExternalStore(
    (cb) => globalThemeStore.subscribe(cb),
    () => globalThemeStore.get(),
    () => globalThemeStore.get(),
  );
}
```

## 事件总线兼容

调用 `set` / `injectTheme` 都会触发 `window` 上的 `cg:themechange` 事件，下游监听者可统一处理：

```ts
window.addEventListener('cg:themechange', (e) => {
  const name = (e as CustomEvent).detail.name;
  // map.setStyle(...) 联动地图换肤
});
```