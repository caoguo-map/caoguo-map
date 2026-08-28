# 水网运营扩展 API

> 隶属 `@caoguo/maplibre-water` 包。来源：`packages/water/src/river/`、`packages/water/src/dam/`
> PRD：`prd/phase-2-grid-water.md` §4.1（R-2 / R-5）、§4.3（DO-4 / DO-5）

水网运营四件套：水库卡片、站点实时指标、多方案对比、调度甘特图。

---

## R-2 水库 / 闸站卡片

```ts
import { getReservoirDetail, getReservoirDetails, storageLevelOf } from '@caoguo/maplibre-water';

const detail = getReservoirDetail(dataset, 'res-1');
// detail.cardInfo → { title, subtitle, statusLabel, storageLabel, capacityLabel, levelLabel, overWarning, images, maintenance }
// detail.storageLevel → 'low' | 'normal' | 'high' | 'full'
// detail.upstreamCount / downstreamIds / siblingCount

// 面板批量（默认水库+闸站）
const all = getReservoirDetails(dataset);
const overWarning = all.filter((d) => d.cardInfo.overWarning);
```

- 蓄水率分档：`storageLevelOf(rate)` —— `≤0.3` low / `≥0.9` full / `≥0.7` high / 其余 normal（与 §4.3.4 蓄泄判定一致）。
- `overWarning`：`waterLevel > warningLevel` 时为 true。
- 图片与维护记录从 `properties.extra` 读取（`{ images, maintenance }`，跨包统一口径见 `@caoguo/maplibre` `readCardFields`）。
- 渲染外壳：`river.renderReservoirCardHtml(featureId)` 直接返回卡片 HTML（超警戒红色强调条）。

## R-5 站点实时指标

```ts
import { parseWaterMessage, applyMetricPatch, stationSummary, rainfallLevelOf } from '@caoguo/maplibre-water';

// 1) 解析（精简键 f/wl/rf/fr/ts 或完整键 featureId/waterLevel/…）
const patch = parseWaterMessage('{"f":"st-1","wl":28.1,"rf":12}');

// 2) 应用 + 重绘（RiverSystem 实例方法）
river.updateStationMetrics([patch!]);

// 3) 渲染叠加层：按降雨等级着色，超警戒红色高亮
river.renderStationMetrics();
river.clearStationMetrics();

// 4) 值守汇总
river.stationSummary(); // { total, overWarning, maxRainfall }
```

| 导出 | 说明 |
|---|---|
| `parseWaterMessage(raw)` | 容错解析，非法返回 `null` |
| `applyMetricPatch(feature, patch)` | 纯函数返回新要素，不改入参 |
| `isOverWarning(feature)` | 水位 > 警戒水位 |
| `rainfallLevelOf(mm)` | `none/light/moderate/heavy/torrential`（中国气象降水量等级） |
| `RAINFALL_COLORS` | 分级配色（渲染层与图例共用） |
| `stationSummary(features, kinds?)` | `{ total, overWarning, maxRainfall }` |

> 传输层（WebSocket / MQTT / 轮询）由调用方决定，本模块只做解析与应用 —— 与电网 `grid/realtime` 同构。

## DO-4 多方案对比

```ts
import { compareDamSchedules } from '@caoguo/maplibre-water';

const cmp = compareDamSchedules(
  dataset,
  [
    { name: '现状', outflows: {} },
    { name: '加大泄洪', outflows: { 'res-1': 50 } },
    { name: '蓄水保水', outflows: { 'res-1': -20 } },
  ],
  'minDownstreamChange' // 或 'maxStorageGain'
);

cmp.matrix.storageRate['res-1']; // [现状, 泄洪, 保水] 各方案蓄水率
cmp.matrix.levelChange['ws-1'];  // 水位站扰动
cmp.ranking;                     // 排序后的方案（优→劣），口径由调用方选择
```

> 排名口径二选一：`minDownstreamChange`（下游扰动绝对值之和最小）/ `maxStorageGain`（蓄水改善最大）。**不自动宣布"最优方案"**。

## DO-5 调度甘特图

```ts
import { simulateDamTimeline, buildDamGantt } from '@caoguo/maplibre-water';

const tl = simulateDamTimeline(dataset, { outflows: { 'res-1': 80 } }, { steps: 24, stepMinutes: 60 });
// tl.series['res-1'] → [{ step, elapsedMin, storageRate, status }] × 25

const rows = buildDamGantt(tl);
// rows[i].segments → [{ status, fromStep, toStep, fromMin, toMin }]
// 段并集覆盖全部时间步，可直接映射为任意甘特组件的行/区间
```

蓄水率钳制在 `[0,1]`；状态分档沿用 `reservoirStatus()`（`≥0.9` discharging / `≤0.3` storing）。

## 相关

- 闸站渲染与推演主入口：`DamOperation` / `DamRender`（PRD §4.3，见包 README §dam）
- 下游水位推演模型与适用边界：PRD §4.3.4（简化模型，不可用于正式防汛决策）
