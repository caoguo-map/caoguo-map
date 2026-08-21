# 示例 · 管线辉光

用多遍描边绘制管线的辉光效果（指挥中心大屏常用）。

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

map.on('load', () => {
  map.addGlowLayer({
    id: 'cg-glow',
    lines: [
      { group: 'pipe', coordinates: [[114.30, 30.59], [114.33, 30.61]] },
      { group: 'road', coordinates: [[114.27, 30.66], [114.34, 30.52]] },
    ],
    baseWidth: 3,
    passes: 4, // 遍数越多辉光越柔
  })
})
```

- 分组颜色默认 `pipe`（青蓝）/ `road`（灰蓝）/ `water`（深蓝），可用 `colors` 覆盖。
- 通过返回的图层 id 可 `removeLayer` 卸载。

> 完整串联示例见演示站「Phase-0 能力演示」页。
