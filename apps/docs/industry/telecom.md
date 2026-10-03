# 专题 · 通信网（@caoguo/maplibre-telecom）

通信包覆盖 PRD `phase-3-transport-compute-telecom.md` 的 CC-1~CC-5（覆盖）/ NH-1~NH-4（健康）/ TS-1~TS-4（拓扑）、`phase-2-telecom.md` 的 CH-1~CH-4（容量热力），以及运营商品牌化大屏（§5.3）。

## 数据模型

```ts
{
  stations: [{ id, carrier: 'mobile'|'unicom'|'telecom', technology: '5G'|'4G'|...,
               lng, lat, status: 'online'|'fault'|'offline',
               coverageAreas: [...], properties: { rsrp, load, ... } }],
  users?, ...
}
```

## 核心能力

| 场景 | 入口 | 说明 |
| --- | --- | --- |
| 覆盖地图 | `CellCoverage` | 基站 + 扇区瓣渲染、按 RSRP 信号着色 |
| 盲区识别 | `detectCoverageGaps()` | 路测样本 → 无覆盖/弱覆盖区域（CC-4） |
| 网络健康 | `NetworkHealth` | 在线率统计（NH-1）、告警分布（NH-2）、故障趋势（NH-3）、根因诊断（NH-4） |
| 容量热力 | `CapacityHeatmap` | 容量利用率 + 预警（详见《容量热力图》） |
| 品牌大屏 | `buildCarrierThemeStyle()` / `CARRIER_THEMES` | 运营商主题样式（移动/联通/电信配色） |

## 快速上手：盲区识别

```ts
import { detectCoverageGaps } from '@caoguo/maplibre-telecom'

const gaps = detectCoverageGaps(
  [{ lng: 114.4, lat: 30.6, rsrp: -120 }],   // 路测样本（-120 视为无覆盖）
  topology.coverageAreas,
)
gaps[0].level   // 'none' | 'weak' | 'good'
```

## 快速上手：网络健康

```ts
import { NetworkHealth } from '@caoguo/maplibre-telecom'

const nh = new NetworkHealth({ dataset })
nh.onlineRate({ groupBy: 'carrier' })   // NH-1 按运营商分组在线率
nh.checkAlerts()                        // NH-2 故障基站告警
nh.faultTrend(records, 'day')           // NH-3 故障趋势（day=UTC 日 / month=UTC 月 / week=epoch 周序号）
nh.diagnose('bs-3')                     // NH-4 多因子根因诊断（规则版，非替代告警库）
```

## 扇区与拓扑

- `buildSectors()` / `buildSectorFans()`：按方位角/半功率角生成扇区瓣多边形，直接可渲染；
- `findNeighborStations()` / `stationCentrality()`：邻站分析与中心度（TS 系列）；
- `pointInPolygon`：样本落覆盖区判定（被 CC/TS 两类能力依赖的基础几何）。

## 延伸阅读

- 容量热力与预警：《容量热力图》
- 故障诊断 API：《行业包扩展》
