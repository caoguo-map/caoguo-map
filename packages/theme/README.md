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
- `buildStyle` 始终保证输出含 `glyphs`（style 自身未声明且无 `opts.glyphs` 时回退 `DEFAULT_GLYPHS`），避免 symbol 层中文注记渲染失败。

### 内置图层清单（每套主题 15 层）

| 图层 id | 类型 | source-layer | 说明 |
|---------|------|--------------|------|
| `background` | background | — | 底色铺底（始终可见） |
| `water` | fill | water | 水系面 |
| `landuse` | fill | landuse | 土地利用 |
| `landcover` | fill | landcover | 地表覆盖 |
| `road-minor` | line | roads（`class=minor`） | 次干道，`minzoom=12` |
| `road-major` | line | roads（primary/secondary/tertiary/motorway） | 主干道，宽度随缩放插值 |
| `road-label` | symbol | roads（线注记） | 道路名，`minzoom=13` |
| `boundary` | line | boundaries | 行政边界（虚线） |
| `waterway` | line | waterway | 河流/水渠线 |
| `rail` | line | railway | 铁路（虚线） |
| `park` | fill | park | 绿地/公园 |
| `building` | fill | building | 建筑面，`minzoom=13` |
| `building-extrusion` | fill-extrusion | building | 建筑 3D 挤出（基于 height/min_height），`minzoom=15` |
| `place-label-major` | symbol | places（`scalerank≤3`） | 主要地名（粗体） |
| `place-label-minor` | symbol | places（`scalerank>3`） | 次要地名，`minzoom=8` |

> 注记分级依据矢量源的 `scalerank` 字段；若你的瓦片源无该字段，可改用 `registerTheme` 自定义主题。

### 缩放层级覆盖（PRD 验收「3-18 无断裂」）

包内测试对 `themeNames` 每套主题在 zoom 3..18 做静态校验：background/water 全程可见，z≥8 至少有主干道或注记之一，z≥13 出现建筑层。真机渲染断档仍需以实际瓦片源在浏览器验收。

## 快速开始

### 主题切换 composable（useTheme）

`useTheme()` 封装 `injectTheme` 并监听 `cg:themechange`，适合在 VitePress `enhanceApp` / 组件内使用，返回响应式 `theme` 与 `setTheme`/`toggle`。当任意处（含地图实例）切换主题时，这里会自动同步。

```ts
import { useTheme } from '@caoguo/theme';

const { theme, setTheme, toggle } = useTheme({
  initial: 'caoguo-dark',
  onChange: (name) => map?.setStyle(buildStyle({ theme: name })), // 联动地图换肤
});
setTheme('caoguo-light');
```

### 浏览器：构造主题样式

```ts
import { buildStyle, darkStyle, lightStyle, injectTheme } from '@caoguo/theme';

// 1. 选择主题
const style = darkStyle;
// 或按需构造
// const style = buildStyle({ theme: 'caoguo-light', notoFonts: true });

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
| `buildStyle(opts?)` | `(opts?: BuildStyleOptions \| ThemeName, legacyOpts?: BuildStyleOptions) => StyleSpecification` | 自定义构造（支持对象式 / 旧式位置参数） |
| `themeNames` | `readonly ['caoguo-dark', 'caoguo-light']` | 内置基础主题名常量（向后兼容；动态列表见 `getThemeList`） |
| `getThemeList()` | `() => string[]` | 返回所有可用主题名（内置 + 运行时注册行业主题，去重） |
| `registerTheme(name, style)` | `(name: string, style: StyleSpecification) => void` | 注册行业主题（六张网） |
| `getRegisteredThemes()` | `() => string[]` | 返回所有已注册主题名（含运行时注册的） |
| `hasTheme(name)` | `(name: string) => boolean` | 判断是否为已知主题 |
| `injectTheme(name, onChange?)` | `(name: string, onChange?: (name: string) => void) => void` | 给 `<html>` 设置 `data-theme`；切换时触发 `onChange` 并派发 `cg:themechange` 事件，便于联动地图 `setStyle` |
| `useTheme(opts?)` | `(opts?: UseThemeOptions) => UseThemeReturn` | 轻量主题 composable：响应式 `theme` + `setTheme`/`toggle`，监听 `cg:themechange` 同步 |

类型：`ThemeName`（内置）、`AnyTheme = string`（含行业主题）、`BuildStyleOptions`、`UseThemeOptions`、`UseThemeReturn`、`DEFAULT_GLYPHS`。

## 行业主题（六张网）

`caoguo-pipeline`（管网，Phase 1）、`caoguo-grid`（电网，Phase 2）、`caoguo-water`（水网，Phase 2）、`caoguo-transport`（交通，Phase 3）、`caoguo-compute`（算力，Phase 3）、`caoguo-telecom`（通信，Phase 3）为规划中的行业主题，**当前未实现**。落地时通过 `registerTheme` 注入即可被 `buildStyle` 按名构造，无需改动内核：

```ts
import { registerTheme, buildStyle, getRegisteredThemes } from '@caoguo/theme';
registerTheme('caoguo-pipeline', pipelineStyleSpec);
const style = buildStyle({ theme: 'caoguo-pipeline' });
console.log(getRegisteredThemes()); // [...'caoguo-pipeline']
```

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