# 草果地图 — 技术文档站 PRD

| 项目 | 说明 |
|------|------|
| **产品名称** | 草果地图 · 技术文档站 |
| **文档版本** | V1.1（在 V1.0 基础上补全标准 PRD 章节并对齐 Phase-0 现状） |
| **编写日期** | 2026-08-21 |
| **域名** | map.hb.cn/docs |
| **目标读者** | 前端工程师、后端工程师、GIS 工程师、运维工程师、技术决策者 |
| **文档定位** | 面向内部研发与决策的产品/研发规划文档（管理视角） |

> **版本说明（V1.1 变更）**：V1.0 仅为「功能清单式」信息架构草案。V1.1 补充了背景与问题、用户画像、范围与非目标、内容治理、验收与度量、风险与缓解、资源估算等标准 PRD 章节，并将信息架构、P0/P1/P2 优先级与 Phase-0 已交付的真实能力（T1-T9、D5 及文档站）逐项对齐，凡「已落地」均指代码与文档均已交付且通过构建/测试，凡「规划中」均指尚未实现、不可视作已完成。

---

## 一、背景与问题

### 1.1 为什么需要独立的文档站

草果地图（caoguo-map）是面向「六张网」（管网、电网、水网、交通网、算力网、通信网）的开源、可私有化地图引擎，底层封装 MapLibre GL。其目标用户以 G 端（政务）与央国企为主，这类客户的选型与落地高度依赖三件事：

1. **文档即选型依据**：G 端技术评估往往在「读完文档的那一刻」就决定采购/采用与否。文档质量直接等于产品质量。
2. **私有化交付必须自服务**：央国企内网环境无法访问公网文档/社区，必须提供可随安装包离线分发的文档，运维团队据此自助完成部署与排障。
3. **坐标系与合规是硬门槛**：国内底图涉及 GCJ-02 / CGCS2000 偏移、天地图授权、离线瓦片合规，文档必须把这些「坑」讲清楚，否则集成方会误用导致上百公里偏移或侵权。
4. **Phase-0 已完成，需要沉淀对外**：截至 2026-08-21，地图引擎 Phase-0（T1-T9、D5）及文档站（apps/docs）均已交付并通过测试（75 passed）与双站构建。文档站当前已落地指南/API/部署三类共 10 篇，需以 PRD 形式固化其范围与后续路线，避免「代码在跑、文档在漂」。

### 1.2 现状与缺口

| 维度 | Phase-0 现状 | 文档侧的缺口 |
|------|-------------|-------------|
| 引擎能力 | CRS 坐标系、天地图 WMTS、离线瓦片、SW 离线拦截、Scale/Theme 控件、Shader 辉光、LOD、主题样式均已实现 | 已实现能力仅在 `apps/docs` 部分篇章覆盖，缺统一 PRD 界定范围 |
| 文档站 | `apps/docs`（VitePress）已搭建，sidebar 含 指南/API/部署 三组，含 quickstart/installation/first-map/themes/map/layer/source/offline/docker/air-gap 共 10 篇 | 缺内容治理、度量指标、风险与资源规划等管理视角内容 |
| 行业/AI | 六张网专题、NLPG、Copilot 尚未启动 | PRD V1.0 信息架构含大量 ai/industry 占位，需明确标注「规划中」以免误读为已交付 |

### 1.3 本 PRD 解决的问题

- 把「文档站要写什么、写到什么程度、谁来维护、怎么度量」从口头约定固化为可评审、可验收的规划文档。
- 消除「PRD 承诺」与「代码现实」的漂移：所有「已落地」条目均可在 `packages/maplibre` 与 `apps/docs` 中查证。

---

## 二、目标

