# API · 图层 Layer

图层（Layer）描述**数据如何被绘制**。草果地图支持 MapLibre 全量图层类型，并计划扩展行业专用图层。

## 图层通用结构

```ts
map.addLayer({
  id: string,             // 唯一 id
  type: 'line' | 'fill' | 'circle' | 'heatmap' | 'symbol' | ...,
  source: string,         // 关联的数据源 id
  paint?: object,         // 绘制样式
  layout?: object,        // 布局属性
  filter?: object,        // 要素过滤
})
```

## 常用图层类型

| 类型 | 用途 | 关键 paint |
| --- | --- | --- |
| `line` | 管线 / 路网 / 边界 | `line-color`, `line-width` |
| `fill` | 面状区域（淹没范围 / 地块） | `fill-color`, `fill-opacity` |
| `circle` | 节点 / 基站 / 设施点 | `circle-radius`, `circle-color` |
| `heatmap` | 负荷 / 信号热力 | `heatmap-weight`, `heatmap-radius` |
| `symbol` | 标注 / 图标 | `text-field`, `icon-image` |

## 管线示例（line）

```ts
map.addLayer({
  id: 'pipes',
  type: 'line',
  source: 'pipes',
  paint: {
    'line-color': '#14b8a6',
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 6],
  },
})
```

## 热力示例（heatmap）

```ts
map.addLayer({
  id: 'load-heat',
  type: 'heatmap',
  source: 'load',
  paint: {
    'heatmap-weight': ['get', 'value'],
    'heatmap-radius': 24,
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
      0, 'transparent', 0.5, '#0ea5e9', 1, '#ef4444'],
  },
})
```

::: tip 表达式
`paint` 支持数据驱动的表达式（插值、步进、匹配），可实现按属性分级着色。
:::
