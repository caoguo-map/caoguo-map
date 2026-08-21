# @caoguo/maplibre-transport

> 草果地图交通网组件包 — 路网 / 交通流 / 拥堵预测 / 事件响应

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre-transport.svg)](https://www.npmjs.com/package/@caoguo/maplibre-transport)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre-transport.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre-transport
```

Peer：`maplibre-gl@^4.7.1`。

## 功能模块

| 模块 | 导出 | 说明 |
|------|------|------|
| 路网 | `RoadNetwork` | 路网编辑器（图编辑 + 道路等级配色） |
| 交通流 | `TrafficFlow` (trafficCore) | 实时交通流 + 拥堵预测 |
| 事件 | `IncidentMap` (incidentCore) | 事件响应（影响范围 + 附近资源 + 绕行方案） |
| NLPG | `transportNlp` | 交通查询意图识别 |
| 图算法 | 图邻接表 + BFS + Dijkstra + 缓冲查询 | |
| 样式 | `transportTheme` / `ROAD_LEVEL_COLORS` / `transportLegend` | 道路等级/速度/状态/事件配色 |
| 数据 | `RoadNode` / `RoadEdge` / `Incident` / `RoadSpeedRecord` | 数据模型 |

## 快速开始

### 拥堵预测

```ts
import { TrafficFlow } from '@caoguo/maplibre-transport/traffic';

const flow = new TrafficFlow({ dataset });
const prediction = flow.predictCongestion({
  horizonMinutes: 30,
  edgeIds: ['E001', 'E002'],
});
console.log('30 分钟拥堵指数', prediction.byEdge);
```

### 事件响应

```ts
import { IncidentMap } from '@caoguo/maplibre-transport/incident';

const inc = new IncidentMap({ dataset });
const impact = inc.analyze({
  type: 'accident',
  location: { lng: 114.3, lat: 30.6 },
  severity: 3,
});
console.log('影响路段', impact.affectedRoads);
console.log('推荐绕行', impact.detour);
```

### NLPG 查询意图识别

```ts
import { transportNlp } from '@caoguo/maplibre-transport/nlpg';

const intent = transportNlp.recognize('查一下二环堵不堵');
console.log(intent.intent, intent.entities);
```

## 子入口

```
@caoguo/maplibre-transport/graph
@caoguo/maplibre-transport/road
@caoguo/maplibre-transport/traffic
@caoguo/maplibre-transport/incident
@caoguo/maplibre-transport/nlpg
@caoguo/maplibre-transport/style
@caoguo/maplibre-transport/types
```

## 设计原则

1. **算法纯函数**：拥堵预测、事件分析、图遍历均为纯函数。
2. **可插拔**：每个组件独立可用。
3. **离线友好**：所有计算在前端完成。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- 核心算法在 Node.js 可测（已含 19 个 vitest 用例）

## 许可

Apache-2.0