1. 开发者可在 10 分钟内跑通第一个地图应用（已通过 `guide/quickstart` + `guide/first-map` 落地）。
2. 所有已交付 API 均有代码示例，减少技术支持工单。
3. G 端/央国企运维团队可依据文档自行完成私有化/离线部署（已通过 `deployment/docker` + `deployment/air-gap` 落地）。
4. 文档本身是产品体验的一部分，且与代码版本严格同步（doc-as-code）。

---

## 三、用户画像

| # | 角色 | 目标 | 痛点 | 文档诉求 |
|---|------|------|------|---------|
| P1 | **前端集成工程师** | 把地图嵌进业务系统（Vue/React） | 坐标系偏移、SDK 与框架版本冲突、示例跑不通 | 快速开始、API 参考（含完整参数表与可运行示例）、常见报错排查 |
| P2 | **GIS / 数据工程师** | 导入管线/路网 GeoJSON、做偏移纠偏与离线瓦片打包 | CGCS2000/GCJ-02 转换规则不清、离线瓦片生成链路复杂 | 坐标系概念、数据源与离线能力文档、GeoJSON 打包示例 |
| P3 | **运维 / 部署工程师** | 在内网/ air-gap 环境部署文档站与瓦片服务 | 内网无公网、不能拉 CDN、搜索索引需本地化 | Docker / 离线部署指南、Nginx 与瓦片服务配置、监控告警 |
| P4 | **技术决策者（架构/采购）** | 评估是否采用草果地图 | 关注开源协议、私有化可行性、能力边界、Roadmap | 产品概述、能力边界（非目标）、Roadmap 与里程碑、风险披露 |

> 文档站信息架构与优先级（见第四、五章）即按上述四类角色组织；P4 关注的管理视角内容集中在本 PRD 的「内容治理 / 验收与度量 / 风险 / 资源估算」章节。

---

## 四、范围与非目标

### 4.1 范围（本期 PRD 覆盖）

- 草果地图**文档站**的内容规划、质量规范、治理流程与落地路线。
- 与 Phase-0 已交付引擎能力（T1-T9、D5）对应的文档，均视为「已落地」。
- 文档站技术栈（VitePress）、交互式 Demo 嵌入、本地搜索（search.provider=local）的规划。

### 4.2 非目标（本期明确不做）

| 非目标 | 原因 |
|--------|------|
| **多语言 / i18n 文档** | 首期仅中文；G 端交付以中文为主，英文版列入后续评估 |
| **在线社区 / 论坛 / 工单系统** | 超出文档站范畴，由独立运营体系承担 |
| **AI / 六张网行业方案的完整文档** | 对应能力（NLPG、Copilot、六张网专题图层）尚未启动，本期仅占位、不写实 |
| **对外商业化 SLA / 付费支持条款** | 属商务范畴，不在文档站 PRD 内 |
| **把未实现功能写成已交付** | 所有「规划中」条目在 PRD 与文档站均须明确标注，杜绝虚假完成 |

### 4.3 能力边界（对外披露）

- 引擎当前为「轻量封装层」：直接复用 MapLibre GL 能力，已注入坐标系纠偏、天地图底图、离线瓦片、辉光/LOD/控件等增强；尚未包含自研渲染内核、三维地形、矢量切片服务。
- 离线能力分两层：**业务离线瓦片**（T4，IndexedDB + 协议层短路，不发网）与 **SW 二级缓存 + 空气隔离拦截**（T5，Cache API，线上瓦片可缓存、可禁网）。两者定位不同，文档须分别讲清。

---

## 五、信息架构

> 图例：**✅ 已落地**（代码 + 文档均已交付，`apps/docs` 可查、构建通过）；**🟡 规划中**（本期 PRD 规划、对应能力尚未实现，不视作已完成）。`apps/docs/.vitepress/config.ts` 当前真实 sidebar 仅含「指南 / API 参考 / 部署 / 演示中心」四组（共 10 篇已落地），与下方 ✅ 标记一致；🟡 条目为后续迭代路线，不在本期交付承诺内。

