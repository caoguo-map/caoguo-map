# @caoguo/theme

> 草果地图主题样式包 — 矢量主题构造 + 暗/亮双套配色 + CSS 变量体系

[![npm version](https://img.shields.io/npm/v/@caoguo/theme.svg)](https://www.npmjs.com/package/@caoguo/theme)
[![license](https://img.shields.io/npm/l/@caoguo/theme.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/theme
# 或
pnpm add @caoguo/theme
```

`maplibre-gl@^4.7.1` 是 peerDependency，请确保已安装。

## 功能

- 提供两套矢量主题：`caoguo-dark`（指挥中心/大屏）和 `caoguo-light`（日常浏览）。
- 通过 `buildStyle()` 构造完整 MapLibre Style Spec（含地形、水系、道路、行政边界、注记）。
- 支持中文字体覆盖（Noto Sans SC / 思源黑体）。
- 提供 CSS 变量主题系统（`data-theme="..."`），与 VitePress 等 SPA 框架天然兼容。
- 主题构造为**纯函数**，可在 Node 环境测试、可在浏览器端直接使用。

## 快速开始

### 浏览器：构造主题样式

```ts
import { buildStyle, darkStyle, lightStyle, injectTheme } from '@caoguo/theme';

// 1. 选择主题
const style = darkStyle;
// 或按需构造
// const style = buildStyle({ themeName: 'caoguo-light', notoFonts: true });

// 2. 配合 @caoguo/maplibre 使用
import { Map } from '@caoguo/maplibre';
const map = new Map({ container: 'map', style });

// 3. SPA 场景：注入 data-theme 让 CSS 变量生效
injectTheme('caoguo-dark');
```

### 仅注入 CSS 变量主题

```ts
import { injectTheme, themeNames } from '@caoguo/theme';
console.log(themeNames); // ['caoguo-dark', 'caoguo-light']
injectTheme('caoguo-dark');
```

## API 概览

| 导出 | 类型 | 说明 |
|------|------|------|
| `darkStyle` | `StyleSpecification` | 预构造的暗色主题 |
| `lightStyle` | `StyleSpecification` | 预构造的亮色主题 |
| `buildStyle(opts?)` | `(opts?: BuildStyleOptions) => StyleSpecification` | 自定义构造 |
| `themeNames` | `readonly ['caoguo-dark', 'caoguo-light']` | 主题名常量 |
| `injectTheme(name)` | `(name: string) => void` | 给 `<html>` 设置 `data-theme` |

类型：`ThemeName`、`BuildStyleOptions`。

## CSS 变量

`tokens.css` 内置 CSS 变量，组件层可直接消费：

```css
:root[data-theme="caoguo-dark"] {
  --cg-bg: #0a0e1a;
  --cg-fg: #e8edf3;
  --cg-accent: #4a9eff;
  /* ... */
}
```

直接 import 即可：

```ts
import '@caoguo/theme/dist/tokens.css';
```

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+ / Firefox 88+ / Edge 90+）
- SSR 友好：`injectTheme` 内置 `typeof document` 守卫
- 纯函数模块可在 Node.js 环境单独测试（已含 vitest 用例）

## 许可

Apache-2.0