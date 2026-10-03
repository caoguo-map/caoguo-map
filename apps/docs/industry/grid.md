# 专题 · 电网（@caoguo/maplibre-grid）

电网包覆盖 PRD `phase-2-grid-water.md` 的 G-1~G-6（拓扑）/ O-1~O-7（停电分析）/ LH-1~LH-5（负荷与实时），外加三维变电站（G-6）。

## 数据模型

```ts
{
  devices: [{ id, kind: 'plant'|'substation'|'transformer'|'switch'|...,
              lng, lat, properties: { voltage: '220', loadRate: 0.9, ... } }],
  lines:  [{ id, fromDevice, toDevice, ... }],
  users:  [{ id, name, kind: 'important'|..., lng, lat }],
}
```

## 核心能力

| 场景 | 入口 | 说明 |
| --- | --- | --- |
| 拓扑钻取 | `GridTopology` | 5 级钻取（电厂→变电站→…→用户）+ 供电路径追踪 + 设备卡片 |
| 停电分析 | `analyzeOutage()` / `OutageAnalyzer` | 故障设备 → 下游失电范围 → 受影响用户（含重要用户）→ 影响面 |
| 负荷监测 | `LoadHeatmap` / `predictLoad()` | 负荷率着色 + 过载预警 + 线性预测；`overloadedDevices()` 一键列出 |
| 实时接入 | `GridRealtime` + `WsTransport` | 传输层接口 + WebSocket 实现（详见《电网实时数据》） |
| 三维站 | `Station3D` | 变电站三维模型 + 视角切换（详见《三维变电站》） |

## 快速上手：停电影响分析

```ts
import { analyzeOutage, predictLoad, overloadedDevices } from '@caoguo/maplibre-grid'

// 变电站故障 → 下游失电
const r = analyzeOutage(dataset, 'sub-a')
r.affectedUsers.total         // 失电用户数
r.affectedUsers.important     // 其中的医院/学校等重点用户

// 负荷预测与过载
const fc = predictLoad(dataset.devices[0], { minutesAhead: 30 })
overloadedDevices(dataset.devices)   // 负荷率超过 OVERLOAD_THRESHOLD 的设备
```

## 电压分档着色

按电压等级自动配色（`VOLTAGE_LEVELS`：500/220/110/35/10 kV …），图例一键生成：

```ts
import { paintByVoltage, buildGridLegend } from '@caoguo/maplibre-grid'
```

## 延伸阅读

- 实时数据接入（传输层接口、WS 重连）：《电网实时数据》
- 三维变电站与视角预设：《三维变电站》
- 设备卡片字段扩展：《行业包扩展》
