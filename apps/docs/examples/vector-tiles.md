# 示例 · 矢量瓦片

加载瓦片服务作为数据源（含离线瓦片协议）。

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

map.on('load', async () => {
  // 在线矢量瓦片
  map.addSource('vec', {
    type: 'vector',
    url: 'https://example.com/tiles/pipe/{z}/{x}/{y}.mvt',
  })
  map.addLayer({ id: 'vec-pipe', type: 'line', source: 'vec', 'source-layer': 'pipe' })

  // 离线矢量瓦片（caoguo-offline 协议，不发网）
  map.enableOffline()
  await map.packGeoJSON('pipe', geojson, { maxZoom: 14 })
  map.addSource('pipe-offline', {
    type: 'vector',
    tiles: map.offlineTiles('pipe'), // ['caoguo-offline://pipe/{z}/{x}/{y}']
  })
})
```

- 在线瓦片走普通网络请求；离线瓦片经 `caoguo-offline://` 协议层短路。
- 详见《API · 离线能力》与《数据导入与离线打包》。
