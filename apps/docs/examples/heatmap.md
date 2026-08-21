# 示例 · 热力图

用 `heatmap` 图层表达监测点密度。

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

map.on('load', () => {
  map.addSource('sensors', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coord },
        properties: { weight: p.value },
      })),
    },
  })

  map.addLayer({
    id: 'sensor-heat',
    type: 'heatmap',
    source: 'sensors',
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-radius': 20,
      'heatmap-intensity': 1,
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,255,0)',
        0.5, 'royalblue',
        1, 'red'],
    },
  })
})
```

:::: tip 性能
监控点海量时，配合 LOD（见《性能调优与 LOD》）在低 zoom 下降采样。
::::
