# 指南 · 样式与主题（Style）

样式（style）是一份 JSON 规范，描述地图的全部视觉呈现：底图数据源、图层栈、字体与雪碧图。草果地图提供**两套内置矢量主题 + 行业主题注册表**，并配套主题联动工具。

## 样式 JSON 的构成

MapLibre style 的四大件，草果地图均已预置：

| 字段 | 作用 | 草果预置 |
| --- | --- | --- |
| `sources` | 数据源 | `caoguo-basemap` 矢量瓦片源 |
| `layers` | 图层栈（含底图全套要素层） | 水系/道路/铁路/绿地/建筑/边界/注记分级 |
| `glyphs` | 字体 PBF 模板 | `DEFAULT_GLYPHS` 兜底，symbol 层开箱可渲染 |
| `sprite` | 图标雪碧图 | 行业主题可自定义 |

## 内置主题

```ts
import { buildStyle } from '@caoguo/theme'

buildStyle({ theme: 'caoguo-dark' })   // 暗色（默认）
buildStyle({ theme: 'caoguo-light' })  // 亮色
```

`buildStyle` 的三个实用参数：

```ts
buildStyle({
  theme: 'caoguo-dark',
  sourceUrl: 'https://my-cdn/tiles.json',   // 覆盖底图瓦片范围（私有化部署常用）
  glyphs: 'https://my-cdn/font/{fontstack}/{range}.pbf',
  notoFonts: true,                          // 符号层字体换 Noto Sans SC（中文注记）
})
```

> `buildStyle` 每次返回深拷贝，不会污染原始主题 JSON；旧式位置参数 `buildStyle('caoguo-dark', opts)` 兼容保留。

## 行业主题注册表

行业主题（如 `caoguo-ind-*` 系列）不在包里预置，而是**运行时注册**后即可按名构造：

```ts
import { registerTheme, buildStyle, getThemeList, hasTheme } from '@caoguo/theme'

registerTheme('caoguo-ind-power', myPowerStyleJson)
buildStyle({ theme: 'caoguo-ind-power' })   // 直接可用
hasTheme('caoguo-ind-power')                // => true
getThemeList()                              // 内置 + 已注册全部主题名
```

这个设计让六张网行业包按需注入自己的主题色板，引擎包保持零行业知识。

## 主题联动

```ts
import { injectTheme, useTheme } from '@caoguo/theme'

// 手动联动：写 <html data-theme> + 派发 'cg:themechange' 事件（SSR 环境安全跳过）
injectTheme('caoguo-light', (name) => console.log('切到', name))

// Vue 场景：响应式 theme + toggle
const { theme, setTheme, toggle } = useTheme({ initial: 'caoguo-dark' })
```

地图控件里也有现成的主题切换器：

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })
map.addThemeSwitcher()   // 内置明暗切换控件
```

## 深色优先约定

草果文档站与演示站均以深色为主视觉（VitePress `appearance: 'force-dark'`）。若你的应用支持明暗切换，注意**地图样式切换 ≠ CSS 主题切换**：前者是 `setStyle` 整体替换（会重建图层栈），后者只是 CSS 变量。混用时务必在 `map.on('style.load')` 后重挂业务图层。

## 运行时改样式

```ts
map.getMap().setPaintProperty('water', 'background-color', '#0a2540')  // 单属性热更新
map.useTianditu('img_w', { tk: '…' })                                   // 整体切底图样式
```

::::: warning 别踩坑
- `setStyle` 会**清空所有非底图图层**——业务图层要在 `style.load` 事件后重新添加；只改颜色请用 `setPaintProperty`。
- symbol 层不显示文字，九成是 `glyphs` 缺失或字体源跨域——`buildStyle` 已兜底默认 glyphs，自定义样式记得带。
:::::
