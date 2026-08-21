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

`buildStyle(theme, opts)` 支持自定义 `sourceUrl` / `glyphs` / `notoFonts`，并基于 `structuredClone` 保证样式不可变。

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

:::: tip 一站式体验
演示站的「Phase-0 能力演示」页在一页内串联上述全部能力，可直接对照源码。
::::
