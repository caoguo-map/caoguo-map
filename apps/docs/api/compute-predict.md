# 算力供需预测

> 隶属 `@caoguo/maplibre-compute` 包。来源：`packages/compute/src/predict/`
> PRD：`prd/phase-3-transport-compute-telecom.md §4.1.2 C-5`

按区域聚合并预测算力利用率，输出未来 N 天的**缺口区域**与缺口等级。纯函数，无地图依赖。

---

## 快速用法

```ts
import { predictSupplyDemand } from '@caoguo/maplibre-compute';

const gaps = predictSupplyDemand(dataset, {
  daysAhead: 7,
  growthRate: 0.05,
  gapThreshold: 0.8,
});

for (const g of gaps) {
  console.log(g.region, g.currentUtilization, g.predictedUtilization, g.gapLevel);
}
```

## `predictSupplyDemand(dataset, opts?)`

```ts
function predictSupplyDemand(
  dataset: ComputeTopologyDataset,
  opts?: SupplyDemandOptions
): ComputeGap[]
```

### `SupplyDemandOptions`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `daysAhead` | `number` | `7` | 预测天数 |
| `growthRate` | `number` | `0.05` | 每日增长率（0.05 = 每天 +5%） |
| `gapThreshold` | `number` | `0.8` | 判定为缺口的利用率阈值 |

### `ComputeGap`

| 字段 | 类型 | 说明 |
|---|---|---|
| `region` | `string` | 区域名（取 `node.properties.region`，缺失为 `'default'`） |
| `currentUtilization` | `number` | 当前区域平均 GPU 利用率（0-1） |
| `predictedUtilization` | `number` | 预测利用率（复合增长，上限 1） |
| `isGap` | `boolean` | 预测利用率是否超过阈值 |
| `gapLevel` | `'none' \| 'low' \| 'medium' \| 'high'` | 缺口等级 |

## 计算口径

1. **区域聚合**：按 `properties.region` 分组，取组内 `gpuUtilization` 的平均值。
2. **复合增长**：`predicted = min(1, current × (1 + growthRate) ^ daysAhead)`。
3. **缺口分级**：`> 0.95` high / `> 0.88` medium / 超过阈值 low / 否则 none。

> 简化时间序列模型，用于趋势演示与容量预警，**不替代专业容量规划工具**。

## 相关

- 节点分布与光缆路由：`ComputeNodes` / `FiberRoute`（PRD C-1、C-3）
- 延迟热力与最优接入：`LatencyMap`（PRD LM-1～LM-4）
