# 专题 · 交通网（@caoguo/maplibre-transport）

交通包覆盖 PRD `phase-3-transport-compute-telecom.md` 的 T-1~T-5（路网）/ TF-1~TF-4（交通流）/ IM-1~IM-5（事件响应）/ TNS-1~TNS-4（公交客流）。

## 数据模型

```ts
{
  nodes: [{ id, kind: 'intersection'|'toll'|'rest_area'|'parking'|..., lng, lat }],
  edges: [{ id, fromNode, toNode, roadClass: 'expressway'|'arterial'|..., freeFlowSpeed, ... }],
  speeds?: { [edgeId]: number },   // 实时速度（TF-1）
}
```

## 核心能力

| 场景 | 入口 | 说明 |
| --- | --- | --- |
| 路网 | `RoadNetwork` | 分级着色渲染 + Dijkstra/A* 路径规划 + 缓冲查询 + 设施标注 |
| 交通流 | `TrafficFlow` | 实时速度着色（TF-1）、拥堵传播动画（TF-2）、趋势（TF-3）、OD 矩阵（TF-4） |
| 拥堵预测 | `predictCongestion()` | 15/30/60 min 预测，含趋势项与置信度 |
| 事件响应 | `IncidentMap` / `analyzeIncident()` | 影响范围圆 + 附近救援资源 + 绕行路径 + 处置时间线 |
| 公交客流 | `TransitHeatmap` | OD 聚合热力 + 客流预测 + 线路优化建议（详见《公共交通客流 OD》） |

## 快速上手：路径规划

```ts
import { buildRoadAdjacency, aStar } from '@caoguo/maplibre-transport'

const adj = buildRoadAdjacency(dataset)
const r = aStar(adj, 'n00', 'n33', nodes)
r.path       // 节点序列
r.distance   // 总距离（m）
```

## 快速上手：事件响应

```ts
import { IncidentMap } from '@caoguo/maplibre-transport'

const im = new IncidentMap({ map, dataset })
im.renderIncident('edge-7', { severity: 'major' })   // 影响范围圆环上图
im.nearbyResources({ kinds: ['police', 'tow'] })     // 附近救援资源（按距离升序）
im.planDetour('edge-7')                              // 绕行路径（避开故障边）
```

## 拥堵预测与时间轴回放

```ts
const tf = new TrafficFlow({ map, dataset })
tf.renderRoadSpeed()                          // TF-1 实时速度着色层
tf.renderSpeedTimeline('14:00')               // T-4 拖动时间轴回放历史路况
tf.predictCongestion({ minutesAhead: 30 })    // T-5 未来路况（带置信度）
```

## 延伸阅读

- 客流 OD 聚合与线路优化：《公共交通客流 OD》
- 绕行与影响范围渲染细节：《行业包扩展》