```
docs/
├── index.md                  # 首页（快速开始引导）              【✅ 已落地】
│
├── guide/                    # 入门指南
│   ├── quickstart.md         # 5 分钟快速开始                    【✅ 已落地】
│   ├── installation.md       # 安装方式汇总（npm/CDN/Docker/离线）【✅ 已落地】
│   ├── first-map.md          # 第一个地图应用                    【✅ 已落地】
│   ├── concepts/             # 核心概念                          【🟡 规划中】
│   │   ├── coordinates.md    # 坐标系（CGCS2000/GCJ-02/WGS84）【✅ 已落地】
│   │   ├── style.md          # 样式系统
│   │   ├── layers.md         # 图层类型
│   │   ├── sources.md        # 数据源管理
│   │   └── projection.md     # 投影与转换
│   └── guides/               # 实用教程
│       ├── offline.md        # 离线部署指南
│       ├── custom-style.md   # 自定义样式
│       ├── data-import.md    # 数据导入指南                      【✅ 已落地】
│       └── performance.md    # 性能调优（LOD）                   【✅ 已落地】
│
├── api/                      # API 参考
│   ├── map.md                # Map 核心类                        【✅ 已落地】
│   ├── layer.md              # 图层 API（circle/line/fill/symbol/heatmap/raster 概览）【✅ 已落地】
│   ├── source.md             # 数据源（T3 天地图 WMTS + GeoJSON/矢量/栅格概览）【✅ 已落地】
│   ├── offline.md            # 离线能力（T4 离线瓦片 + T5 SW 拦截 + 空气隔离）【✅ 已落地】
│   ├── control/              # 控件 API                          【🟡 规划中】
│   │   ├── navigation.md     # 导航控件
│   │   ├── scale.md          # 比例尺（T8 ScaleControl）          【✅ 已落地】
│   │   └── popup.md          # 弹窗
│   ├── event.md              # 事件系统（Map.on）                【✅ 已落地】
│   ├── camera.md             # 相机控制（flyTo）                 【✅ 已落地】
│   └── geo/                  # 地理工具（缓冲/相交/距离）【🟡 规划中，尚未实现】
│
├── ai/                       # AI 能力【🟡 规划中，对应能力未启动，本期仅占位】
│   ├── copilot.md            # MapCopilot 使用指南（D4，Phase 1）
│   ├── nlpg.md               # NLPG 自然语言查询（D3，Phase 1）
│   ├── geoai.md              # GeoAI 数据入图
│   └── debug.md              # AI Debug 工具
│
├── industry/                 # 行业方案【🟡 规划中，六张网专题尚未启动】
│   ├── pipeline/             # 地下管网
│   │   ├── overview.md       # 方案概览
│   │   ├── topology.md       # 拓扑编辑器
│   │   ├── burst.md          # 爆管推演
│   │   ├── leakage.md        # 泄漏扩散
│   │   ├── health.md         # 健康评估
│   │   └── data-spec.md      # 数据接入规范
│   ├── grid/                 # 电网
│   │   ├── overview.md
│   │   ├── topology.md       # 电网拓扑
│   │   ├── outage.md         # 停电分析
│   │   ├── load.md           # 负荷热力图
│   │   └── data-spec.md
│   ├── water/                # 水网
│   │   ├── overview.md
│   │   ├── river.md          # 水系拓扑
│   │   ├── flood.md          # 洪水淹没
│   │   ├── dam.md            # 水库调度
│   │   └── data-spec.md
│   ├── transport/            # 交通网
│   │   ├── overview.md
│   │   ├── road.md           # 路网编辑器
│   │   ├── traffic.md        # 交通流量
│   │   ├── incident.md       # 事件响应
│   │   └── data-spec.md
│   ├── compute/              # 算力网
│   │   ├── overview.md
│   │   ├── nodes.md          # 算力节点
│   │   ├── fiber.md          # 光缆路由
│   │   └── data-spec.md
│   └── telecom/              # 通信网
│       ├── overview.md
│       ├── coverage.md       # 基站覆盖
│       ├── health.md         # 网络健康
│       └── data-spec.md
│
├── deployment/               # 部署运维
│   ├── docker.md             # Docker 部署                       【✅ 已落地】
│   ├── air-gap.md            # 离线/内网（空气隔离）部署           【✅ 已落地】
│   ├── k8s.md                # Kubernetes 部署                  【🟡 规划中】
│   ├── nginx.md              # Nginx 配置                       【🟡 规划中】
│   ├── tiles.md              # 瓦片服务配置                     【🟡 规划中】
│   └── monitoring.md         # 监控与告警                       【🟡 规划中】
│
├── demo/                     # 交互式演示中心（apps/demo，VitePress）【✅ 已落地 D5】
│   └── index.md + features/  # FeatureShowcase 串联（T8/T6/T7/T4/T5）【✅ 已落地】
│
├── examples/                 # 代码示例【✅ 已落地（6 篇：基础地图/GeoJSON 图层/热力图/矢量瓦片/信息弹窗/管线辉光）】
│   ├── basic-map.md          # 基础地图
│   ├── custom-marker.md      # 自定义标记
│   ├── heatmap.md            # 热力图
│   ├── vector-tiles.md       # 矢量切片
│   ├── geojson-layer.md      # GeoJSON 图层
│   ├── popup-info.md         # 信息弹窗
│   └── 3d-terrain.md         # 3D 地形
│
├── faq/                      # 常见问题【✅ 已落地（5 篇：坐标偏移/瓦片慢/样式/离线/兼容性）】
│   ├── coordinates.md        # 坐标偏移问题
│   ├── tiles-slow.md         # 瓦片加载慢
│   ├── style-custom.md       # 样式定制
│   ├── offline.md            # 离线问题
│   └── compatibility.md      # 浏览器兼容性
│
└── contributing/             # 贡献指南（开源）【🟡 规划中】
    ├── guide.md              # 如何贡献
    ├── architecture.md       # 项目架构
    └── code-style.md         # 代码规范
```

