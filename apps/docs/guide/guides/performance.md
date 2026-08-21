# 指南 · 性能调优与 LOD（T7）

当地图叠加海量要素（如全国路网、全量管线）时，低缩放级别下要素过密会导致卡顿。草果地图提供 **LOD 控制器**，随缩放自动切换数据密度等级。

## LOD 控制器（T7）

按地图 `zoom` 自动激活对应的数据密度等级，并在等级切换时回调，由你决定 `setData` / 切换 source。

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app' })

const ctrl = map.addLodController(
  [
    { id: 'province', minZoom: 0, maxZoom: 9,  payload: { url: '/data/province.geojson' } },
    { id: 'city',     minZoom: 10, maxZoom: 13, payload: { url: '/data/city.geojson' } },
    { id: 'detail',   minZoom: 14,            payload: { url: '/data/detail.geojson' } },
  ],
  (e) => {
    if (e.changed) {
      // 等级切换：加载对应密度的数据
      fetch(e.level.payload.url)
        .then((r) => r.json())
        .then((geojson) => {
          const src = map.getSource('data')
          src && (src as { setData: (d: unknown) => void }).setData(geojson)
        })
    }
    console.log('当前 LOD 等级：', e.level.id, 'zoom=', e.zoom)
  }
)

// 运行时操作
ctrl.getLevel()      // 当前等级
ctrl.setLevels([/* 新等级定义 */])
ctrl.remove()        // 卸载
```

### 等级定义 `LodLevel`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 等级名称（如 `province` / `city` / `detail`） |
| `minZoom` | `number` | 进入该等级的最小 zoom（含） |
| `maxZoom` | `number?` | 进入该等级的最大 zoom（含）；省略表示 +∞ |
| `payload` | `T?` | 该等级承载的数据/配置（任意类型，由你解释） |

### 纯函数（可单测，无需地图实例）

```ts
import { resolveLod, suggestDensity } from '@caoguo/maplibre'

resolveLod(12, levels)        // 解析 zoom=12 应激活的等级
suggestDensity(12, 200)       // 每屏建议最大要素数（随 zoom 平方增长）
```

## 其他性能建议

- **要素聚合**：低 zoom 下用聚合/简化数据（配合 LOD 的 `payload` 切源）。
- **批量入图**：用 `packGeoJSON` 预分桶（见《数据导入与离线打包》），减少运行时计算。
- **辉光克制**：`addGlowLayer` 的 `passes` 越多越柔但越耗 GPU，管线场景 `3–4` 遍即可。
- **图层顺序**：把低频更新的图层放在底层，减少重绘范围。

:::: tip 阈值选择
`minZoom` 取「上一等级 maxZoom + 1」，避免区间重叠导致抖动；区间重叠时引擎取 `minZoom` 更大者（更精细优先）。
::::
