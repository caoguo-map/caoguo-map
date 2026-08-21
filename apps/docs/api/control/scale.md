# API · ScaleControl 比例尺控件（T8 / F-1.8）

`ScaleControl` 提供比例尺与实时坐标显示，随地图缩放/移动自动更新。

## 挂载

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })
map.on('load', () => {
  const scale = map.addScaleControl({ showCoordinate: true })
  // scale.remove() 卸载
})
```

### 选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showCoordinate` | `boolean` | `false` | 是否实时显示鼠标处 WGS84 经纬度 |
| `maxWidth` | `number` | `100` | 比例尺条最大像素宽度 |

## 比例尺计算（纯函数）

比例计算 `computeScaleBar` 不依赖浏览器，可独立单测：

```ts
import { computeScaleBar } from '@caoguo/maplibre'

const bar = computeScaleBar(30.59, 12, { dpiScale: window.devicePixelRatio, maxWidth: 100, tileSize: 512 })
// bar.meters  - 比例尺条代表的真实距离（米）
// bar.pixels  - 屏幕像素宽度
// bar.label   - 展示文案，如 "500 m" / "2 km"
```

实现基于 Web Mercator 在给定纬度下的地面分辨率（含 `cos(lat)`、设备像素比、瓦片尺寸），自动吸附到 1/2/5 整数档并切换 米 / 公里。

## 实例方法

| 方法 | 说明 |
| --- | --- |
| `addTo(container)` | 挂到指定 DOM 容器 |
| `remove()` | 从地图卸载，移除监听 |