---

## 六、文档优先级（与 Phase-0 实现对齐）

> 下表「对应能力」指向 `packages/maplibre` 实际已实现模块，确保 PRD 承诺 = 代码现实。

### 6.1 已交付（Phase 0，✅）

| 文档 | 对应能力 | 状态 |
|------|----------|------|
| `guide/quickstart.md` | 引擎封装 + 快速开始 | ✅ 已落地 |
| `guide/installation.md` | npm/CDN/Docker/离线 四种安装 | ✅ 已落地 |
| `guide/first-map.md` | `Map` 类基础用法 | ✅ 已落地 |
| `guide/themes.md` | T9 主题样式、T8 控件、T6 辉光、T7 LOD | ✅ 已落地 |
| `api/map.md` | `Map` 核心类（transformToMap / useTianditu / enableOffline / addScaleControl / addThemeSwitcher / addGlowLayer / addLodController 等） | ✅ 已落地 |
| `api/layer.md` | 图层 API（circle/line/fill/symbol/heatmap/raster 概览） | ✅ 已落地 |
| `api/source.md` | T3 天地图 WMTS + GeoJSON/矢量/栅格数据源概览 | ✅ 已落地 |
| `api/offline.md` | T4 离线瓦片（IndexedDB + 协议层短路）+ T5 SW 拦截（Cache API + 空气隔离） | ✅ 已落地 |
| `deployment/docker.md` | Docker 部署 | ✅ 已落地 |
| `deployment/air-gap.md` | 离线/内网（空气隔离）部署 | ✅ 已落地 |
| `demo/`（apps/demo） | D5 FeatureShowcase 串联闭环 | ✅ 已落地 |

### 6.2 P1 — Phase 1（🟡 与引擎能力同步启动）

