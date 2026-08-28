# 大屏渲染运行时

> 隶属 `@caoguo/map-editor` 包。来源：`packages/editor/src/runtime/`
> PRD：`prd/visual-editor.md §7`

把编辑器导出的大屏 JSON 渲染成可运行的大屏，支持**全屏播放**与**容器嵌入**两种模式。

---

## 安装与引入

```bash
npm i @caoguo/map-editor
```

```ts
import { renderScreen, renderFromJSON, parseScreenJSON } from '@caoguo/map-editor';
import '@caoguo/map-editor/style.css'; // 必须引入样式
```

## 全屏播放（等比自适应 + 场景轮播）

```ts
const handle = renderFromJSON('#app', jsonString);
handle.unmount(); // 卸载（移除 DOM 并停止轮播定时器）
```

## 容器嵌入（随父容器尺寸自适应）

```ts
// 父容器需给定宽高
renderScreen('#panel', config, { embedded: true });
```

## API

### `renderFromJSON(container, json)`

```ts
function renderFromJSON(container: HTMLElement | string, json: string): ScreenHandle
```

解析 JSON 后渲染；**JSON 无效时抛错**（`message` 含具体原因）。

### `renderScreen(container, config, options?)`

```ts
function renderScreen(
  container: HTMLElement | string,
  config: DashboardConfig,
  options?: { embedded?: boolean }
): ScreenHandle
```

`options.embedded` 默认 `false`（全屏播放器 `position: fixed`）；容器不存在时抛 `渲染容器不存在：<container>`。

### `parseScreenJSON(json)`

```ts
function parseScreenJSON(json: string): { config: DashboardConfig | null; reason?: string }
```

只校验不渲染。校验规则：JSON 语法合法 → 是对象 → 含 `scenes` 数组且非空 → 含 `canvas.width`（数字）。任一失败返回 `{ config: null, reason }`。

### `ScreenHandle`

| 字段 | 说明 |
|---|---|
| `app` | Vue 应用实例 |
| `unmount()` | 卸载大屏 |

## 配置安全

编辑器导出的 JSON **默认剔除 `proxyBase` 与数据源密码**；本地草稿保留密钥以便续编。因此从编辑器下载的 JSON 可安全分发，运行时只会拿到非敏感配置（数据库类数据经后端代理取数）。

## 相关

- 编辑器主组件：`Editor`（可视化搭建）
- 配置格式定义：`prd/visual-editor.md §5`
