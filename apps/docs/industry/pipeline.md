# 专题 · 地下管网（@caoguo/maplibre-pipeline）

管网是六张网的第一张：爆管关阀、泄漏扩散、健康评分、拓扑钻取四大场景，覆盖 PRD `phase-1-pipeline.md` 的 P-1~P-7 / B-1~B-7 / L-1~L-5 / H-1~H-5。

## 数据模型

一张 `PipelineTopologyDataset` 串起全部能力：

```ts
{
  nodes: [{ id, kind: 'junction'|'valve'|'pump'|'meter'|'source'|'tank'|'junction_box',
            lng, lat, pipelineType: 'gas'|'water'|'drainage'|'heating', properties }],
  pipes: [{ id, fromNode, toNode, type, pipelineType, properties }],
  users: [{ id, kind, lng, lat, severity? }],   // 重要用户（医院/学校）标注
}
```

## 四大场景速览

| 场景 | 入口 | 一句话 |
| --- | --- | --- |
| 拓扑编辑 | `PipelineTopology` | 渲染 + 5 级钻取 + 上下游追踪 + 搜索定位；数据层 `addNode/addPipe/removePipe` |
| 爆管推演 | `simulateBurst()` / `BurstSimulator` | 故障管段 → 双向关阀方案 → 下游受影响用户 → 影响面凸包 |
| 泄漏扩散 | `gaussianPlume()` / `LeakagePlume` | 高斯烟羽按风速/稳定度计算浓度场，动画播放 + 落地浓度叠加 |
| 健康评估 | `scorePipeHealth()` / `PipelineHealth` | 6 维加权评分（龄期/材质/土壤/历史/压力/防腐）+ 风险热力 + 维护优先级 |

## 快速上手：爆管关阀

```ts
import { simulateBurst } from '@caoguo/maplibre-pipeline'

const r = simulateBurst(dataset, 'p2', { scenario: 'water' })
r.valvePlan.closeValves    // 建议关闭的阀门（双向隔离）
r.affectedNodes            // 下游受影响节点
r.importantUsers           // 受影响的重要用户（按严重度）
```

配上组件类即可推演 + 渲染 + 历史回放一体：

```ts
import { BurstSimulator } from '@caoguo/maplibre-pipeline'

const sim = new BurstSimulator({ map, dataset })
sim.simulate('p2')          // 受影响区域已上图（hull/pipes/nodes 三层）
sim.historyEntries()        // B-7 推演历史（回放 restoreHistory(i)）
```

## 泄漏扩散 + 实时气象

```ts
import { LeakagePlume } from '@caoguo/maplibre-pipeline'

const leak = new LeakagePlume({ map, dataset })
leak.setWeatherProvider(async (loc) => fetch(`/api/weather?lat=${loc.lat}`).then(r => r.json()))
const obs = await leak.refreshWeather({ lat: 30.5, lng: 114.3 })
const wind = leak.windParamsFrom()      // → GasLeakParams 的风向（弧度）/风速（m/s）
```

气象单位换算（来向度数→弧度、蒲福风级→m/s）由包内 `normalizeWeather` 完成，业务侧不碰单位。

## 与其他能力联动

- **健康评分驱动维护**：`prioritizeMaintenance()` 输出待维护清单，配 `renderAssignmentPanelHtml` 风格面板；
- **NLPG 查询**：`parsePipelineQuery('江岸区哪些阀门需要检修')` → 结构化意图；
- **拓扑图算法**：`bfs` / `dijkstra` / `findUpstreamNode` / `detectCycles` 全部导出，可自行组装分析。

## 延伸阅读

- 设备/管段卡片、故障诊断等跨包扩展：《行业包扩展》
- 辉光管线示例：《管线辉光》
- 健康评分权重细节：包内 `health/healthScorer.ts`（6 维权重可配，默认和为 1）
