# CapacityHeatmap 容量热力图

> 隶属 `@caoguo/maplibre-telecom` 包。来源：`packages/telecom/src/capacity/`
> PRD：`prd/phase-2-telecom.md`（CH-1～CH-4）

把基站的**容量利用率 / 用户负载**渲染为 maplibre 热力图，并按阈值输出超载预警，补齐通信网「覆盖—健康—容量」三视图。

---

## 快速用法

```ts
import { Map } from '@caoguo/maplibre';
import { CapacityHeatmap, stationCapacityStats, capacityAlerts } from '@caoguo/maplibre-telecom';

const map = new Map({ container, style, center: [114.31, 30.58], zoom: 11 });

const ch = new CapacityHeatmap({ map, dataset });
ch.render('utilization'); // 'utilization' | 'userLoad'
ch.renderAlerts(0.8);     // 超载基站高亮

const summary = stationCapacityStats(dataset.baseStations);
console.log(summary.avgUtilization, summary.overloadedCount);
```

> 容量利用率 = `properties.throughputMbps / properties.capacityMbps`；
> 用户负载 = `properties.userCount / properties.capacityUserCount`。
> 两个额定容量字段（`capacityMbps` / `capacityUserCount`）缺失时对应指标为 `undefined`。

## `CapacityHeatmap`

| 成员 | 说明 |
|---|---|
| `new CapacityHeatmap({ map, dataset, layerPrefix? })` | 构造，`layerPrefix` 默认 `cg-capacity` |
| `render(kind?)` | 渲染热力图，`kind` 为 `'utilization'`（默认）或 `'userLoad'` |
| `renderAlerts(threshold = 0.8)` | 叠加超载基站标记图层 |
| `clear()` | 清除本组件创建的图层 |
| `destroy()` | 清除并释放 |

## 纯函数（`@caoguo/maplibre-telecom/capacity`）

### `stationCapacityStat(station)`

```ts
function stationCapacityStat(station: BaseStation): StationCapacityStat
// → { id, name, utilization?: number, userLoad?: number, overloaded: boolean }
```

`utilization > 0.8` 判定为 `overloaded`。

### `stationCapacityStats(stations)`

```ts
function stationCapacityStats(stations: BaseStation[]): CapacitySummary
// → { total, withCapacity, avgUtilization, overloadedCount, overloadedStations }
```

### `capacityAlerts(stations, thresholds?)`

```ts
function capacityAlerts(
  stations: BaseStation[],
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
): CapacityAlert[]
```

默认阈值：critical 0.95 / warning 0.85 / info 0.80。仅返回利用率 ≥ info 阈值的基站，按利用率降序。

配套：`alertSeveritySummary(alerts)` → `{ critical, warning, info }` 计数。

### `topOverloadedStations(stations, n, threshold = 0.8)`

按利用率降序取 Top N 超载基站。

### `capacityUtilizationPoints(stations, kind)`

生成热力图点集 GeoJSON（`FeatureCollection`，`weight` 按利用率或用户负载），渲染层内部调用，也可用于自定义图层。

## 类型

| 类型 | 说明 |
|---|---|
| `CapacityWeight` | `'utilization' \| 'userLoad'` |
| `StationCapacityStat` | 单站容量统计 |
| `CapacitySummary` | 全网汇总 |
| `CapacityAlert` / `AlertSeverity` / `AlertThresholds` | 预警相关 |
