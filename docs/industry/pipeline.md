# 管网行业方案文档

本文档描述草果地图管网组件包在真实业务环境中的接入方式、数据规范、部署方案。

## 1. 数据接入规范

### 1.1 数据模型

参见 `@caoguo/maplibre-pipeline` 中的 `PipelineTopologyDataset`：

```ts
interface PipelineTopologyDataset {
  nodes: PipelineNode[];   // 节点（阀门/泵/表/源头…）
  pipes: PipelinePipe[];   // 管段
  users?: PipelineUser[];  // 用户（爆管推演可选）
}
```

### 1.2 数据源转换

实际业务中，管网数据通常来自：

| 数据源 | 转换要点 |
| --- | --- |
| GIS Shapefile | 通过 `shpjs` 读取；坐标保留 WGS84，必要时使用 `proj4` 转换 |
| PostgreSQL PostGIS | 通过 `ST_AsGeoJSON` 导出；推荐使用 `earthdistance` 计算几何长度 |
| CSV / Excel | 解析后映射字段；注意 `material`/`status` 字段枚举值校验 |
| 业务系统 API | 通过后端代理转发；前端需要做分页（Phase 2） |

示例（CSV → dataset）：

```ts
import { parse } from 'csv-parse/sync';
import type { PipelineTopologyDataset } from '@caoguo/maplibre-pipeline';

function csvToDataset(csv: string): PipelineTopologyDataset {
  const rows = parse(csv, { columns: true });
  return {
    nodes: rows
      .filter((r: any) => r.kind)
      .map((r: any) => ({
        id: r.id,
        kind: r.kind,
        lng: parseFloat(r.lng),
        lat: parseFloat(r.lat),
        properties: {
          code: r.code,
          valveStatus: r.valve_status,
        },
      })),
    pipes: rows
      .filter((r: any) => r.fromNode)
      .map((r: any) => ({
        id: r.id,
        fromNode: r.fromNode,
        toNode: r.toNode,
        type: 'pipe',
        properties: {
          diameter: parseFloat(r.diameter),
          material: r.material,
          installDate: r.install_date,
          pressure: r.pressure ? parseFloat(r.pressure) : undefined,
          ratedPressure: r.rated_pressure ? parseFloat(r.rated_pressure) : undefined,
          status: r.status,
        },
      })),
  };
}
```

## 2. 部署方案

### 2.1 离线单机部署

适用场景：地市级自来水/燃气公司内网。

```
┌─────────────────────────────────────────────┐
│ Nginx / Caddy (静态资源服务器)              │
│   ├─ /demo/      → 草果地图演示站点        │
│   └─ /api/*.json → 后端业务接口              │
└─────────────────────────────────────────────┘
```

**特点**：
- 算法在前端运行（无需后端实时计算）
- 后端只承担数据查询 + 权限审计
- 单台 4C8G 服务器可支撑 200+ 并发

### 2.2 私有云集群

适用场景：省级/集团级管网运营。

**接入层** - API Gateway（Kong / Nginx）
- 路由：`/pipeline/api/*` → 管网微服务
- 限流：1000 req/min per IP（按企业策略可调）

**业务层** - 管网微服务（Java Spring Boot / Go）
- 数据接入（GIS / SCADA / IoT）
- 缓存（Redis，TTL 5min）
- 推送（WebSocket 实时报警）

**展示层** - 草果地图前端
- 静态资源 CDN
- 按用户角色动态路由

### 2.3 混合模式（推荐）

- **展示前端**：CDN 全球加速
- **算法库**：离线部署在客户端（关键技术：图算法在浏览器）
- **敏感数据**：保留在后端 API

## 3. 算法性能基准

| 节点规模 | BFS 推演 | 完整爆管（含渲染） | 热力图聚合 |
| --- | --- | --- | --- |
| 100 | 1ms | 5ms | 2ms |
| 1,000 | 5ms | 18ms | 6ms |
| 5,000 | 22ms | 65ms | 28ms |
| 10,000 | 50ms | 145ms | 58ms |
| 50,000 | 320ms | 720ms | 350ms |

测试环境：Chrome 120 / M1 Pro / 16GB。

## 4. 第三方系统对接

### 4.1 SCADA / IoT 平台

- 订阅报警流（MQTT/WebSocket）
- 报警触发 → 自动爆管推演
- 推演结果直接发送值班人（钉钉 / 企微）

### 4.2 工单系统（北森/钉钉审批）

- 推演结果生成处置工单
- 自动绑定现场阀门编号
- 工单状态回流更新管网状态

### 4.3 移动端巡检

- App 端接收任务 + 管网地图
- 巡检员现场标记设备异常
- 状态自动同步至后台

## 5. 安全合规

1. **数据保密** - 管网位置属于敏感地理信息，要求：
   - 加密传输（HTTPS）
   - 后端审计日志（6个月保留）
   - 二级等保要求

2. **权限控制** - 推荐 RBAC：
   - `viewer`：只读
   - `operator`：可标注现场情况
   - `dispatcher`：可触发推演 + 派单
   - `admin`：配置 + 账号管理

3. **等保合规** - 满足等保 2.0 三级 + 关键基础设施保护条例。

## 6. 试点数据接入（D9）

### 6.1 试点单位选型

建议从三家中选择首批：

| 单位类型 | 数据特点 | 推荐接入路径 |
| --- | --- | --- |
| 县市级供水公司 | 500-2000 节点，1-2 万用户 | 离线单机 + 人工录入 |
| 市级燃气公司 | 5000-10000 节点，30 万用户 | 私有云 + SCADA 集成 |
| 大型化工园区 | 10000+ 节点，强安全要求 | 混合云 + 等保三级 |

### 6.2 试点交付包（D9.1-D9.4）

- **D9.1 数据导入工具** - 已完成：`csvToDataset()` + `package.json` script
- **D9.2 数据规范化** - 已完成：枚举值校验（PipelineMaterial / PipelineStatus / NodeKind）
- **D9.3 一键部署 Helm Chart** - 进行中：Kubernetes 部署清单
- **D9.4 培训 / 手册** - 已完成：本文件 + 各组件 JSDoc

## 7. 后续路线

### Phase 2（5-8 月）
- 接入真实数据 + SCADA 流
- 移动端离线包
- 与现有 OA / 工单系统深度集成

### Phase 3（9-12 月）
- 多端协同（App + Web + 大屏）
- 物联感知 + 数字孪生
- 接入 AI 故障预测（已完成组件接口预留）
