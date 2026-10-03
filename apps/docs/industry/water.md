# 专题 · 水网（@caoguo/maplibre-water）

水网包覆盖 PRD `phase-2-grid-water.md` 的 R-1~R-6（水系）/ F-1~F-6（洪水淹没）/ DO-1~DO-6（水库调度），以及 F-6 撤退路径推荐。

## 数据模型

```ts
// WaterDataset：水系要素集合（河道/水库/闸站/堤防…）
{ features: [{ id, kind: 'river'|'reservoir'|'gate'|'dike'|..., geometry, properties }] }
```

水文计算另需 DEM 高程网格与降雨参数（SCS-CN 产流模型）。

## 核心能力

| 场景 | 入口 | 说明 |
| --- | --- | --- |
| 水系拓扑 | `RiverSystem` | 层级渲染 + 顺流/逆流钻取 + 水库/闸站卡片 |
| 洪水淹没 | `simulateFlood()` / `FloodInundation` | SCS 产流 → 格网填洼 → 淹没范围/最大水深；`renderGraded` 水深分级着色 |
| 多方案对比 | `compareFloodScenarios()` / `overlayFlood()` | 多情景叠加渲染（data-driven 配色） |
| 水库调度 | `DamOperation` / `simulateDamSchedule()` | 多水库联合调度、闸门泄量调整、方案对比 + 甘特图 |
| 撤退路径 | `planEvacuation()` | 路网注入 + 淹没禁行 + 多源 Dijkstra 求最近安全点 |

## 快速上手：洪水淹没

```ts
import { simulateFlood, depthColor } from '@caoguo/maplibre-water'

const result = simulateFlood(waterDataset, demGrid, { rainfall: 200, curveNumber: 75 }, [col, row])
result.inundationPolygon   // 淹没范围（多边形环）
result.maxDepth            // 最大水深（m）→ depthColor(maxDepth) 分级色
```

降雨为 0 时径流为 0；CN 值越大（地表越不透水）径流越大——模型行为有单测锁定。

## 快速上手：撤退路径

```ts
import { FloodInundation } from '@caoguo/maplibre-water'

const flood = new FloodInundation({ map })
const plan = flood.planEvacuation(roadGraph, floodResult)
plan.routes   // 每个撤离起点：pathCoords 直出可渲染 / distanceM / reachable
flood.renderEvacuation(plan)   // 可达路线折线上图（不可达起点自动过滤）
```

## 水库调度与面板

```ts
import { DamOperation, renderReservoirPanelHtml, renderScheduleEditorHtml } from '@caoguo/maplibre-water'

const dam = new DamOperation(dataset)
const r = dam.setGateFlow('gate-1', 500)      // 调整泄量并重算
renderReservoirPanelHtml(r.details)           // 零依赖状态面板（超警戒标红）
renderScheduleEditorHtml(r.details, { outflows: dam.outflows })   // 滑杆编辑器（data-* 事件委托）
```

## 延伸阅读

- 多方案对比/甘特图/站点实时指标：《水网运营扩展》
- 洪水参数表单：《快速开始》系列或包 README
