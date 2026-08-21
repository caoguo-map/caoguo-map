# @caoguo/maplibre-compute

> 草果地图算力网组件包 — 数据中心 / 边缘节点 / 光缆路由 / 延迟热力 / 供需预测

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre-compute.svg)](https://www.npmjs.com/package/@caoguo/maplibre-compute)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre-compute.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre-compute
```

Peer：`maplibre-gl@^4.7.1`。

## 功能模块

| 模块 | 导出 | 说明 |
|------|------|------|
| 节点 | `ComputeNodes` | 数据中心/边缘节点地图 + 光缆路由可视化 |
| 延迟 | `LatencyMap` | 延迟热力 + 最优接入推荐 + 告警 |
| 预测 | `supplyDemand` | 算力供需预测（缺口分析） |
| NLPG | `computeNlp` | 算力查询意图识别 |
| 图算法 | 图邻接表 + 最低延迟路径 + 路由分析 + 最优接入 | |
| 样式 | `computeTheme` / `COMPUTE_GPU_COLORS` / `computeLegend` | GPU 利用率/光缆利用率配色 |
| 数据 | `ComputeNode` / `FiberLink` / `LatencyRecord` | 数据模型 |

## 快速开始

### 延迟热力 + 最优接入

```ts
import { LatencyMap } from '@caoguo/maplibre-compute/latency';

const lm = new LatencyMap({ dataset, userLocation: { lng: 114.3, lat: 30.6 } });
const result = lm.findOptimalEdge({ maxLatencyMs: 20 });
console.log('推荐边缘节点', result.recommended);
console.log('预估延迟', result.estimatedLatencyMs);
```

### 供需预测

```ts
import { supplyDemand } from '@caoguo/maplibre-compute/predict';

const forecast = supplyDemand.forecast({
  historyDays: 30,
  horizonDays: 7,
});
console.log('未来 7 天 GPU 缺口', forecast.gapByDay);
```

### 节点地图

```ts
import { ComputeNodes } from '@caoguo/maplibre-compute/nodes';

const nodes = new ComputeNodes({ dataset });
nodes.render(map.instance);
```

## 子入口

```
@caoguo/maplibre-compute/graph
@caoguo/maplibre-compute/nodes
@caoguo/maplibre-compute/latency
@caoguo/maplibre-compute/predict
@caoguo/maplibre-compute/nlpg
@caoguo/maplibre-compute/style
@caoguo/maplibre-compute/types
```

## 设计原则

1. **算法纯函数**：供需预测、延迟分析、路由分析均为纯函数。
2. **可插拔**：每个组件独立可用。
3. **离线友好**：所有计算在前端完成。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- 核心算法在 Node.js 可测（已含 8 个 vitest 用例）

## 许可

Apache-2.0