# API · 离线能力（T4 + T5）

离线能力由两层构成：

- **T4 离线瓦片**：`caoguo-offline://` 协议 + 存储后端（IndexedDB 默认），把瓦片落到本地。
- **T5 Service Worker**：网络层 Cache API 二级缓存 + 空气隔离拦截。

两者互补：T4 命中时协议层短路不发网；未命中时由 T5 的 Cache / 离线存储兜底。

## Map 上的离线方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `enableOffline` | `(store?: TileStoreBackend) => void` | 启用离线存储并注册 `caoguo-offline` 协议 |
| `getOfflineStore` | `() => TileStoreBackend \| undefined` | 取当前离线存储 |
| `packGeoJSON` | `(sourceId: string, geojson, opts?: { maxZoom?, expires? }) => Promise<void>` | 按瓦片网格分桶写入各层级 |
| `offlineTiles` | `(sourceId: string) => string[]` | 列出某源已打包的瓦片 key |

## 存储后端接口 `TileStoreBackend`

```ts
interface TileStoreBackend {
  get(key: string): Promise<TileData | undefined>
  put(key: string, tile: TileData): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}
interface TileData {
  data: ArrayBuffer | Uint8Array
  format: 'png' | 'jpg' | 'webp' | 'mvt' | 'pbf'
  expires?: number
}
```

内置实现：
- `MemoryTileStore`：内存存储，Node 测试 / 临时回退。
- `IdbTileStore` + `createDefaultStore()`：IndexedDB 持久化（浏览器默认）。

## 离线协议 URL

```ts
import { offlineTileUrl, OFFLINE_PROTOCOL } from '@caoguo/maplibre/offline'

// OFFLINE_PROTOCOL === 'caoguo-offline'
const url = offlineTileUrl('demo-pipe', { z: 12, x: 3412, y: 1650 })
// => 'caoguo-offline://demo-pipe/12/3412/1650'
```

## Service Worker（T5）

```ts
import {
  registerOfflineServiceWorker, // (scriptUrl) => Promise<ServiceWorkerRegistration | null>
  setAirgap,                     // (registration, enabled: boolean) => void
  installServiceWorker,          // (sw) => { airgap }  —— SW 脚本内调用
} from '@caoguo/maplibre/offline'

// SW 脚本内（与地图同域）：
//   importScripts('caoguo-offline-sw.bundle.js'); installServiceWorker(self)

// 主线程：
const reg = await registerOfflineServiceWorker('/caoguo-sw.js')
setAirgap(reg, true)  // 进入空气隔离（断网可用）
```

### 缓存策略

| 模式 | 顺序 | 说明 |
| --- | --- | --- |
| 在线优先（默认） | Cache → 网络(写回) → Store | 首屏后瓦片入 Cache |
| 空气隔离 | Cache → Store | 禁止网络，断网仍可调出 |

- 仅缓存白名单 host 的 GET 瓦片（`t0–t7.tianditu.gov.cn`）；
- `caoguo-offline://` 请求由 T4 处理，不进 SW 缓存。

:::: tip 与 Demo 的关系
演示站的「Phase-0 能力演示」页中，「打包管线离线」按钮即调用 `enableOffline` + `packGeoJSON`；「空气隔离」开关对应 `setAirgap`。
::::
