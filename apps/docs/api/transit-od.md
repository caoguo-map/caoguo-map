# TransitHeatmap 公共交通客流 OD

> 隶属 `@caoguo/maplibre-transport` 包。来源：`packages/transport/src/transit/`
> PRD：`prd/phase-3-transport-compute-telecom.md §3.4`（TNS-1～TNS-4）

渲染公共交通（公交 / 地铁）的**站点吞吐热力**与 **OD 客流连线**，并提供客流预测与线路优化建议。

> 与「路网 OD」的区别：`TrafficFlow.renderOdMatrix()` 画的是**路网**起终点流量（PRD TF-4）；本模块面向**公共交通站点**的上下客与站间客流。`@caoguo/maplibre-transport/transit` 子入口可独立引入。

---

## 快速用法

```ts
import { Map } from '@caoguo/maplibre';
import { TransitHeatmap, aggregateOd, predictOd, suggestLineOptimization } from '@caoguo/maplibre-transport';

const map = new Map({ container, style, center: [114.31, 30.58], zoom: 11 });

const heat = new TransitHeatmap({ map, stations });
const agg = heat.render(records);   // 站点热力 + OD 连线，返回聚合结果

// 客流预测（增长率外推 + 置信度）
const pred = predictOd(agg.odWeights, 0.1);
heat.renderPredicted(records, pred.odWeights);

// 线路优化建议：高 OD 但无直达
const tips = suggestLineOptimization(records, directPairs, 1000);
```

## 数据模型

```ts
interface TransitStation { id: string; name: string; lng: number; lat: number; line?: string }
interface OdRecord { origin: string; dest: string; volume: number }
interface StationThroughput { stationId: string; board: number; alight: number }
```

## `TransitHeatmap`

| 成员 | 说明 |
|---|---|
| `new TransitHeatmap({ map, stations, layerPrefix? })` | 构造，`layerPrefix` 默认 `cg-transit` |
| `render(records)` | 渲染站点热力 + OD 连线，返回 `OdAggregation` |
| `renderStations(agg)` | 仅渲染站点热力点（半径/颜色按吞吐归一化） |
| `renderOdLines(records, agg)` | 仅渲染 OD 连线（线宽/颜色按流量归一化） |
| `renderPredicted(records, predicted)` | 用预测 OD 权重重绘（紫色区分） |
| `destroy()` | 清除图层并释放 |

渲染幂等：内部复用 `upsertSource`，重复调用不会抛 `Source already exists`。

## 纯函数（`@caoguo/maplibre-transport/transit`）

### `aggregateOd(records)`

```ts
function aggregateOd(records: OdRecord[]): OdAggregation
// → { throughput, odWeights, maxOd, maxThroughput }
```

`throughput[stationId]` 含 `board`（作为起点的量）与 `alight`（作为终点的量）；`odWeights` 的 key 由 `odKey(origin, dest)` 生成（`` `${origin}->${dest}` ``）。

### `predictOd(odWeights, growthRate = 0.1, confidence = 0.8)`

```ts
function predictOd(
  odWeights: Record<string, number>,
  growthRate?: number,
  confidence?: number
): { odWeights: Record<string, number>; growthRate: number; confidence: number }
```

按增长率线性外推（四舍五入取整），`confidence` 为调用方给定的置信度标注，不参与计算。

### `suggestLineOptimization(records, directPairs?, threshold = 1000)`

```ts
function suggestLineOptimization(
  records: OdRecord[],
  directPairs: Set<string> = new Set(),
  threshold?: number
): LineOptimizationSuggestion[]
// → [{ from, to, unservedVolume, suggestion }]
```

找出「累计客流 ≥ threshold 且不在 `directPairs` 直达集合中」的站点对，输出中文建议文案。`directPairs` 用 `odKey()` 生成的 key。

### `odKey(origin, dest)`

生成 OD 对的统一 key，用于 `odWeights` 索引与 `directPairs` 集合。
