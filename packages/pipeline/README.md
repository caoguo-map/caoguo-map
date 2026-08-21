# @caoguo/maplibre-pipeline

> 草果地图管网组件包 — 爆管推演 / 泄漏扩散 / 健康评估 / 拓扑编辑器

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre-pipeline.svg)](https://www.npmjs.com/package/@caoguo/maplibre-pipeline)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre-pipeline.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre-pipeline
```

Peer：`maplibre-gl@^4.7.1`。
依赖：`@caoguo/maplibre`、`@caoguo/theme`。

## 功能模块

| 模块 | 导出名 | 说明 |
|------|--------|------|
| 图算法 | `bfs` / `dfs` / `shortestPath` / `adjacency` / `connectivity` | 邻接表、BFS/DFS、最短路径、连通性、上游阀门查找 |
| 拓扑 | `PipelineTopology` | 管网拓扑编辑器（5 级钻取 + 上下游追踪） |
| 爆管 | `BurstSimulator` | 爆管推演（影响范围 + 隔离阀定位） |
| 泄漏 | `LeakagePlume` | 高斯烟羽 + Pasquill-Gifford 扩散 + 洪水淹没 |
| 健康 | `PipelineHealth` | 多维加权评分（管龄/材质/压力/历史）+ 热力图 |
| NLPG | `pipelineNlp` / `pipelineNlpClass` | 管网查询意图识别 |
| 样式 | `PIPELINE_TYPE_COLORS` / `healthLevel` / `pipelineLegend` | 管网专用配色 |
| 数据 | `Node` / `Pipe` / `User` / `TopologyDataset` | 数据模型 |

## 快速开始

### 爆管推演

```ts
import { BurstSimulator, burstClass } from '@caoguo/maplibre-pipeline/burst';

const sim = new BurstSimulator({
  dataset,           // TopologyDataset
  burstNodeId: 'N123',
  maxAffectedRadius: 500,  // 米
});
const result = sim.simulate();
console.log('影响节点数', result.affectedNodes.length);
console.log('应关阀门', result.valvesToClose);
```

### 泄漏扩散

```ts
import { LeakagePlume, gaussianPlume } from '@caoguo/maplibre-pipeline/leakage';

const plume = new LeakagePlume({
  source: { lng: 114.3, lat: 30.6, heightMeters: 2 },
  wind: { speedMps: 3, directionDeg: 45 },
  stabilityClass: 'D', // Pasquill-Gifford
});
const contour = plume.simulate(3600); // 1 小时后的等浓度线
```

### 管线健康评分

```ts
import { PipelineHealth } from '@caoguo/maplibre-pipeline/health';

const health = new PipelineHealth({ dataset });
const score = health.evaluate('P-001'); // 单管
console.log(score.total, score.explain());
```

### 拓扑编辑器（与 @caoguo/maplibre 配合）

```ts
import { Map } from '@caoguo/maplibre';
import { PipelineTopology } from '@caoguo/maplibre-pipeline/topology';

const map = new Map({ container: 'map' });
const topo = new PipelineTopology(map.instance, { dataset });
topo.mount();
```

## 子入口

包内提供 ESM 子路径入口，按需引入更轻：

```ts
import { bfs } from '@caoguo/maplibre-pipeline/graph';
import { healthLevel } from '@caoguo/maplibre-pipeline/style';
import { pipelineNlp } from '@caoguo/maplibre-pipeline/nlpg';
```

可用子路径：`./graph`、`./topology`、`./burst`、`./leakage`、`./health`、`./nlpg`、`./style`、`./types`。

## 设计原则

1. **算法纯函数 + 渲染薄壳**：所有算法可在 Node 环境单测。
2. **可插拔**：每个组件独立可用，也可组合。
3. **离线友好**：所有计算在前端完成。
4. **可解释**：所有评分/推演结果附 `explain()`。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- 核心算法模块可在 Node.js 测试（已含 54 个 vitest 用例）

## 许可

Apache-2.0