# 指南 · 主题、控件与可视化增强

草果地图在引擎层提供可直接挂载的 UI 控件与视觉效果，开箱即用。

## 主题切换（T9 + T8）

内置两套官方矢量主题，渲染基准为 WGS84：

- `caoguo-dark`（默认暗色，适合指挥中心大屏）
- `caoguo-light`（亮色，适合日常编辑）

```ts
import { Map, caoguoStyle } from '@caoguo/maplibre'

const map = new Map({ container: '#app', style: caoguoStyle('caoguo-dark') })

// 方式一：控件（右上角按钮，diff 模式避免闪烁）
map.on('load', () => map.addThemeSwitcher())

// 方式二：编程式切换
map.addThemeSwitcher().toggle()
map.addThemeSwitcher().setTheme('caoguo-light')
```

`@caoguo/maplibre` 的 `caoguoStyle(theme)` 是 theme 包的便捷封装；若需直接构造，可用 `@caoguo/theme` 的 `buildStyle`：

```ts
import { buildStyle } from '@caoguo/theme'

// 对象式调用（推荐）：自定义 sourceUrl / glyphs / notoFonts
const style = buildStyle({ theme: 'caoguo-light', notoFonts: true })
```

`buildStyle` 基于 `structuredClone` 保证样式不可变，始终注入 `glyphs` 兜底字体，便于中文注记渲染。

## 比例尺与坐标（T8）

```ts
map.on('load', () => {
  const scale = map.addScaleControl({ showCoordinate: true })
  // scale.remove() 卸载
})
```

- 比例尺基于 Web Mercator 在中心纬度下的地面分辨率，自动吸附 1/2/5 档（m / km）；
- 鼠标移动时实时显示 WGS84 经纬度。

## 管线辉光（T6，CustomLayer）

用多遍描边形成管线 / 路网 / 水系的辉光效果。

```ts
map.on('load', () => {
  map.addGlowLayer({
    id: 'cg-glow',
    lines: [
      { group: 'pipe', coordinates: [[114.30, 30.59], [114.33, 30.61]] },
      { group: 'road', coordinates: [[114.27, 30.66], [114.34, 30.52]] },
    ],
    baseWidth: 3,
    passes: 4, // 多遍遍数，越多辉光越柔
  })
})
```

分组颜色默认 `pipe`（青蓝）/ `road`（灰蓝）/ `water`（深蓝），可用 `colors` 覆盖。

## LOD 控制器（T7）

随缩放自动切换数据密度等级，避免低 zoom 要素过密。

```ts
const ctrl = map.addLodController(
  [
    { id: 'province', minZoom: 0, maxZoom: 9 },
    { id: 'city', minZoom: 10, maxZoom: 13 },
    { id: 'detail', minZoom: 14 },
  ],
  (e) => {
    if (e.changed) loadDataForLevel(e.level.id) // 切换数据源/setData
  }
)
// ctrl.getLevel() / ctrl.setLevels(...) / ctrl.remove()
```

纯函数 `resolveLod(zoom, levels)` 可在 Node 中单测，无需地图实例。

## 主题原生 API（@caoguo/theme）

除引擎控件外，`@caoguo/theme` 还提供框架无关的原生能力，便于在 VitePress `enhanceApp` 或自定义 UI 中使用。

### 响应式切换（useTheme）

```ts
import { useTheme, buildStyle } from '@caoguo/theme'

const { theme, setTheme, toggle } = useTheme({
  initial: 'caoguo-dark',
  onChange: (name) => map?.setStyle(buildStyle({ theme: name })), // 联动地图换肤（diff 模式防闪烁）
})
```

`useTheme` 返回响应式 `theme.value`，并监听 `cg:themechange` 事件——任何地方（含地图实例）切换主题时 UI 自动同步。

### 行业主题（六张网真实配色）

六张网（管网 / 电网 / 水网 / 交通 / 算力 / 通信）的真实语义配色已沉淀进 `@caoguo/theme`，作为权威色板供大屏换肤、图例与 demo 统一复用。

```ts
import {
  INDUSTRY_PALETTES,
  INDUSTRY_META,
  registerIndustryThemes,
  buildStyle,
  buildIndustryStyle,
} from '@caoguo/theme'

// 应用启动时注册一次（幂等）
registerIndustryThemes()

// 直接构造某张网的行业底图（基于 caoguo-dark 派生，注入行业主色）
const gridStyle = buildStyle({ theme: 'caoguo-ind-grid' })
const waterStyle = buildIndustryStyle('water', 'dark')

// 复用权威色板，替代各包各自硬编码颜色
console.log(INDUSTRY_PALETTES.grid.palette) // { uhv:'#ef4444', high:'#f59e0b', ... }
```

| 行业 | themeId | 主色 | 核心语义色（要素 / 类型） |
|------|---------|------|---------------------------|
| 管网 pipeline | `caoguo-ind-pipeline` | `#0891b2` | 输气 `#f97316` / 输油 `#fbbf24` / 供水 `#3b82f6` / 排水 `#0ea5e9` / 综合管廊 `#8b5cf6` |
| 电网 grid | `caoguo-ind-grid` | `#f59e0b` | 特高压 `#ef4444` / 高压 `#f59e0b` / 中压 `#3b82f6` / 低压 `#22c55e` / 配电 `#a855f7` |
| 水网 water | `caoguo-ind-water` | `#3b82f6` | 流域 `#0ea5e9` / 干流 `#3b82f6` / 支流 `#60a5fa` / 水库 `#0ea5e9` / 闸站 `#f59e0b` / 堤防 `#fbbf24` |
| 交通 transport | `caoguo-ind-transport` | `#f97316` | 高速 `#f59e0b` / 国道 `#ef4444` / 省道 `#8b5cf6` / 城市道路 `#6b7280` / 轨道 `#22d3ee` |
| 算力 compute | `caoguo-ind-compute` | `#8b5cf6` | 主节点 `#3b82f6` / 区域云 `#8b5cf6` / 骨干网 `#22d3ee` / 边缘 `#14b8a6` / 集群 `#f59e0b` |
| 通信 telecom | `caoguo-ind-telecom` | `#10b981` | 光纤 `#22d3ee` / 5G `#10b981` / 微波 `#f59e0b` / 卫星 `#8b5cf6` / 基站 `#14b8a6` |

每网还含 `ramp`（数值分级色，用于流量/负载/信号热力）与 `status`（安全/预警/危险等状态色）。行业底图变体在 `metadata` 注入 `cg:industry` / `cg:industry-label` / `cg:industry-primary`，业务图层与大屏辉光可据此统一取色。

### 缩放断裂检测（CI / 运行时校验）

`checkZoomCoverage(style, { minZoom, maxZoom })` 在不依赖真实瓦片的情况下，静态校验核心要素（water / road-major / place / building）在指定缩放区间内是否始终可见，返回 `{ ok, gaps }` 报告，可用于接入自有瓦片源后的自动化验收。

:::: tip 一站式体验
演示站的「Phase-0 能力演示」页在一页内串联上述全部能力，可直接对照源码。
::::
