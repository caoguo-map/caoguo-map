# 专题 · 算力网（@caoguo/maplibre-compute）

算力包覆盖 PRD `phase-3-transport-compute-telecom.md` 的 C-1~C-5（节点/路由/分配/预测）与 LM-1~LM-4（延迟热力）。

## 数据模型

```ts
{
  nodes: [{ id, kind: 'datacenter'|'edge_node'|'cloud_region', lng, lat,
            properties: { gpuUtilization, status: 'online'|'offline'|'maintenance', ... } }],
  links: [{ id, fromNode, toNode, kind: 'fiber'|'microwave'|'satellite',
            bandwidthGbps, properties: { latencyMs } }],
}
```

## 核心能力

| 场景 | 入口 | 说明 |
| --- | --- | --- |
| 节点地图 | `ComputeNodes` | 节点 + 光缆路由渲染，按类型/利用率/状态着色 |
| 光缆路由 | `FiberRoute` / `lowestLatencyPath()` | 两点间最低时延路径；`findRoutes()` 多候选 |
| 最优接入 | `recommendBestNode()` | 就近在线节点推荐 |
| 延迟热力 | `LatencyMap` | IDW 插值等值线 + 最优接入 + 趋势 + 阈值告警（LM-4） |
| 供需预测 | `predictSupplyDemand()` | 按区域识别供需缺口（详见《算力供需预测》） |
| 任务分配 | `assignTask(s)` | 三策略（balanced/nearest/capacity）+ 结构化失败原因 |

## 快速上手：延迟热力与告警

```ts
import { LatencyMap, latencyLevel } from '@caoguo/maplibre-compute'

const lm = new LatencyMap({ map, dataset, thresholdMs: 50 })
lm.checkAlerts()      // 超阈值链路告警（严格大于；超 2 倍阈值 → critical）
lm.recommendBestNode(114.3, 30.5)   // 用户位置 → 最优接入节点
```

延迟分级：≤10ms excellent / ≤30 good / ≤60 fair / 其余 poor。

## 快速上手：任务分配

```ts
import { assignTasks } from '@caoguo/maplibre-compute'

const results = assignTasks(dataset, tasks, { strategy: 'balanced' })
// 每个任务返回节点或失败原因（no-candidate / insufficient-capacity），不抛错
```

策略可插拔：`balanced`（剩余算力占比最大，通用兜底）/ `nearest`（就近）/ `capacity`（总算力最大，大任务场景）。计费、配额、租户隔离等真实业务规则由上层系统实现。

## 快速上手：供需预测

```ts
import { predictSupplyDemand } from '@caoguo/maplibre-compute'

const gaps = predictSupplyDemand(topology, { daysAhead: 7, growthRate: 0.05 })
gaps.filter((g) => g.isGap)   // 供需缺口区域
```

## 延伸阅读

- 供需预测 API 细节：《算力供需预测》
- 调度面板 / 节点详情卡片：《行业包扩展》
