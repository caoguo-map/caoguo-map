# API · Event 事件系统

草果地图通过 `on` 绑定地图与图层事件，与 MapLibre 事件体系一致。

## on

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

// 地图级事件
map.on('load', () => { /* 地图就绪，可加图层 */ })
map.on('click', (e) => { console.log(e.lngLat) })

// 图层级事件（指定 layerId）
map.on('click', 'pipe-line', (e) => {
  console.log('点击了管线：', e.features)
})
```

### 签名

```ts
map.on(event: string, layerId?: string, cb?: (e: unknown) => void): void
```

| 参数 | 说明 |
| --- | --- |
| `event` | 事件名，如 `load` / `click` / `mousemove` / `zoom` / `moveend` |
| `layerId` | 可选；传入后仅在该图层上触发 |
| `cb` | 回调，事件对象 `e` 含 `lngLat`、`features` 等字段 |

## 常用事件

| 事件 | 触发时机 | 典型用途 |
| --- | --- | --- |
| `load` | 样式与底图加载完成 | 添加 source / layer |
| `click` | 点击地图/要素 | 弹窗、下钻 |
| `mousemove` | 鼠标移动 | 实时坐标、悬停高亮 |
| `zoom` / `move` | 缩放 / 平移 | LOD 联动、范围刷新 |
| `moveend` | 平移/飞行结束 | 视口内数据加载 |

> 事件对象 `e` 的字段随事件类型不同（如 `click` 有 `lngLat` 与 `features`，`zoom` 没有），使用时按需取用。

:::: warning 类型提示
`on` 的回调参数类型为 `unknown`，取 `e.lngLat` / `e.features` 等字段时请先做类型收窄（如 `const ev = e as { lngLat: [number, number] }`）。
::::
