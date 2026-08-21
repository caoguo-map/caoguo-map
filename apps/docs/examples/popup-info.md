# 示例 · 信息弹窗

点击管线要素，弹出属性信息。

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

map.on('load', () => {
  // 假设已 addSource('pipe') + addLayer({ id: 'pipe-line', ... })
  map.on('click', 'pipe-line', (e) => {
    const f = (e as { features?: { properties: Record<string, unknown> }[] }).features?.[0]
    const props = f?.properties ?? {}
    new maplibregl.Popup()
      .setLngLat((e as { lngLat: [number, number] }).lngLat)
      .setHTML(`<strong>${props.name}</strong><br/>压力：${props.pressure}`)
      .addTo(map.instance)
  })
})
```

- 事件对象 `e` 为 `unknown`，取 `features` / `lngLat` 时需类型收窄（见《API · Event》）。
- 弹窗通过 `map.instance`（底层 MapLibre 实例）创建。

> 本例直接复用底层 `maplibregl.Popup`。后续版本将提供引擎封装的 `addPopup` 便捷方法。
