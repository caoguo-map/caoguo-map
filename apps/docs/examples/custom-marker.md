# 示例 · 自定义标记

按业务类型给点标注配色，并把规模映射为半径——不逐点写样式，全部交给**数据驱动表达式**与**稳定散列配色**。

```html
<div id="app" style="width: 100%; height: 480px;"></div>
```

```ts
import { Map, buildOverlayGeoJSON, addOverlayLayers } from '@caoguo/maplibre'

const map = new Map({ container: '#app', zoom: 11 })
map.on('load', () => {
  const points = [
    { id: 'h1', kind: 'hospital', name: '市中心医院', lng: 114.3, lat: 30.59, scale: 800 },
    { id: 's1', kind: 'school',   name: '实验小学',   lng: 114.33, lat: 30.6, scale: 450 },
    { id: 'f1', kind: 'factory',  name: '水厂',       lng: 114.28, lat: 30.57, scale: 1200 },
    { id: 'g1', kind: 'government', name: '区政府',   lng: 114.31, lat: 30.58, scale: 300 },
  ]

  // ① 生成要素：kind 决定颜色（未知类型按名称稳定散列取色板），scale 归一化为半径
  const data = buildOverlayGeoJSON({
    points,
    minRadius: 5,
    maxRadius: 14,
  })

  // ② 一次加源 + 加层（circle 点层 + 可选区域线框层），幂等可重复调用
  addOverlayLayers(map.getMap(), {
    sourceId: 'markers',
    layerPrefix: 'mk',
    data,
  })
})
```

要点：

- `kind` 相同的点**永远同色**：配色由 `stableHash(kind)` 从 `OVERLAY_PALETTE` 稳定选取，刷新不变；
- 想固定某些类型的颜色，传 `colorOf: (kind) => ({ hospital: '#ef4444' }[kind] ?? fallback)`；
- `scale` 是可选的规模值（人口/面积/用量），自动归一到 `minRadius`~`maxRadius`；
- 传 `polygon: [[lng,lat], …]` 可同时画一个区域线框层（少于 3 点自动忽略）。

## 搭配信息卡片

点击标记弹出统一风格的业务卡片（零依赖 HTML，样式开箱可读）：

```ts
import { renderCardHtml } from '@caoguo/maplibre'

map.on('click', 'mk-points', (e) => {
  const p = e.features![0].properties!
  new maplibregl.Popup()
    .setLngLat([p.lng, p.lat])
    .setHTML(renderCardHtml({
      title: p.name,
      subtitle: p.kind,
      statusLabel: '运行中',
      statusColor: '#4ade80',
    }))
    .addTo(map.getMap())
})
```

::::: tip 下一步
- 卡片字段与样式：见《行业包扩展》的 cardFields
- 点击交互事件：见《事件 Event》
:::::
