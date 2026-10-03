# 指南 · 图层（Layers）

图层决定「数据怎么画」：同一份数据源，可以同时被线图层、点图层、热力图层消费。本文讲草果地图的图层模型与**数据驱动（data-driven）表达式**这一贯穿全仓的着色手法。

## 图层类型速查

| type | 几何 | 典型用途 |
| --- | --- | --- |
| `circle` | 点 | 设备标注、告警点 |
| `line` | 线 | 管线、路线、淹没边界 |
| `fill` | 面 | 影响范围、淹没面、行政区划 |
| `symbol` | 点 | 图标 + 文字标注（需 glyphs） |
| `heatmap` | 点密度 | 风险热力、容量热力 |
| `raster` | 栅格 | 底图瓦片、影像 |
| `custom` | 自定义 WebGL | 辉光线、流动线（`ShaderLayer`） |

## 图层 = 数据源 + 样式

```ts
map.on('load', () => {
  map.addLayer({
    id: 'pipes-line',
    type: 'line',
    source: 'pipes',                    // 引用已声明的数据源 id
    filter: ['==', ['geometry-type'], 'LineString'],  // 多类型数据时按几何过滤
    paint: { 'line-color': '#22d3ee', 'line-width': 2 },
  })
})
```

三个高频要点：

1. **`layout` vs `paint`**：`layout` 影响布局（可见性、图标尺寸），改动代价高；`paint` 是绘制属性，可频繁热更新。
2. **图层次序**：`addLayer` 默认追加到最上层；底图注记要在业务层之上时，传第二个参数指定插入位置。
3. **删除图层**：`map.removeLayer(id)`；行业包统一用 try/catch 包裹 `addLayer` 实现幂等重渲染。

## 数据驱动表达式

草果地图行业包的核心着色手法：**颜色/半径/宽度不由 JS 算好写死，而是写成表达式由要素属性在运行时取值**。改数据只需 `setData`，样式自动跟随：

```ts
paint: {
  // 半径按 severity 属性插值：1→5px … 100→9px
  'circle-radius': [
    'interpolate', ['linear'], ['get', 'severity'],
    1, 5, 20, 6, 50, 7, 100, 9,
  ],
  // 颜色按阈值分档
  'circle-color': [
    'case',
    ['>=', ['get', 'severity'], 100], '#ef4444',
    ['>=', ['get', 'severity'], 50],  '#f59e0b',
    ['>=', ['get', 'severity'], 20],  '#fbbf24',
    '#4ade80',
  ],
}
```

常用表达式速查：

| 表达式 | 语义 | 备注 |
| --- | --- | --- |
| `['get', k]` | 取要素属性 | 属性名来自 `properties` |
| `['coalesce', ['get', k], 0]` | 取属性，缺省兜底 | **务必兜底**，否则 NaN 会中断插值 |
| `['interpolate', ['linear'], …]` | 连续插值 | 锚点从 0 起可避免除零歧义 |
| `['match'/'case', …]` | 分档 | `match` 精确匹配，`case` 条件判断 |
| `['heatmap-density']` | 热力密度变量 | 仅 `heatmap` 层的 `heatmap-color` 可用 |

> 工程约定：本仓库凡涉及数值属性的插值，一律 `coalesce` 兜底 + 锚点覆盖 0 值——这是全仓 QA 审计后固化的写法。

## 增强图层：辉光与自定义 Shader

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })
map.on('load', () => {
  // 辉光管线（预设封装，开箱即用）
  map.addGlowLayer({ id: 'glow', source: 'pipes' })
  // 或需要完全自定义着色时：
  map.addShaderLayer({ /* ShaderLayerOptions */ })
})
```

两者返回句柄（`GlowLayerHandle` / `ShaderLayerHandle`），可更新 uniform 或移除。底层是 `CustomLineLayer`（MapLibre custom layer 接口），预设着色器 `LINE_*` / `FLOW_LINE_*` 支持流动动画。

## 自适应 LOD

大容量业务图层建议挂 LOD 控制器，按缩放级别自动调整渲染密度：

```ts
map.addLodController()
```

原理与调参见《性能调优与 LOD》。

::::: tip 下一步
- 数据从哪来：见《数据源（Sources）》
- 样式与主题整体定制：见《样式与主题》
:::::
