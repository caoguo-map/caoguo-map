# 指南 · 数据导入与离线打包（T4）

草果地图以 GeoJSON 作为主要业务数据载体。本文介绍两类导入：常规在线 GeoJSON 数据源，以及为离线/内网场景准备的**离线瓦片打包**。

## 一、在线 GeoJSON 数据源

最常用方式，直接把 FeatureCollection 作为 source：

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
          properties: { name: '主干管' },
        },
      ],
    },
  })
  map.addLayer({ id: 'pipe-line', type: 'line', source: 'pipe', paint: { 'line-color': '#38bdf8' } })
})
```

> 业务数据若非 WGS84，记得在 `Map` 上声明 `dataCRS`（见《坐标系与偏移纠偏》）。

## 二、离线瓦片打包（私有化 / 内网）

在 G 端/央国企内网环境，业务 GeoJSON 可预先「分桶到瓦片网格」存入离线存储（浏览器 IndexedDB / Node 内存），运行时不发任何网络请求。

### 步骤

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

map.on('load', async () => {
  // 1) 启用离线协议（注册 caoguo-offline:// 协议）
  map.enableOffline()

  // 2) 把 GeoJSON 按瓦片网格打包进离线存储
  //    返回写入的瓦片条数
  const count = await map.packGeoJSON(
    'pipe',                       // sourceId
    geojsonFeatureCollection,     // 业务 GeoJSON
    { maxZoom: 14, expires: Date.now() + 1000 * 60 * 60 * 24 * 365 } // 可选：最大缩放、过期时间
  )
  console.log('已打包瓦片条数：', count)

  // 3) 用离线瓦片构造 source（protocol 层短路，不发网）
  map.addSource('pipe-offline', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }, // 占位，运行时由协议填充
    // 关键：tiles 指向 caoguo-offline 协议
  })
  // 实际使用时：
  map.addSource('pipe-offline', {
    type: 'vector',
    tiles: map.offlineTiles('pipe'), // => ['caoguo-offline://pipe/{z}/{x}/{y}']
  })
})
```

### 关键 API

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `enableOffline` | `(store?) => void` | 注册离线协议并启用离线瓦片读取 |
| `packGeoJSON` | `(sourceId, geojson, opts?) => Promise<number>` | 把 GeoJSON 分桶打包，返回瓦片条数 |
| `offlineTiles` | `(sourceId) => string[]` | 生成 `caoguo-offline://{sourceId}/{z}/{x}/{y}` 瓦片 URL |
| `getOfflineStore` | `() => TileStoreBackend` | 读取当前离线存储实例 |

### 与 Service Worker 缓存的区别

- **离线瓦片（T4）**：业务数据走 `caoguo-offline://` 协议，**协议层短路不发网**，是「数据离线」的主路径。
- **SW 二级缓存（T5）**：线上瓦片经 Service Worker 的 Cache API 缓存，可设「空气隔离」模式禁网，是「底图离线」的补充。

两者定位不同，详见《API · 离线能力》。

:::: tip 数据治理
`packGeoJSON` 的 `maxZoom` 决定打包粒度：越大离线包越大但精度越高。管线类建议 `12–14`，区域级汇总建议 `10–12`。
::::