| 文档 | 对应能力（规划） | 状态 |
|------|------------------|------|
| `guide/concepts/coordinates.md` | T2 CRS 转换（已实现） | ✅ 已落地 |
| `guide/guides/data-import.md` | `packGeoJSON`（T4，已实现） | ✅ 已落地 |
| `guide/guides/performance.md` | T7 LOD 控制器（已实现） | ✅ 已落地 |
| `api/control/scale.md` `camera.md` | T8 ScaleControl / `flyTo`（已实现） | ✅ 已落地 |
| `api/event.md` | `Map.on`（已实现） | ✅ 已落地 |
| `examples/*.md` | — | ✅ 已落地（6 篇） |
| `faq/*.md` | — | ✅ 已落地（5 篇） |
| `ai/nlpg.md` `ai/copilot.md` | D3 NLPG / D4 Copilot | 🟡 待引擎能力开发后写实 |

### 6.3 P2 — Phase 2-3（🟡 行业与规模化）

| 文档 | 说明 |
|------|------|
| `industry/pipeline/*.md` 等六张网 | 随六张网专题图层与数据接入能力开发后写实 |
| `deployment/k8s.md` `nginx.md` `tiles.md` `monitoring.md` | 规模化与运维增强 |
| `contributing/*.md` | 开源贡献指南 |
| `ai/geoai.md` `ai/debug.md` | AI 数据入图与调试 |

---

## 七、文档模板

### 7.1 快速开始模板

```markdown
---
title: 5 分钟快速开始
---

# 5 分钟快速开始

本指南将帮助你在 5 分钟内创建第一个草果地图应用。

## 前提条件

- Node.js 18+
- 一个 HTML 文件

## 步骤 1：安装

::: code-group
​```bash [npm]
npm install @caoguo/maplibre
​```

​```html [CDN]
<script src="https://map.hb.cn/maplibre.js"></script>
​```
:::

## 步骤 2：创建地图

​```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = new CaoguoMap.Map({
      container: 'map',
      center: [114.3, 30.5],
      zoom: 12,
      style: 'caoguo-dark'
    });
  </script>
</body>
</html>
​```

## 步骤 3：运行

​```bash
npx vite .
​```

打开浏览器访问 `http://localhost:5173`，你应该看到一个武汉地图。

## 下一步

- [核心概念](/guide/concepts/coordinates) — 了解坐标系
- [API 参考](/api/map) — 查看完整 API
- [行业方案](/industry/pipeline/overview) — 看看管网方案
```

### 7.2 API 参考模板

```markdown
---
title: Map 类
---

# Map

地图的核心类，负责初始化和管理地图实例。

## 构造函数

​```javascript
new CaoguoMap.Map(options: MapOptions)
​```

### MapOptions

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `container` | `string \| HTMLElement` | — | 地图容器 |
| `center` | `[number, number]` | `[0, 0]` | 初始中心点 [lng, lat] |
| `zoom` | `number` | `1` | 初始缩放级别 |
| `style` | `string \| object` | `'caoguo-light'` | 地图样式 |
| `pitch` | `number` | `0` | 地图倾斜角度 |
| `bearing` | `number` | `0` | 地图旋转角度 |

## 方法

### `addLayer(layer)`

添加图层到地图。

​```javascript
map.addLayer({
  id: 'my-layer',
  type: 'circle',
  source: 'my-source',
  paint: {
    'circle-radius': 6,
    'circle-color': '#ff6b35'
  }
});
​```

### `removeLayer(id)`

从地图中移除图层。

​```javascript
map.removeLayer('my-source');
​```

### `on(event, layerId, callback)`

监听地图事件。

