# API · Camera 相机控制

草果地图通过 `flyTo` 实现视角飞行与平滑过渡。

## flyTo

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

// 飞行到武汉
map.flyTo({ center: [114.3055, 30.5928], zoom: 12, pitch: 45, bearing: -20 })
```

### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `center` | `[number, number]?` | 目标中心 `[经度, 纬度]` |
| `zoom` | `number?` | 目标缩放级别 |
| `pitch` | `number?` | 目标俯仰角（0–60） |
| `bearing` | `number?` | 目标方位角（度） |

> 省略的字段保持当前值不变；该方法为平滑动画，引擎内部委托 MapLibre 的 `flyTo` 实现。

## 其他视角能力

- 构造 `Map` 时通过 `center` / `zoom` / `pitch` / `bearing` 设定初始视角。
- 俯仰/方位常用于指挥中心大屏的立体呈现，配合辉光管线效果更佳（见《主题与可视化增强》）。

:::: tip 衔接
`flyTo` 后可在 `map.on('moveend', ...)` 中执行数据加载等动作，实现「飞到哪、加载哪」的联动体验。
::::
