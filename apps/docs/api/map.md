# API · Map

`Map` 是草果地图的渲染入口，对 `maplibre-gl` 做了轻量封装并预留引擎扩展点。

## 构造函数

```ts
new Map(options: MapOptions)
```

### MapOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `container` | `string \| HTMLElement` | — | 容器 id 或 DOM 元素（必填） |
| `center` | `[number, number]` | `[114.3055, 30.5928]` | 初始中心（经度, 纬度） |
| `zoom` | `number` | `11` | 初始缩放级别 |
| `style` | `string \| object` | 暗色演示样式 | 地图样式（URL 或样式对象） |
| `pitch` | `number` | `0` | 俯仰角（0–60） |
| `bearing` | `number` | `0` | 方位角（度） |

## 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `addSource` | `(id: string, source: object) => void` | 注册数据源 |
| `addLayer` | `(layer: object) => void` | 添加图层 |
| `removeLayer` | `(id: string) => void` | 移除图层（存在时） |
| `on` | `(event: string, layerId?, cb?) => void` | 绑定事件 |
| `flyTo` | `(opts) => void` | 飞行到目标视角 |
| `remove` | `() => void` | 销毁地图实例 |

## 示例

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app', zoom: 11 })
map.on('load', () => {
  map.addSource('src', { type: 'geojson', data })
  map.addLayer({ id: 'lyr', type: 'circle', source: 'src' })
})
```

::: tip 进阶
飞行与动画、聚类、表达式样式等能力，参见后续版本 API 文档。
:::
