# @caoguo/maplibre-water

> 草果地图水网组件包 — 水系拓扑 / 洪水淹没 / 水库调度

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre-water.svg)](https://www.npmjs.com/package/@caoguo/maplibre-water)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre-water.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre-water
```

Peer：`maplibre-gl@^4.7.1`。

## 功能模块

| 模块 | 导出 | 说明 |
|------|------|------|
| 水系 | `RiverSystem` | 水系拓扑图（层级渲染 + 顺逆流钻取） |
| 淹没 | `FloodInundation` (floodCore) | 洪水淹没模拟（SCS-CN 降雨 + 推理公式 + flood fill） |
| 调度 | `DamOperation` (damCore) | 水库联合调度（泄量调整 + 下游水位推演） |
| 样式 | `waterTheme` / `WATER_FLOW_COLORS` / `waterLegend` | 流量/蓄水率/堤防安全配色 |
| 数据 | `WaterFeature` / `WaterDataset` / `FloodInput` | 数据模型 |

## 快速开始

### 洪水淹没模拟

```ts
import { FloodInundation } from '@caoguo/maplibre-water/flood';

const flood = new FloodInundation({
  rainfall: { mm: 200, durationHours: 24, returnPeriodYears: 50 },
  basin: { area: 1200, slope: 0.012, curveNumber: 78 },
});
const result = flood.simulate();
console.log('淹没范围', result.inundationPolygon);
console.log('峰值流量', result.peakDischarge);
```

### 水库联合调度

```ts
import { DamOperation } from '@caoguo/maplibre-water/dam';

const op = new DamOperation({ dams: [damA, damB, damC] });
const plan = op.optimize({
  targetDownstreamLevel: 65.5,
  forecastRainfall: 180,
});
console.log('各闸泄量', plan.releaseByDam);
```

### 水系浏览

```ts
import { RiverSystem } from '@caoguo/maplibre-water/river';

const river = new RiverSystem({ dataset });
river.render(map.instance);
```

## 子入口

```
@caoguo/maplibre-water/river
@caoguo/maplibre-water/flood
@caoguo/maplibre-water/dam
@caoguo/maplibre-water/style
@caoguo/maplibre-water/types
```

## 设计原则

1. **算法纯函数**：水文模型、淹没模拟、调度推演均为纯函数。
2. **可插拔**：每个组件独立可用。
3. **离线友好**：所有计算在前端完成。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- 核心算法在 Node.js 可测（已含 17 个 vitest 用例）

## 许可

Apache-2.0