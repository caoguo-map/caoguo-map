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
import { BurstSimulator } from '@caoguo/maplibre-pipeline/burst';

// 构造需要地图实例与拓扑数据集
const sim = new BurstSimulator({ map: mapInstance, dataset });
// 对指定爆管管段推演：返回影响节点、应关闭阀门、受影响用户
const result = sim.simulate('P-001');
console.log('影响节点数', result.affectedNodes.length);
console.log('应关阀门', result.valvesToClose);
```

### 泄漏扩散（高斯烟羽 + 洪水淹没）

```ts
import { LeakagePlume } from '@caoguo/maplibre-pipeline/leakage';

const plume = new LeakagePlume({
  map: mapInstance,
  source: { lng: 114.3, lat: 30.6, heightMeters: 2 },
  wind: { speedMps: 3, directionDeg: 45 },
  stabilityClass: 'D', // Pasquill-Gifford 稳定度等级
});
// 推演 1 小时后等浓度线（高斯烟羽）或洪水淹没范围
const contour = plume.simulate({ seconds: 3600, mode: 'gaussian' });
```

### 管线健康评分

```ts
import { PipelineHealth } from '@caoguo/maplibre-pipeline/health';

const health = new PipelineHealth({ dataset });
const report = health.evaluate('P-001'); // 单管多维加权评分
console.log('综合得分', report.score.total, '等级', report.score.level);
// 维度明细
for (const d of report.factors) console.log(d.dimension, d.weight, d.value);
```

### 自然语言查询 + 爆管联动

```ts
import { PipelineNlp } from '@caoguo/maplibre-pipeline/nlpg';
import { BurstSimulator } from '@caoguo/maplibre-pipeline/burst';

const nlp = new PipelineNlp({
  burstSimulator: new BurstSimulator({ map: mapInstance, dataset }),
  dataset,
});
// 识别为爆管意图时自动联动推演并缓存结果
const res = nlp.query('朝阳门外大街燃气爆管');
console.log('意图', res.intent);              // 'burst'
console.log('推演结果', nlp.getLastBurst());  // { affectedNodes, valvesToClose, affectedUsers }
```

### 上游隔离阀查找（纯函数）

```ts
import { findUpstreamNode, buildAdjacency } from '@caoguo/maplibre-pipeline/graph';

const adj = buildAdjacency(dataset);
const valve = findUpstreamNode(adj, 'P-001', dataset, (n) => n.kind === 'valve');
console.log('应关闭的上游阀门', valve?.id);
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
import { PipelineNlp, pipelineNlp } from '@caoguo/maplibre-pipeline/nlpg';
```

可用子路径：`./graph`、`./topology`、`./burst`、`./leakage`、`./health`、`./nlpg`、`./style`、`./types`。

## 设计原则

1. **算法纯函数 + 渲染薄壳**：所有算法可在 Node 环境单测。
2. **可插拔**：每个组件独立可用，也可组合（如 Topology + Burst + Health）。
3. **离线友好**：所有计算在前端完成，无需后端依赖（Phase 1 MVP 离线优先）。
4. **可解释**：评分/推演结果结构包含各维度明细，便于逐维追溯到依据。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- 核心算法模块可在 Node.js 测试（已含 71 个 vitest 用例）

## 许可

Apache-2.0