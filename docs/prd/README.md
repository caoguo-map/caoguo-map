# PRD 索引

> 最后更新：2026-08-28。本日完成**全量 PRD 完善度审计**（`prd-coverage-audit.md`）并按审计结论修复，各 PRD 的功能点表已补齐落地状态标注与验收标准。

## 一、状态口径

| 标记 | 含义 |
|------|------|
| ✅ 已落地 | 代码已交付且通过构建/测试，可在 `packages/` 与 `apps/` 中查证 |
| 🟡 部分落地 | 数据层/算法已实现，缺渲染或 UI 外壳。本系列包遵循「**算法纯函数 + 渲染薄壳**」设计，业务 UI 面板由集成方实现 |
| ❌ 未落地 | 尚未实现，**不视作已完成** |

验收标准清单中：`- [x]` 为已达成，`- [ ]` 为待完成（含「算法已就绪、渲染待补」的中间态）。
**严禁把「规划中」写成「已完成」。**

## 二、PRD ↔ 交付物映射

| PRD | 对应交付物 | 版本 | 状态标注 | 备注 |
|-----|-----------|------|----------|------|
| `prd/phase-0-foundation.md` | `packages/maplibre`、`packages/theme` | V1.2 | ✅ 已标注 | 含引擎 F-1.1～F-1.10、主题 API 与行业主题命名口径 |
| `prd/phase-1-pipeline.md` | `packages/pipeline` | V1.1 | ✅ 已标注 | P/B/L/H 四个功能点系列已回填状态 |
| `prd/phase-2-grid-water.md` | `packages/grid`、`packages/water` | V1.1 | ✅ 已标注 | §4.3 DamOperation 已从 14 行补为完整章节 |
| `prd/phase-2-telecom.md` | `packages/telecom`（容量专题） | V1.0 | ✅ 已标注 | **样板 PRD**：模块级 PRD 应照此写「编号/功能/说明/验收/进度标注」 |
| `prd/phase-3-transport-compute-telecom.md` | `packages/transport`、`packages/compute`、`packages/telecom` | V1.1 | ✅ 已标注 | 新增 §3.4 公共交通客流、§5.4 基站拓扑分析、各章验收标准 |
| `prd/visual-editor.md` | `packages/editor`、`apps/editor-app` | V1.2 | ✅ 已标注（§13） | 数据源 4→14 种、后端代理、系统自检、导出脱敏、status-bar 组件、**§14 组件库（合并自 vue3-component-lib）** |
| `prd/vue3-component-lib.md` | **已归档** → 见 `visual-editor.md` §14 | V1.2（归档） | 🔵 规划中 | 方案 A 已决策：组件随编辑器交付，无独立包；本文档仅作目标设计存档，API 不可对外承诺 |
| `prd/demo-center.md` | `apps/demo` | V1.1 | ✅ 已标注 | D1～D16 状态已标；新增 D17～D26 补充 Demo 与 4 个补齐页面（station3d / realtime / capacity / transit-OD） |
| `prd/documentation.md` | `apps/docs` | V1.1 | ✅ 已标注 | 文档站，42 处状态标记 |
| `prd/landing-page.md` | `apps/landing` | V2.1 | ✅ 已标注（§2.1） | 3.1～4.5 共 15 个区块全部 ✅（§4.2 场景故事、§4.5 技术支持体系已补齐） |
| `maplibre-6networks-plan.md` | 顶层规划（六张网） | — | 🟡 部分 | 商业方案视角，非功能点级 PRD |
| `prd-coverage-audit.md` | 审计报告（本文档的产出依据） | — | — | 含共性问题与整改优先级 |

## 三、阅读顺序

1. `maplibre-6networks-plan.md` —— 先看六张网全景与商业定位
2. `prd/phase-0 → phase-1 → phase-2 → phase-3` —— 按阶段看能力演进与落地状态
3. `prd/visual-editor.md` —— 编辑器、渲染运行时与**组件库（§14，组件库的唯一事实源）**
4. `prd/vue3-component-lib.md` —— **已归档**，仅作目标设计存档（组件 API 尚未实现为可复用组件）

## 四、维护约定

1. **功能点表必须带「状态」列**：新写或改动 PRD 时，功能点表一律包含 `# / 功能 / 描述 / 优先级 / 状态`。
2. **代码注释引用 PRD 章节必须校验章节存在**：已发生 `TransitHeatmap` 引「PRD §2.4」（不存在）、telecom topology 引「phase-2-telecom §3.1」（实为容量章节）等错引，均已修正。改动 PRD 章节编号时须同步检索代码注释。
3. **实现领先 PRD 需当周回填**：新增能力若先落地，须在同周补 PRD 条目与状态，避免再次出现审计中发现的「capacity / station3d / realtime / transit-OD / supplyDemand / FiberRoute / 14 数据源 / proxyBase / 行业主题 / terrain / 4 个控件」等长期漂移。
4. **命名与实现保持一致**：PRD 中的 API 名、主题 ID、参数名需与代码一致（如 `recommendBestNode` 非 `findOptimalEdge`，`caoguo-ind-*` 非 `caoguo-*`）；出现偏差时在 PRD 中显式标注「命名偏差」。
5. **不做「伪已完成」**：`🟡 部分落地` 必须写明缺的是算法还是 UI 外壳。
