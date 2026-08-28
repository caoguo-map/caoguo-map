# 行业包扩展 API（卡片 / 诊断 / 分配 / 绕行）

> 2026-08-28 落地的跨包扩展能力汇总。分属 `@caoguo/maplibre`、`@caoguo/maplibre-telecom`、`@caoguo/maplibre-compute`、`@caoguo/maplibre-transport`。

---

## 一、设备卡片外壳（三张网共用）

> 隶属 `@caoguo/maplibre`。来源：`src/cardFields.ts`
> PRD：G-2（电网）/ P-3（管网）/ R-2（水网）

```ts
import { readCardFields, renderCardHtml } from '@caoguo/maplibre';
```

### 数据解析（统一从 `properties.extra` 读取，不改数据模型）

| 导出 | 说明 |
|---|---|
| `readImages(extra)` | 图片 URL 列表（过滤非字符串） |
| `readMaintenance(extra)` | 维护记录（逐条校验，缺 date/type 丢弃） |
| `readCardFields(extra)` | 一次性返回 `{ images, maintenance }` |
| `MaintenanceRecord` | `{ date, type, operator?, note? }` |

### HTML 外壳（零依赖）

```ts
const html = renderCardHtml(
  {
    title: '关山变电站',
    subtitle: '变电站 · SS-001',
    statusLabel: '运行中',
    statusColor: '#4ade80',
    rows: [{ label: '电压等级', value: '500 kV' }],
    images: [...],
    maintenance: [...],
    accentColor: undefined, // 超警戒等场景的强调条
  },
  { style: 'inline' } // 或 'class'（输出 cg-card__* 类名，注释附默认 CSS）
);
el.innerHTML = html; // 内容已做 HTML 转义，防注入
```

各业务包已封装好 detail → CardModel 的转换：

| 包 | 方法 |
|---|---|
| grid | `GridTopology.renderCardHtml(deviceId)` |
| pipeline | `PipelineTopology.renderNodeCardHtml(nodeId)` / `renderPipeCardHtml(pipeId)` |
| water | `RiverSystem.renderReservoirCardHtml(featureId)` |

## 二、通信网故障根因诊断（NH-4）

> 隶属 `@caoguo/maplibre-telecom`。来源：`src/health/faultDiagnosis.ts`

```ts
import { diagnoseFaultStation, diagnoseFaults } from '@caoguo/maplibre-telecom';

// 单站：返回全部命中因子 + 证据 + 置信度
const d = diagnoseFaultStation(station, { minThroughputMbps: 10 });
// d.reasons → [{ code, label, severity, evidence: '吞吐 5 Mbps < 阈值 10 Mbps' }]
// d.primary  → 严重度最高者；d.confidence → 0-1

// 批量：含区域聚集检测（同区域 ≥2 站故障 → cluster_outage，优先于单站指标）
const summary = diagnoseFaults(dataset.baseStations);
// summary.byReason / clusterRegions / details
```

- 因子编码：`low_throughput` / `user_overload` / `low_power` / `cluster_outage` / `unknown`。
- **全部阈值可配**（`FaultDiagnosisOptions`），默认值沿用旧 `guessFaultReason` 的口径。
- `NetworkHealth.guessFaultReason()` 保持兼容（返回主因文案），新增 `faultDiagnosis(stationId)` 与 `diagnoseFaults()`。

> 边界：基于基站实时属性的**规则诊断**，能回答"数据显示哪些指标异常"，不能替代运营商告警根因库与设备侧告警。

## 三、算力任务分配（C-4）

> 隶属 `@caoguo/maplibre-compute`。来源：`src/nodes/assignment.ts`

```ts
import { assignTask, assignTasks, nodeCapacity } from '@caoguo/maplibre-compute';

const r = assignTask(
  datasetNodes,
  { id: 'task-1', demandTflops: 500, lng: 114.3, lat: 30.5, region: '武昌' },
  'balanced' // 'balanced' | 'nearest' | 'capacity'
);
// r → { taskId, nodeId, utilizationBefore, utilizationAfter } 或 { reason: 'no-candidate' | 'insufficient-capacity' }
```

| 策略 | 口径 | 适用 |
|---|---|---|
| `balanced`（默认） | 剩余算力占比最大者优先 | 通用兜底，使利用率趋于均衡 |
| `nearest` | 距任务坐标最近（复用 `recommendBestNode`；无坐标退化为 balanced） | 延迟敏感 |
| `capacity` | 总算力最大 | 大任务 |

- 通用过滤：`region`（同区无候选时宽松跨区重试）/ `types` / offline 剔除。
- 纯函数**不回写数据集**；失败返回结构化 `reason`，不抛错。
- 计费、配额、租户隔离等真实业务规则应由上层业务系统实现。

## 四、交通绕行与影响范围渲染（IM-2/3/4）

> 隶属 `@caoguo/maplibre-transport`。来源：`src/incident/detour.ts`、`src/incident/IncidentMap.ts`

```ts
import { detourToPolyline, circleRing } from '@caoguo/maplibre-transport';

incident.renderAll(inc);          // 一键：标记 + 影响范围 + 附近资源 + 绕行
incident.renderImpact(inc);       // 影响半径圆 + 受影响路段高亮
incident.renderNearbyResources(inc); // 摄像头/救援站/医院（三色区分）
incident.renderDetour(inc);       // 绕行折线（绿）
```

- `detourToPolyline(dataset, path)`：节点 id 序列 → 折线。优先复用路段 `geometry`（自动对齐遍历方向），缺失时退化直线。
- `circleRing(lng, lat, radiusM)`：影响半径圆的 GeoJSON ring。

## 相关

- 电网实时接入：`api/realtime-grid`（传输层接口，水网 R-5 与之同构）
- 水网运营：`api/water-ops`
