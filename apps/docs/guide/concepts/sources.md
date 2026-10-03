# 指南 · 数据源（Sources）

数据源（source）是图层的数据供给方：先声明「数据从哪来」，再由图层决定「怎么画」。草果地图对 MapLibre 数据源做了三件事：**天地图预置、离线协议、幂等写入**。

## 数据源类型速查

| 类型 | 用途 | 典型场景 |
| --- | --- | --- |
| `geojson` | 业务矢量数据直接入图 | 管网/设备/淹没面叠加 |
| `vector` | 矢量瓦片（TileJSON / `{z}/{x}/{y}` 模板） | 底图、大容量业务图层 |
| `raster` | 栅格瓦片 | 影像底图、离线瓦片 |
| `raster-dem` | 高程瓦片 | 3D 地形（见《3D 地形》示例） |
| `image` | 单张图片 | 雷达回波、态势图 |

## 业务数据入图

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app', dataCRS: 'CGCS2000' })
map.on('load', () => {
  map.addSource('pipes', {
    type: 'geojson',
    data: pipeFeatureCollection, // 坐标按 dataCRS 自动纠偏（见《坐标系与偏移纠偏》）
  })
})
```

数据更新不必删源重建，`geojson` 源支持增量 `setData`：

```ts
const src = map.getSource('pipes') as { setData: (d: unknown) => void }
src.setData(newCollection)
```

## 幂等写入：upsertSource

热更新场景（实时数据、重复渲染）下，直接 `addSource` 会因 id 已存在而抛错。用 `upsertSource` 一步到位——不存在则加，已存在则更新数据：

```ts
import { upsertSource, removeSourceSafe, removeSourcesSafe } from '@caoguo/maplibre'

upsertSource(map.getMap(), 'live-points', featureCollection)
removeSourceSafe(map.getMap(), 'live-points')       // 不存在也不抛错
removeSourcesSafe(map.getMap(), ['a', 'b', 'c'])    // 批量清理
```

> 本仓库所有行业包（water/pipeline/grid…）的渲染薄壳均基于 `upsertSource`，保证重复调用不膨胀图层。

## 天地图底图源

天地图 WMTS 已预置，无需手写 WMTS 参数：

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })
map.addTianditu({ tk: '你的密钥' })                 // 叠加式（不影响已有图层）
// 或整体切换样式：
map.useTianditu('vec_w', { tk: '你的密钥' })        // 矢量底图
```

天地图图层类型：`vec_w`（矢量）/ `img_w`（影像）/ `ter_w`（地形晕渲）/ `cva_w`（中文注记）等，可与注记层叠加组合。无密钥时会抛 `MissingTokenError`。

## 离线数据源

离线场景走 `caoguo-offline://` 协议（不发网请求），业务 GeoJSON 也有离线打包方案：

```ts
import { offlineGeoJSONSource } from '@caoguo/maplibre'

// GeoJSON 打包进离线瓦片库，内网可用的业务图层
const source = offlineGeoJSONSource({
  store: map.getOfflineStore(),
  data: myFeatureCollection,
})
```

完整离线体系（IndexedDB 瓦片库 + Service Worker 空气隔离）见《离线能力》API 与部署文档《离线 / 空气隔离》。

## 内置底图样式源

不接天地图时，可用内置样式快速起步：

```ts
import { geoqRasterStyle } from '@caoguo/maplibre'

const map = new Map({ container: '#app', style: geoqRasterStyle() })
```

- `osmRasterStyle` / `geoqRasterStyle`：公共栅格底图（联调用）
- `localBasemapStyle`：本地矢量底图模板（生产私有化部署用，配合自建瓦片服务）
- 草果矢量主题底图：`buildStyle({ theme: 'caoguo-dark' })`，见《样式与主题》

::::: tip 下一步
- 图层如何消费数据源：见《图层（Layers）》
- 数据批量打包离线：见《数据导入与离线打包》
:::::
