# 第一张地图

本节带你理解草果地图的核心概念：**地图实例、数据源（Source）、图层（Layer）** 以及基本交互。

## 地图实例

`Map` 是渲染入口，负责容器、相机（中心 / 缩放 / 俯仰 / 方位）与样式。

```ts
import { Map, WUHAN_CENTER } from '@caoguo/maplibre'

const map = new Map({
  container: '#app',
  center: WUHAN_CENTER,
  zoom: 11,
  pitch: 45,   // 三维俯仰
  bearing: 20, // 方位角
})
```

## 数据源与图层（核心心智模型）

草果地图遵循「**数据（Source）与样式（Layer）分离**」的声明式模型：

1. `addSource` 注册一份数据（GeoJSON / 矢量瓦片 / 栅格）。
2. `addLayer` 描述这份数据如何被绘制（线 / 面 / 点 / 热力…）。

```ts
map.addSource('pipes', { type: 'geojson', data: pipes })
map.addLayer({ id: 'pipes', type: 'line', source: 'pipes' })
```

## 交互：点击查询

```ts
map.on('click', 'pipes', (e) => {
  const f = e.features?.[0]
  console.log('点击管线：', f?.properties)
})
```

## 实时效果

下面是一张可交互的武汉底图，试试拖动与缩放：

<MapDemo :zoom="11" :height="'460px'" />

## 实时 GeoJSON

把一份 GeoJSON 直接交给 `MapDemo`，即可在文档里渲染矢量图层：

```vue
<MapDemo :data="wuhanLine" :zoom="11.4" :height="'420px'" />
```

<script setup lang="ts">
const wuhanLine = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '示例管线' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [114.28, 30.57],
          [114.3055, 30.5928],
          [114.34, 30.615],
        ],
      },
    },
  ],
}
</script>

<MapDemo :data="wuhanLine" :zoom="11.4" :height="'420px'" />

::: tip 概念延伸
- 图层类型与样式见 [API / Layer](/api/layer)
- 数据源格式见 [API / Source](/api/source)
- 更多交互示例见 [演示中心 /demo/](/demo/)
:::
