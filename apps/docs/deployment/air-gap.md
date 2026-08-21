# 部署 · 离线 / 空气隔离

草果地图的核心价值之一是**数据不出域**。在关基、等保场景中，常要求完全离线（空气隔离）部署。

## 原则

1. **零外部依赖**：所有 JS / CSS / 字体 / 瓦片均在本地。
2. **底图私有化**：使用内网瓦片服务或离线瓦片包，禁止回源公网。
3. **AI 能力本地化**：NLPG / GeoAI 的模型与服务部署在内网节点。

## 离线瓦片（T4）

- 将瓦片包（MBTiles / 目录瓦片）挂载到内网服务，Source 指向内网地址：

```ts
map.addSource('base', {
  type: 'raster',
  tiles: ['https://intra-map/tiles/{z}/{x}/{y}.png'],
  tileSize: 256,
})
```

- 或使用草果离线协议（经 `enableOffline` 后）：

```ts
map.enableOffline()
await map.packGeoJSON('base', fc, { maxZoom: 14 })
map.addSource('offline', {
  type: 'raster',
  tiles: [offlineTileUrl('base', { z: '{z}', x: '{x}', y: '{y}' })],
})
```

## Service Worker 网络级二级缓存（T5）

T4 在「协议层」短路离线瓦片请求；T5 进一步在网络层用 **Cache API** 缓存线上瓦片（天地图等），并在**空气隔离**模式下拦截所有请求、用 Cache / 离线存储兜底，实现断网后地图仍可平移缩放。

### SW 脚本（部署到与地图同域根路径，如 `public/caoguo-sw.js`）

```js
importScripts('/caoguo-offline-sw.bundle.js') // 含 installServiceWorker
installServiceWorker(self) // 自动处理 install/activate/message + fetch 拦截
```

> `caoguo-offline-sw.bundle.js` 由 `@caoguo/maplibre/offline` 编译产物提供，或自行打包 `installServiceWorker`。

### 注册 + 切换空气隔离（主线程）

```ts
import {
  registerOfflineServiceWorker,
  setAirgap,
} from '@caoguo/maplibre/offline'

const reg = await registerOfflineServiceWorker('/caoguo-sw.js')
// 进入空气隔离（断网可用）：仅用 Cache + T4 离线存储
setAirgap(reg, true)
// 恢复在线优先
setAirgap(reg, false)
```

### 缓存行为

| 模式 | 命中顺序 | 说明 |
| --- | --- | --- |
| 在线优先（默认） | Cache → 网络(写回) → Store 兜底 | 首屏后瓦片进入 Cache，二次加载离线可用 |
| 空气隔离 | Cache → Store 兜底 | 禁止网络请求，断网仍可调出已缓存/已打包瓦片 |

- 仅缓存白名单 host（天地图 `t0–t7.tianditu.gov.cn`）的 GET 瓦片请求；
- `caoguo-offline://` 协议请求由 T4 处理，不进入 SW 缓存。

## 构建时内联资源

- 关闭 VitePress 的外部 CDN（字体、图标本地化）。
- 使用 `appearance: 'force-dark'` 避免主题切换请求。
- 确保 `@caoguo/maplibre` 的样式对象不引用公网 glyphs / sprite（或指向内网）。

## 校验清单

- [ ] 断网后页面与地图仍可加载
- [ ] 无指向公网的请求（用 DevTools Network 面板核对）
- [ ] 字体已本地化，无 FOUT / 外链
- [ ] 等保 / 关基所需日志与审计已启用

:::: warning
演示阶段的默认样式使用公开 OSM 栅格瓦片，仅用于本地预览。上线前必须替换为私有化底图。
::::
