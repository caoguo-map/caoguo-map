# 贡献 · 项目架构

pnpm monorepo，分层严格单向依赖：**引擎 → 主题 → 行业包 → 编辑器 → 应用**。

## 分层与命名

```
packages/maplibre    @caoguo/maplibre           引擎封装（CRS/离线/控件/Shader/LOD/overlay/卡片基座）
packages/theme       @caoguo/theme              品牌主题 token（dark/light + 行业主题注册表）
packages/pipeline    @caoguo/maplibre-pipeline  地下管网
packages/grid        @caoguo/maplibre-grid      电网
packages/water       @caoguo/maplibre-water     水网
packages/transport   @caoguo/maplibre-transport 交通网
packages/compute     @caoguo/maplibre-compute   算力网
packages/telecom     @caoguo/maplibre-telecom   通信网
packages/ai          @caoguo/maplibre-ai        NLPG / Copilot / 样式生成器
packages/editor      @caoguo/map-editor         大屏编辑器（引擎侧，无 UI 壳）
apps/editor-app      @caoguo/editor-app         编辑器 UI（Vite+Vue，5190）
apps/landing|docs|demo                          三个 VitePress 站
tools/server         @caoguo/ai-server          AI 代理（Node，8787）
```

行业包命名 `@caoguo/maplibre-<域>`；例外是 `@caoguo/maplibre` / `@caoguo/theme` / `@caoguo/map-editor` / `@caoguo/maplibre-ai`。

## 行业包三件套（最重要的约定）

每个行业能力按固定三层落地，各层职责与测试策略都不同：

| 层 | 形态 | 测试 |
| --- | --- | --- |
| **算法纯函数** | `xxxCore.ts`，无 I/O、无地图依赖，Node 可测 | 查表/边界/NaN/空输入精确断言 |
| **零依赖面板/卡片** | `panels.ts` / `nodeCard.ts`，HTML 字符串 + `data-*` 事件委托，不 import Vue/maplibre | HTML 结构与转义断言 |
| **渲染薄壳** | 类方法，`upsertSource` + `addLayer`（try/catch 幂等），不算业务逻辑 | 四连断言：图层数恒定 / data-driven 表达式 / geometry filter（如适用）/ 空输入行为 |

传输层（fetch/WebSocket）**一律由调用方注入**（如 `WeatherProvider`），行业包保持离线友好、零后端依赖。

## 图层表达式的固化写法

- 数值属性插值一律 `coalesce` 兜底 + 锚点覆盖 0 值；
- 颜色/半径/宽度尽量 data-driven（`['get', k]`），改数据不用改样式；
- 空输入行为两种契约并存：**早退不加层**（如 water F-6 撤退渲染）或**空 source 仍 upsert**（等效清空上一帧，如 B-2/TF-4）——按语义选一种，并用测试锁定。

## 单位与口径（踩过坑的地方）

- pipeline 风向：弧度（0=东、π/2=北），气象数据是「来向度数、0=北顺时针」，转换见 `leakage/weather.ts`；
- telecom `faultTrend` 的 week 是 **epoch 周序号**而非自然周；
- 水深阈值着色键含阈值字段值本身（改阈值即重绘）。
改这些区域前先读实现注释与对应测试——**测试即文档**。

## 文档体系

```
docs/prd/       PRD（状态表标 ✅/🟡/❌，验收清单）——承诺 = 代码现实
apps/docs/      开发者文档站（VitePress，部署/API/概念/示例）
.codebuddy/     AI 协作记录（工作日志与约定，非仓库交付物）
```

改功能必须同步 PRD 状态表；新公开 API 同步 `apps/docs/api/` 对应页。

## 质量基线

全仓 vitest 约 990 例、10 包全绿是合并底线。渲染薄壳测试的对齐标准（四连断言）与历史 QA 结论见 `docs/prd/prd-qa-report.md`。
