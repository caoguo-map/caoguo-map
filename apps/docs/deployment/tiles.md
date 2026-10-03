# 部署 · 瓦片服务

底图瓦片是私有化部署的带宽与合规重心。本文按三条路线给出生产做法：**自建瓦片服务、天地图直连、离线打包**。

## 路线一：自建瓦片服务（推荐）

### tileserver-gl 托管 MBTiles

```bash
# 单容器托管矢量/栅格 MBTiles，自动产出 TileJSON
docker run -d -p 8081:8080 -v /data/tiles:/data \
  maptiler/tileserver-gl-light \
  --mbtiles /data/caoguo-dark.mbtiles
```

前端把矢量主题的瓦片范围指向内网服务：

```ts
import { buildStyle } from '@caoguo/theme'

const style = buildStyle({
  theme: 'caoguo-dark',
  sourceUrl: 'https://tiles.internal.lan/caoguo-dark.json',  // TileJSON
})
```

### 目录瓦片（nginx 直出）

已有 `{z}/{x}/{y}.png` 目录树时，不需要任何瓦片服务软件：

```nginx
location /tiles/ {
  alias /data/tiles/;
  expires 30d;                      # 瓦片不可变，客户端长缓存
}
```

## 路线二：天地图直连

- 域名白名单 `t0–t7.tianditu.gov.cn`（引擎 SW 缓存只认这批 host 的 GET 瓦片）；
- `tk` 密钥**只应经服务端代理使用**：直连前端等于把密钥公开在页面源码里；规模上来后由 nginx 反代加缓存：

```nginx
location /tdt/ {
  proxy_pass https://t0.tianditu.gov.cn/;
  proxy_set_header Referer "https://map.hb.cn";
  proxy_cache_valid 200 30d;
}
```

> 天地图是 CGCS2000 基准，引擎已统一换算；业务数据坐标系声明见《坐标系与偏移纠偏》。

## 路线三：离线打包（不发网）

极致内网 / 单机大屏场景，底图数据可以完全不打瓦片服务：

```ts
await map.enableOffline()
await map.packGeoJSON('base', baseFeatureCollection, { maxZoom: 14 })  // GeoJSON 按瓦片网格入 IndexedDB
map.addSource('base', { type: 'geojson', data: offlineTileUrl('base', 0, 0, 0) })
```

配合 Service Worker（`registerOfflineServiceWorker` + `setAirgap`）后全站断网可用，详见《离线 / 空气隔离》。

## 3D 地形 DEM 瓦片

`enableTerrain` 默认走公共 Terrarium 源，内网必须自建（MinIO / MBTiles 均可），传 `tiles` 覆盖即可，见《3D 地形》示例。

## 诚实声明：localBasemapStyle

`localBasemapStyle()` 是**纯样式不含任何瓦片**——深色背景 + 经纬网线层，只作「无底图也不开天窗」的兜底与联调占位，不要当真实底图上线。

## 选型速查

| 场景 | 路线 |
| --- | --- |
| 有测绘成果 / MBTiles，数据不出域 | 自建 tileserver-gl 或目录瓦片 |
| 有天地图 Key、允许公网 | 直连（tk 走服务端代理） |
| 单机大屏 / 完全断网 | `packGeoJSON` 离线打包 + 空气隔离 |
