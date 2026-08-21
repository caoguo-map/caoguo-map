# 示例 · GeoJSON 图层

叠加管线 GeoJSON 并绘制为线图层。

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

map.on('load', () => {
  map.addSource('pipe', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[114.30, 30.59], [114.33, 30.61]] },
          properties: { name: '主干管', pressure: 0.6 },
        },
      ],
    },
  })

  map.addLayer({
    id: 'pipe-line',
    type: 'line',
    source: 'pipe',
    paint: {
      'line-color': '#38bdf8',
      'line-width': 3,
    },
  })
})
```

> 数据为 GCJ-02 / CGCS2000 时，构造 `Map` 时加 `dataCRS`，无需手工纠偏。