​```javascript
map.on('click', 'my-layer', (e) => {
  console.log(e.features[0].properties);
});
​```
```

---

## 八、文档站技术方案

| 层 | 选择 | 说明 |
|----|------|------|
| 框架 | VitePress | 与落地页共享 |
| 搜索 | VitePress 内置（本地索引） | 中文支持 |
| 代码高亮 | Shiki（VitePress 内置） | 支持 JS/Python/SQL/Bash |
| 代码组 | VitePress `::: code-group` | 多种安装方式对比 |
| 自定义组件 | Vue 3 组件 | 可嵌入交互式地图 Demo |

### 交互式 Demo 嵌入

在文档中嵌入可交互的地图 Demo：

```vue
<!-- components/MapDemo.vue -->
<template>
  <div class="demo-container">
    <div ref="mapEl" class="map"></div>
    <div class="code-panel">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Map } from '@caoguo/maplibre';

const mapEl = ref(null);

onMounted(() => {
  new Map({
    container: mapEl.value,
    center: [114.3, 30.5],
    zoom: 12,
    style: 'caoguo-dark'
  });
});
</script>
```

---

## 九、内容治理

文档即代码（doc-as-code），与源码同仓、同评审、同发版。

| 项 | 规范 |
|----|------|
| **仓库与位置** | 文档源文件位于 `apps/docs/`（VitePress 源），与 `packages/maplibre` 同 monorepo，修改需随引擎 PR 一并评审 |
| **文档 Owner** | 每篇文档设 owner（引擎对应模块负责人）；`api/*` 由对应模块开发 owner，`guide/*` 由开发者体验 owner，`deployment/*` 由 SRE owner |
| **版本同步** | 文档随 SDK 发版号（如 `@caoguo/maplibre@x.y.z`）同步打 tag；引擎 breaking change 必须在 PR 中同步更新对应 `api/*` 文档，否则 CI 拦截 |
| **Deprecation 标注** | 废弃 API 不得直接删除文档，须加 `> [!WARNING] 已废弃，将于 vX.Y 移除` 提示并保留迁移示例至少一个大版本 |
| **模板约束** | 所有新文档遵循第七章（文档模板）；API 文档须含「参数表 + 可运行示例 + 异常说明」三要素 |
| **术语与口径** | 统一使用 第四章界定的术语（草果地图 / 六张网 / 空气隔离 / 业务离线 vs SW 缓存）；包名 `@caoguo/maplibre`、类 `CaoguoMap.Map`、域名 `map.hb.cn/docs` 全文一致 |
| **复审节奏** | 季度复审：核对「已落地」标记与代码现实是否一致，回收过期占位文档 |
| **本地化（后续）** | 英文版列入评估，首期仅中文 |

---

## 十、验收与度量

### 10.1 验收标准（交付门槛）

| # | 标准 | 验收方式 |
|---|------|---------|
| 1 | 快速开始文档可在 10 分钟内跑通 | 新人盲测 |
| 2 | 所有**已交付** API 有代码示例 | 人工审查（以第六章 6.1 清单为准） |
| 3 | 部署文档覆盖 Docker / 离线（air-gap）；K8s 列入 P2 | 运维团队按文档部署成功 |
| 4 | 搜索功能可用（本地索引，适配内网无公网） | 关键词搜索命中 |
| 5 | 文档站与落地页视觉风格一致 | 目视检查 |
| 6 | 移动端可阅读 | 768px 以下测试 |
| 7 | 文档站 LCP < 1.5 秒 | Lighthouse 测试 |
| 8 | 无死链（含跨站 `/demo/`、`/features/` 纯文字链接） | 爬虫 + `ignoreDeadLinks` 配置检查 |

### 10.2 度量指标 / KPI（持续运营）

| 指标 | 目标 | 采集方式 |
|------|------|----------|
| **文档覆盖率** | 已写 API 文档 / 已交付 API ≥ 100% | 对齐 `packages/maplibre` 导出面与 `api/*` |
| **搜索成功率** | 站内搜索无结果率 < 5% | VitePress local search 日志 / 埋点 |
| **首屏 LCP** | < 1.5s | Lighthouse CI |
| **跳出率** | 落地页跳出率 < 40% | 站内分析（无第三方外链） |
| **工单下降率** | 文档上线后集成类工单月环比下降 | 工单系统对比 |
| **内容新鲜度** | 6.1 清单中「已落地」标记与代码现实一致率 100% | 季度复审 |

---

## 十一、风险与缓解

| # | 风险 | 影响 | 缓解措施 |
|---|------|------|----------|
| R1 | **文档与 SDK 版本漂移** | 读者按旧文档调用已变更/废弃 API，产生集成故障 | doc-as-code 同仓同 PR；CI 校验 breaking change 须同步文档；deprecation 标注与迁移示例 |
| R2 | **内网/air-gap 无公网搜索失效** | G 端内网无法使用公网搜索索引 | 采用 VitePress `search.provider=local`（本地索引），随安装包离线分发；文档站本身可完全静态托管 |
| R3 | **多人编辑冲突 / 口径不一致** | 术语、包名、域名写法分裂 | 第九章术语与口径约束 + 模板约束 + 季度复审 |
| R4 | **资源不足导致文档滞后于功能** | 已实现能力无文档，违背「所有已交付 API 有示例」 | 文档纳入引擎 PR 的 DoD（Definition of Done）；延期文档须显式标注 🟡 而非伪装完成 |
| R5 | **占位文档被误读为已交付** | 客户/决策方高估成熟度 | 全站 ✅/🟡 状态标记；对外材料仅引用 ✅ 清单 |
| R6 | **死链与跨站链接失效** | 降低可信度与 SEO | `ignoreDeadLinks: true` + 跨站链接改为纯文字 + 爬虫巡检 |

---

## 十二、资源估算与里程碑

### 12.1 角色与投入（管理视角估算）

| 角色 | 职责 | 投入（建议） |
|------|------|--------------|
| 技术文档工程师 ×1 | 撰写 guide/api、维护模板与术语、季度复审 | 1.0 FT（持续） |
| 引擎开发（模块 owner） | 随 PR 同步 api/* 文档、提供示例 | 0.2 FT（嵌入研发流程） |
| 前端（演示站） | 维护 `apps/demo` 交互式 Demo | 0.3 FT（按需） |
| SRE / 运维 | 撰写 deployment/*、验证离线部署 | 0.2 FT（按需） |
| 技术负责人 | 范围把关、对外口径、里程碑验收 | 0.1 FT（评审） |

> 说明：Phase-0 文档（6.1 清单 11 篇）已随引擎开发一并完成，未单列预算；上表为 Phase-1 起持续运营的常态投入估算。

### 12.2 里程碑（按迭代视角，区分已完成与待办）

| 阶段 | 范围 | 状态 |
|------|------|------|
| **M0（已完成）** | Phase-0 引擎 T1-T9 + D5；文档站搭建 + 6.1 清单 11 篇落地；双站构建通过；75 passed 测试 | ✅ 已交付 |
| **M1（Phase 1）** | 把 T2/T4/T7/T8 等已实现能力补写成概念/教程/控件/相机/事件文档；examples ≥ 5；faq ≥ 5；随 NLPG/Copilot 能力开发写实 ai/* | 🟡 规划中 |
| **M2（Phase 2）** | 六张网行业专题文档（随专题图层能力开发）；deployment 规模化（k8s/nginx/tiles/monitoring） | 🟡 规划中 |
| **M3（Phase 3）** | contributing 开源贡献体系；ai/geoai、ai/debug；英文版评估 | 🟡 规划中 |

> Phase-0 原「D1-D10」天级排期已实际执行完毕，此处不再保留；后续以 M1-M3 迭代视角跟踪，每迭代末做复审与对外口径校准。

---

> **文档的质量就是产品的质量。G 端客户的技术选型，往往在读完文档的那一刻就决定了。**
