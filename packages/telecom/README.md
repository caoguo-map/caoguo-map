# @caoguo/maplibre-telecom

> 草果地图通信网组件包 — 基站覆盖 / 信号热力 / 网络健康 / 盲区识别

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre-telecom.svg)](https://www.npmjs.com/package/@caoguo/maplibre-telecom)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre-telecom.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre-telecom
```

Peer：`maplibre-gl@^4.7.1`。

## 功能模块

| 模块 | 导出 | 说明 |
|------|------|------|
| 覆盖 | `CellCoverage` (coverageCore) | 基站覆盖地图 + 盲区识别 + 扇区可视化 |
| 健康 | `NetworkHealth` | 网络健康度（在线率/告警/故障趋势） |
| NLPG | `telecomNlp` | 通信查询意图识别 |
| 样式 | `telecomTheme` / `TELECOM_OPERATOR_COLORS` / `telecomLegend` | 运营商/信号热力/品牌主题 |
| 数据 | `BaseStation` / `CoverageArea` / `SignalSample` | 数据模型 |

## 快速开始

### 基站覆盖 + 盲区识别

```ts
import { CellCoverage } from '@caoguo/maplibre-telecom/coverage';

const coverage = new CellCoverage({ dataset });
const result = coverage.analyze();
console.log('总覆盖面积 km²', result.totalAreaKm2);
console.log('盲区数', result.deadZones.length);
```

### 网络健康度

```ts
import { NetworkHealth } from '@caoguo/maplibre-telecom/health';

const health = new NetworkHealth({ dataset });
const status = health.evaluate({ stationId: 'BS-0142' });
console.log('在线率', status.onlineRate);
console.log('近 7 天告警', status.alertsLast7d);
```

### NLPG 查询意图识别

```ts
import { telecomNlp } from '@caoguo/maplibre-telecom/nlpg';

const intent = telecomNlp.recognize('汉口火车站附近 5G 信号怎么样');
console.log(intent.intent, intent.entities);
```

## 子入口

```
@caoguo/maplibre-telecom/coverage
@caoguo/maplibre-telecom/health
@caoguo/maplibre-telecom/nlpg
@caoguo/maplibre-telecom/style
@caoguo/maplibre-telecom/types
```

## 设计原则

1. **算法纯函数**：覆盖分析、盲区识别、重叠率均为纯函数。
2. **可插拔**：每个组件独立可用。
3. **离线友好**：所有计算在前端完成。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- 核心算法在 Node.js 可测（已含 11 个 vitest 用例）

## 许可

Apache-2.0