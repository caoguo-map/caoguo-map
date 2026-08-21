# API · 数据源 Source

数据源（Source）描述**数据从哪来、是什么形态**。图层只负责"画"，数据由 Source 提供。

## GeoJSON（最常用）

适合矢量点线面、动态数据、仿真结果。

```ts
map.addSource('pipes', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: '主干管', diameter: 800 },
        geometry: { type: 'LineString', coordinates: [[114.30, 30.59], [114.33, 30.61]] },
      },
    ],
  },
})
```

### 动态更新

```ts
const src = map.getSource('pipes') as maplibregl.GeoJSONSource
src.setData(newFeatureCollection)
```

## 矢量瓦片（vector）

适合大规模底图与分级渲染。

```ts
map.addSource('tiles', {
  type: 'vector',
  url: 'https://your-tile-server/tiles.json', // 或 tiles: [...]
})
```

## 栅格（raster）

适合影像底图、卫星图。

```ts
map.addSource('sat', {
  type: 'raster',
  tiles: ['https://your-server/{z}/{x}/{y}.png'],
  tileSize: 256,
})
```

## 数据类型对照

| 类型 | 适用场景 | 是否支持动态更新 |
| --- | --- | --- |
| `geojson` | 业务矢量、仿真结果 | ✅ `setData` |
| `vector` | 大规模分级底图 | 通过瓦片服务 |
| `raster` | 影像 / 卫星 | 静态或栅格源 |

## 天地图 WMTS（T3）

`useTianditu` / `addTianditu` 内置天地图 WMTS 接入，token 在运行时注入（不硬编码）。

```ts
const map = new Map({ container: '#app', zoom: 11 })
map.on('load', () => {
  // 矢量底图 + 中文注记
  map.useTianditu('vec', { token: import.meta.env.VITE_TIANDITU_TOKEN })
  map.addTianditu({ type: 'cva', token: import.meta.env.VITE_TIANDITU_TOKEN })
})
```

| 方法 | 说明 |
| --- | --- |
| `useTianditu(type, opts)` | 将指定天地图图层设为底图（type: `vec`/`img`/`ter` 等） |
| `addTianditu(opts)` | 叠加天地图图层（如注记 `cva`/`cia`） |
| `TiandituLayer` / `tiandituTileUrls` | 底层类型与工具（高级用法） |

> 缺 token 时抛出 `MissingTokenError`。详见 [离线部署](/deployment/air-gap) 的私有化底图替代方案。

## 离线瓦片源（T4）

通过 `caoguo-offline://` 协议 + IndexedDB 存储，把瓦片落到本地，断网仍可调出。

```ts
const map = new Map({ container: '#app' })
map.on('load', async () => {
  // 1) 启用离线（默认 IndexedDB 存储，可传自定义 TileStoreBackend）
  map.enableOffline()

  // 2) 把 GeoJSON 按瓦片网格打包进离线存储
  await map.packGeoJSON('demo-pipe', featureCollection, { maxZoom: 14 })

  // 3) 用离线协议源渲染（断网可用）
  map.addSource('offline-base', {
    type: 'raster', // 或 vector，取决于打包内容
    tiles: [offlineTileUrl('demo-pipe', { z: '{z}', x: '{x}', y: '{y}' })],
  })
})
```

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `enableOffline` | `(store?: TileStoreBackend) => void` | 启用离线存储 + 注册 `caoguo-offline` 协议 |
| `getOfflineStore` | `() => TileStoreBackend \| undefined` | 取当前离线存储（如 IndexedDB） |
| `packGeoJSON` | `(sourceId, geojson, opts?) => Promise<void>` | 按瓦片网格把 GeoJSON 分桶写入各层级 |
| `offlineTiles` | `(sourceId) => string[]` | 列出某源已打包的瓦片 key |

存储后端可替换：`MemoryTileStore`（测试/回退）或自实现 `TileStoreBackend`（`get`/`put`/`has`/`delete`/`keys`）。

:::: warning 私有化注意
生产环境请将瓦片与矢量源指向你的内网服务，避免数据外发。详见 [离线部署](/deployment/air-gap)。
::::
