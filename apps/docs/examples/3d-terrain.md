# 示例 · 3D 地形

一行代码让地图贴合真实高程起伏，适合山地区域的电网/水利场景。

```html
<div id="app" style="width: 100%; height: 480px;"></div>
```

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app', zoom: 12, pitch: 60 })
map.on('load', () => {
  // 默认使用公共 Terrarium 高程源（Terrain-RGB，支持 CORS，无需鉴权）
  map.enableTerrain({ exaggeration: 1.5 })

  // 之后可关闭（同时移除 DEM 源）
  // map.disableTerrain()
})
```

## 参数

`enableTerrain(opts)` 完整选项：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `sourceId` | `cg-dem` | DEM 源 id（多地图实例时各自区分） |
| `tiles` | 公共 Terrarium 源 | DEM 瓦片模板数组，`{z}/{x}/{y}` 占位 |
| `encoding` | `terrarium` | 高程编码，私有 Mapbox Terrain-RGB 服务用 `mapbox` |
| `exaggeration` | `1.5` | 地形夸张系数，1 为真实比例 |
| `maxzoom` | `15` | DEM 瓦片最大级别 |

## 私有化部署：自建 DEM 服务

公共高程源在内网不可用，指向自有瓦片服务即可（MinIO / MBTiles 均可）：

```ts
map.enableTerrain({
  tiles: ['https://tiles.internal.lan/dem/{z}/{x}/{y}.png'],
  encoding: 'terrarium',
  exaggeration: 1.2,
})
```

## 纯函数等价用法

不在 `Map` 封装下（如直接操作原生 MapLibre 实例）时，可用等价纯函数，Node 可测：

```ts
import { applyTerrain, removeTerrain, DEFAULT_TERRAIN_TILES } from '@caoguo/maplibre'

applyTerrain(mlMap, { exaggeration: 1.5 })   // 幂等：已存在同名源不会重复添加
removeTerrain(mlMap)                          // setTerrain(null) + 移除 DEM 源
```

::::: warning 别踩坑
- 地形开启后**要素的屏幕位置会随高程变化**，DOM 像素对位需在地形稳定后取值（原理见《投影与屏幕坐标》）。
- DEM 瓦片体量不小，内网场景务必自建源；公共源仅供联调。
:::::
