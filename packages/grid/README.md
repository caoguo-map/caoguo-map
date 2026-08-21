# @caoguo/maplibre-grid

> 草果地图电网组件包 — 停电分析 / 负荷热力 / 拓扑钻取 / 供电路径追踪

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre-grid.svg)](https://www.npmjs.com/package/@caoguo/maplibre-grid)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre-grid.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre-grid
```

Peer：`maplibre-gl@^4.7.1`。

## 功能模块

| 模块 | 导出 | 说明 |
|------|------|------|
| 拓扑 | `GridTopology` | 电网拓扑浏览器（5 级钻取 + 供电路径追踪） |
| 停电分析 | `OutageAnalyzer` (outageClass) | 停电影响分析（下游遍历 + 用户统计 + 备用路径推荐） |
| 负荷 | `LoadHeatmap` (loadClass) | 负荷热力图（负荷率着色 + 过载预警 + 负荷预测） |
| 图算法 | `gridGraph` | 邻接表、BFS 方向遍历 |
| 样式 | `gridTheme` / `GRID_VOLTAGE_COLORS` / `gridLegend` | 电压等级/状态/负荷/年份配色 |
| 数据 | `GridDevice` / `GridLine` / `GridUser` / `GridTopologyDataset` | 数据模型 |

## 快速开始

### 停电影响分析

```ts
import { OutageAnalyzer } from '@caoguo/maplibre-grid/outage';

const analyzer = new OutageAnalyzer({ dataset });
const result = analyzer.analyze({
  deviceId: 'TX-013',    // 变压器 ID
  reason: 'maintenance',
});

console.log('影响用户数', result.affectedUserCount);
console.log('恢复步骤', result.recoverySteps);
console.log('备用路径', result.backupPaths);
```

### 负荷热力

```ts
import { LoadHeatmap } from '@caoguo/maplibre-grid/load';

const heatmap = new LoadHeatmap({ dataset });
const layer = heatmap.render({
  metric: 'loadRate',     // 负荷率
  threshold: 0.8,         // 过载预警阈值
  forecast: true,         // 含未来 24h 预测
});
```

### 拓扑钻取

```ts
import { GridTopology } from '@caoguo/maplibre-grid/topology';

const topo = new GridTopology(map.instance, { dataset });
topo.on('drill', (e) => console.log('钻取至', e.deviceId));
topo.mount();
```

## 子入口

```
@caoguo/maplibre-grid/graph
@caoguo/maplibre-grid/topology
@caoguo/maplibre-grid/outage
@caoguo/maplibre-grid/load
@caoguo/maplibre-grid/style
@caoguo/maplibre-grid/types
```

## 设计原则

1. **算法纯函数**：停电分析、负荷预测、图遍历均为纯函数，可在 Node 测试。
2. **可插拔**：每个组件独立可用。
3. **离线友好**：所有计算在前端完成。
4. **可解释**：停电结果附受影响用户分类与恢复步骤。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- 核心算法在 Node.js 可测（已含 10 个 vitest 用例）

## 许可

Apache-2.0