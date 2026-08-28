# PRD 完善度审计报告（packages × PRD 对照）

| 项目 | 说明 |
|------|------|
| **审计日期** | 2026-08-28 |
| **审计范围** | `packages/` 下 10 个包 + `apps/` 下 3 个站点，对照 `docs/prd/` 下 11 份 PRD |
| **审计方法** | 逐包读 README + `src/index.ts` 导出 + 关键源码注释（代码注释自带 PRD 编号引用，可反查），与 PRD 章节/功能点表/验收标准逐条比对 |
| **审计结论** | 文档站与 Phase 0 质量最好；**Phase 1/2/3 与编辑器类 PRD 普遍缺「状态标注 + 验收标准」**；多处**实现已领先 PRD**（需要回填），1 处**PRD 领先实现**（`@caoguo/map-components` 无对应包） |
| **修复状态** | ✅ 审计结论已于**同日（2026-08-28）逐条修复**，详见 §六「修复记录」。下表与 §二～§四 保留**审计当时快照**，供追溯 |

---

## 一、总览评分

评分维度：①目标与范围 ②模块需求与功能点 ③数据模型/API ④状态标注 ⑤验收标准 ⑥里程碑/风险。

| 包 / 站点 | 主要 PRD | 完善度 | 状态标注 | 验收标准 | 主要问题 |
|-----------|----------|--------|----------|----------|----------|
| `@caoguo/maplibre` | `phase-0-foundation` §5.1 | **80%** | ✅ 有 | ✅ 有（5 项，2 项已达） | 控件层无功能点编号；§1.3 与 F-1.5 自相矛盾 |
| `@caoguo/theme` | `phase-0-foundation` §5.2 | **55%** | 🟡 主题表有 | ✅ 有（4 项） | PRD 未定义任何 API；主题命名与实现不一致 |
| `@caoguo/maplibre-ai` | `phase-0` §5.5-5.7 + `phase-3` §7/§8 | **75%** | ✅ Phase 0 有 | 🟡 Phase 3 无 | stylegen/debug 无状态、无验收；LLM provider 扩展未写 |
| `@caoguo/maplibre-pipeline` | `phase-1-pipeline` §4 | **70%** | ❌ 无 | 🟡 仅非功能 | 全部功能点无状态列，无法判断落地 |
| `@caoguo/maplibre-grid` | `phase-2-grid-water` §3 | **60%** | ❌ 无（仅 3 处 ✅） | 🟡 仅非功能指标 | realtime 未细化；station3d 未标落地 |
| `@caoguo/maplibre-water` | `phase-2-grid-water` §4 | **45%** | ❌ 无 | 🟡 仅非功能指标 | **DamOperation 仅 14 行**，无功能点/数据模型 |
| `@caoguo/maplibre-telecom` | `phase-3` §5 + `phase-2-telecom` | **75%** | ✅ 专项 PRD 有 | ✅ 专项 PRD 有 | **样板级 PRD**；但 phase-3 §5 无状态 |
| `@caoguo/maplibre-transport` | `phase-3` §3 | **50%** | ❌ 无 | ❌ 无 | TransitHeatmap/OD 无正式立项章节 |
| `@caoguo/maplibre-compute` | `phase-3` §4 | **55%** | ❌ 无 | ❌ 无 | FiberRoute 无 PRD 编号；C-4 状态不明 |
| `@caoguo/map-editor` | `visual-editor` | **60%** | ❌ 无 | ❌ 无 | 章节最全但内容滞后：数据源 4→14、无代理/自检说明 |
| `@caoguo/map-components` | `vue3-component-lib` | **30%** | ❌ 无 | 🟡 散点 | **PRD 有、包不存在**（组件寄居在 editor 内） |
| `apps/docs` | `documentation` | **85%** | ✅ 42 处 ✅ | ✅ 有 KPI | 缺新模块 API 页（capacity/transit/predict） |
| `apps/demo` | `demo-center` | **60%** | ❌ 无 | ✅ 有 | 缺 station3d/capacity/transit/od/predict 的 demo |
| `apps/landing` | `landing-page` | **65%** | ❌ 无 | 🟡 仅检查清单 | 无状态标注，无法判断各区块落地情况 |

> 标注口径：状态标注列指 PRD 内是否有 `✅已落地 / 🟡部分 / ❌未落地` 这类可核对的进度标记（统计自 `grep 已落地/✅/🟡`）。

---

## 二、逐包明细

### 1. `@caoguo/maplibre` — Phase 0 §5.1（80%，质量最好）

**覆盖良好**：F-1.1～F-1.7 七个功能点全带状态（坐标系/天地图/Shader/离线/SW 缓存/3D 地形/LOD），验收标准 5 项带勾选状态，且明确了"薄封装 + 插件、maplibre-gl 作 peerDependency"的实现口径。

**缺口**：
1. **控件层无 PRD 条目**：实现了 `ScaleControl` / `ThemeSwitcher` / `LegendControl` / `ExportControl` 四个控件，PRD 全篇只有 6 处泛泛提及"控件"，无功能点编号、无验收。
2. **文档自相矛盾**：§1.3 现状段（第 30 行）仍写「3D 地形、通用 Shader 框架未实现」，但 F-1.5（第 118 行）已标 ✅ 已落地（`terrain.ts`）。
3. **新增 API 未入 PRD**：`terrain.ts`（`applyTerrain/removeTerrain` + `Map.enableTerrain`）、`setGlobalConfig/getGlobalConfig`、`sourceUtils`（`upsertSource`）均无 PRD 条目。
4. **验收 3 项未量化**：天地图加载耗时、50MB 离线压测、包体积 < 200KB 仍是未勾选状态。

### 2. `@caoguo/theme` — Phase 0 §5.2（55%）

**有**：主题清单表（8 套）、3 项验收（要素覆盖/中文字体/Style Spec v8）。

**缺口**：
1. **PRD 未定义任何 API**：实际导出的 `buildStyle` / `darkStyle` / `lightStyle` / `injectTheme` / `useTheme` / `createThemeStore` / `checkZoomCoverage` / `INDUSTRY_PALETTES` / `registerIndustryThemes` / `buildIndustryStyle` / CSS 变量体系，PRD 一个都没写，README 成了唯一事实源。
2. **主题命名与实现不一致**：PRD 写 `caoguo-grid` / `caoguo-water` / `caoguo-telecom`，实现是 `caoguo-ind-grid` / `caoguo-ind-water`（`INDUSTRY_META.themeId`）。按 PRD 名字调用会拿不到主题。
3. **六张网行业主题 PRD 标 🟡（Phase 2/3 待出），实际已落地**（`registerIndustryThemes()` + `INDUSTRY_PALETTES`），需回填状态。

### 3. `@caoguo/maplibre-ai` — Phase 0 §5.5-5.7 + Phase 3 §7/§8（75%）

**覆盖良好**：MapCopilot（§5.5）、GeoAI（§5.6）、NLPG（§5.7）三块均有数据模型 + 功能点表（G-/N- 编号）+ 状态标注。

**缺口**：
1. **Phase 3 部分（AI Debug §7 / 样式生成器 §8）无状态、无验收**：AD-1～AD-4、SG-1～SG-5 只有优先级列。实际 `debug/aiDebug.ts` 与 `stylegen/styleGenerator.ts` 已落地。
2. **LLM provider 扩展未入 PRD**：PRD 只写 DeepSeek，实现另有 `llm/openaiCompatible.ts`（任意 OpenAI 兼容端点），需补 PRD 条目。

### 4. `@caoguo/maplibre-pipeline` — Phase 1 §4（70%）

**结构完整**：4 个模块（Topology/Burst/Leakage/Health）各有数据模型 + 功能点表 + 着色规则；另有数据接入规范（§7）、试点方案（§8）、里程碑（§9）。

**缺口**：
1. **全篇 0 处状态标注**：P-1～P-7、B 系列、LP 系列、PH 系列全部只有「优先级」列，没有任何落地状态 —— 无法从 PRD 判断哪些已实现。
2. **实现超出 PRD 的部分未回填**：`leakage/floodFill.ts`（洪水淹没模式）、`health/riskHeatmap.ts`、`burst/valvePlanner.ts`、`graph/connectivity.ts` 等子能力在 §4 中没有对应功能点编号。

### 5. `@caoguo/maplibre-grid` — Phase 2 §3（60%）

**有**：GridTopology（G-1～G-6）、OutageAnalyzer（O 系列）、LoadHeatmap（LH 系列）功能点表 + 非功能指标（实时刷新 < 5 秒）+ 里程碑。

**缺口**：
1. **realtime 模块 PRD 未细化**：实现了 `realtime/GridRealtime` + `WsTransport` + `applyMetricToDataset`（代码注释引「PRD LH-3」），但 PRD 中 LH-3 仅一行「实时数据接入（MQTT/WebSocket）P1」，无消息协议、无字段定义、无验收。
2. **station3d 未标落地**：`station3d/`（含 `viewSwitcher`）已实现，PRD G-6 写的是「三维变电站 P2，Phase 2 简版，Phase 3 增强」，未更新为已落地。
3. **无验收标准专章**，只有 7.1 非功能指标表。

### 6. `@caoguo/maplibre-water` — Phase 2 §4（45%，最薄弱）

**缺口（严重）**：
1. **DamOperation §4.3 只有约 14 行**（311-325 行），对比 RiverSystem（58 行）、FloodInundation（56 行）明显残缺：**无数据模型、无功能点表、无着色规则、无验收**。而实现有 `dam/damCore.ts` + `dam/DamRender.ts` + `dam/index.ts` 三个文件。
2. **无状态标注**（全篇仅 3 处 ✅）。
3. `nlpg/nlpCore.ts`（水网查询意图）在 PRD §5.2 只有查询意图示例，未定义模块 API。

### 7. `@caoguo/maplibre-telecom` — Phase 3 §5 + phase-2-telecom（75%，样板）

**亮点**：`phase-2-telecom.md` 是**唯一一份带「进度标注」章节的模块级 PRD**（CH-1～CH-4 逐项 ✅ + 端到端口径说明），建议作为其他包 PRD 的模板。

**缺口**：
1. **phase-3 §5（CellCoverage / NetworkHealth / 运营商品牌化大屏）无状态标注**，无法判断落地。
2. §5.3「运营商品牌化大屏」与 `@caoguo/map-editor` 的关系未说明（是否用编辑器搭）。

### 8. `@caoguo/maplibre-transport` — Phase 3 §3（50%）

**有**：RoadNetwork（T 系列）、TrafficFlow（TF 系列）、IncidentMap（I 系列）功能点表 + 非功能指标。

**缺口**：
1. **TransitHeatmap / OD 无正式立项章节**：`transit/TransitHeatmap.ts` 注释引「PRD §2.4」，但 Phase 3 PRD 的 §2 是「为什么 Phase 3 可以更快」，**没有 §2.4** —— 注释引用错误。相关内容只在 §3.2 的 TF-4（OD 矩阵可视化，P2）一行。需要单独补「公共交通客流」章节。
2. 无验收标准专章。

### 9. `@caoguo/maplibre-compute` — Phase 3 §4（55%）

**有**：ComputeNodes（C-1～C-5）、LatencyMap（LM-1～LM-4）功能点表 + 着色规则 + 非功能指标。

**缺口**：
1. **FiberRoute 无 PRD 编号**：实现有 `nodes/FiberRoute.ts`，PRD 只在里程碑 M10 提了一句「ComputeNodes + FiberRoute」，功能点表里没有对应条目（C-3 是"光缆路由可视化"，勉强相关但粒度不同）。
2. **无状态标注、无验收标准**；C-4（资源调度面板）是否实现不明。
3. `predict/supplyDemand.ts` 注释引「PRD §4.1.2 C-5」——章节号正确，✅ 是少数引用准确的。

### 10. `@caoguo/map-editor` — visual-editor.md（60%）

**亮点**：12 章结构最完整（架构/功能/数据绑定/JSON Schema/操作流程/预览/映射/原型/技术方案/文件结构/里程碑）。

**缺口（PRD 明显滞后于实现）**：
1. **数据源 4 → 14**：PRD §4.1 只定义「静态 / REST / WebSocket / 设备图层」4 种；实现支持 14 种（REST 轮询、WebSocket、设备图层绑定、MySQL、PostgreSQL、OceanBase、ClickHouse、InfluxDB、达梦、Webhook、静态、Excel/CSV 上传等）。
2. **后端代理取数缺失**：PRD 全篇 0 处「代理」字样，但实现有 `proxyBase`（默认 `http://localhost:8787`）与 DB 数据源经后端代理取数的完整链路，README 有说明、PRD 完全未提。
3. **系统自检（SystemCheck.vue）PRD 未定义**（「自检」0 处）。
4. **组件面板少 1 项**：PRD §3.1 列 23 项，实现 24 类 —— PRD 缺「状态栏 `status-bar`」。
5. **全篇无状态标注**，无法判断 3.1～3.5 各功能是否落地。
6. **JSON Schema §5 与实现有偏差**：实现 `DataSourceType` 含 `'binding'`、`Position` 用 `x/y/w/h`、导出默认脱敏（`includeSecrets`）——这些实现细节 PRD §5 未同步。

### 11. `@caoguo/map-components` — vue3-component-lib.md（30%，最严重）

**核心问题：PRD 存在，包不存在。**
1. PRD 头部声明产品名 `@caoguo/map-components`，但 `packages/` 下**没有这个包**（全仓 `package.json` 检索无此名）。
2. PRD 定义的组件中：`CaoguoMap`（地图容器）、`DeviceLayer`（设备图层）、`MenuScreen`（菜单首页）在仓库内**无对应实现文件**；`DeviceList` / `DetailPanel` / `FilterTabs` / `StatusBar` 实际寄居在 `packages/editor/src/editor/` 下，**不是独立可复用的组件库**。
3. 结果：想只用组件库（不装编辑器）的用户装不到包；组件库 PRD 与编辑器 PRD 的边界（谁负责 DeviceLayer/MenuScreen）未划分。

**建议**：要么①新建 `packages/components` 把 editor 里的展示组件抽出来独立发包；要么②把该 PRD 合并进 `visual-editor.md` 作为「组件库」章节，并明确"组件随 editor 包发布"。

### 12-14. apps 三站

- **`apps/docs`（documentation PRD，85%）**：质量第二好，42 处 ✅ 状态、有验收标准与 KPI、信息架构与 Phase-0 交付逐项对齐。缺口：新增模块的 API 页未补（`capacity`、`transit/od`、`predict`、`editor runtime`），现有 API 页只覆盖 maplibre/grid(`realtime-grid`,`station3d`)/theme/llm。
- **`apps/demo`（demo-center PRD，60%）**：30 个 demo 页面覆盖六张网，但**缺 station3d、capacity、transit/od、predict 的 demo**（正好是 PRD 也没写的那批），PRD 亦无状态标注。
- **`apps/landing`（landing-page PRD，65%）**：V2.0 内容最细（含合作伙伴专区 /partner、利润测算工具），有检查清单但无状态标注，无法判断各区块落地情况。

---

## 三、共性缺陷（按影响排序）

| # | 共性问题 | 影响面 | 说明 |
|---|----------|--------|------|
| C1 | **缺状态标注** | phase-1 / phase-2-grid-water / phase-3 / visual-editor / vue3-component-lib / demo-center / landing-page（7 份） | 只有 phase-0、documentation、phase-2-telecom 三份有 `✅已落地` 标记，其余无法判断"写了 vs 做了" |
| C2 | **缺验收标准** | phase-1 / phase-2 / phase-3 / visual-editor（4 份） | 功能点表只有「优先级」列，没有"做到什么算完成" |
| C3 | **实现领先 PRD，PRD 未回填** | 全部业务包 | capacity、station3d、realtime、transit/od、supplyDemand、FiberRoute、14 数据源、proxyBase、行业主题、terrain、4 个控件 |
| C4 | **PRD 与实现命名/编号不一致** | theme、transport、compute | 主题名 `caoguo-grid` vs `caoguo-ind-grid`；代码注释引「PRD §2.4」不存在；FiberRoute 无编号 |
| C5 | **PRD 领先实现（幽灵包）** | vue3-component-lib | 声明的包不存在，组件无独立交付形态 |
| C6 | **无 PRD 索引** | 全部 | `docs/prd/` 下 11 份文档无 README/索引说明"哪个包看哪份 PRD、最新状态是什么" |

---

## 四、整改建议（按优先级）

### P0（建议本周）
1. **回填状态标注**：给 phase-1 / phase-2-grid-water / phase-3 / visual-editor 的功能点表加「状态」列，照 `phase-2-telecom.md` 的模板（编号 / 功能 / 说明 / 验收 / 状态）。
2. **解决 `@caoguo/map-components` 幽灵包**：二选一（独立发包 vs 合并进 editor PRD），并修正 PRD 包名。
3. **补齐 water §4.3 DamOperation**：补数据模型、功能点表、着色规则、验收（当前 14 行 vs 实现 3 个文件）。

### P1（建议两周内）
4. **editor PRD 追平实现**：数据源类型 4→14、后端代理（proxyBase）机制、SystemCheck 自检、status-bar 组件、导出脱敏策略。
5. **修正 phase-0 内部矛盾**：§1.3 现状段与 F-1.5（3D 地形）对齐；补 `terrain` / `setGlobalConfig` / `sourceUtils` 功能点。
6. **theme PRD 补 API 章节**：写清 `buildStyle`/`useTheme`/`injectTheme`/`INDUSTRY_PALETTES` 等公开 API，并统一主题命名（`caoguo-ind-*`）。
7. **为 TransitHeatmap/OD 立项**：在 phase-3 §3 增补「公共交通客流」章节，修正 `TransitHeatmap.ts` 注释中的错误引用（§2.4 → 新章节号）。

### P2（建议一个月内）
8. 为 phase-1/2/3 各补「验收标准」专章；为 grid realtime 补消息协议与字段定义。
9. 补 `apps/docs` 的 capacity / transit / predict / editor-runtime API 页；补 `apps/demo` 对应 demo。
10. 新建 `docs/prd/README.md` 索引：包 → PRD 映射 + 版本 + 最后更新日期 + 状态口径图例。

---

## 五、附带发现（非 PRD 但需处理）

- `apps/demo/--no-clean/`、`apps/docs/--no-clean/`、`apps/landing/--no-clean/` 三个目录是构建时 `--no-clean` 参数被误当作路径写入产生的垃圾目录（内含 `.vitepress/dist` 构建产物副本），建议删除并加入 `.gitignore`。

---

## 附：审计口径说明

- 状态标注统计：`grep -c "已落地|✅|🟡" docs/prd/prd/*.md`
  - phase-0：已落地 51 / ✅ 84 / 🟡 30
  - documentation：已落地 45 / ✅ 42 / 🟡 19
  - phase-2-telecom：已落地 4 / ✅ 5
  - phase-2-grid-water：已落地 3 / ✅ 3
  - maplibre-6networks-plan：✅ 9
  - phase-1-pipeline / phase-3 / visual-editor / vue3-component-lib / demo-center / landing-page：**0**
- 实现侧事实源：各包 `README.md` + `src/index.ts` 导出 + 源码文件头注释（多数含 `PRD §x` 引用，可直接反查 PRD 编号准确性）。


---

## 六、修复记录（2026-08-28 同日）

| # | 审计问题 | 修复动作 | 涉及文件 |
|---|----------|----------|----------|
| 1 | C3 实现领先 PRD | phase-1 / phase-2 / phase-3 全部功能点表加「状态」列并逐条按代码核对回填（P/B/L/H、G/O/LH/R/F/DO、T/TF/IM/C/LM/AD/SG/CC/NH 共 70+ 条） | `phase-1-pipeline.md`、`phase-2-grid-water.md`、`phase-3-transport-compute-telecom.md` |
| 2 | water §4.3 仅 14 行 | 补齐需求描述、数据模型、功能点（新增 DO-6）、简化算法口径与**适用边界声明**、API 表、验收标准 | `phase-2-grid-water.md` |
| 3 | TransitHeatmap 无立项 + 注释错引 §2.4 | 新增 §3.4 公共交通客流（TNS-1～TNS-4 + 验收），并澄清与 TF-4（路网 OD）的边界；代码注释同步改为 §3.4 | `phase-3…md`、`packages/transport/src/transit/TransitHeatmap.ts` |
| 4 | telecom topology 无 PRD + 注释错引 | 新增 §5.4 基站拓扑分析（TS-1～TS-4）+ 通信网整体验收；代码注释改为 §5.4 | `phase-3…md`、`packages/telecom/src/topology/{index,topologyCore}.ts` |
| 5 | C2 缺验收标准 | 为交通（§3.3.2 / §3.4.5）、算力（§4.2.2）、通信（§5.4.3）补验收标准，标出「算法已就绪、渲染待补」的中间态 | `phase-3…md` |
| 6 | phase-0 内部矛盾（3D 地形） | §1.3 现状表修正为「11 大模块、已发布 npm@0.0.8、通用 Shader 框架待扩展」；同步修正 pipeline 包状态 | `phase-0-foundation.md` |
| 7 | maplibre 控件/terrain/全局配置无条目 | 新增 F-1.8（控件体系）、F-1.9（`upsertSource`）、F-1.10（`setGlobalConfig`） | `phase-0-foundation.md` |
| 8 | theme PRD 无 API、命名不一致 | 新增 §5.2.3 公开 API 表（13 项）；样式清单补实现主题 ID `caoguo-ind-*` 与命名口径说明；验收补 `checkZoomCoverage` | `phase-0-foundation.md` |
| 9 | editor PRD 滞后（数据源 4→14、无代理/自检/脱敏、缺 status-bar） | §4.1.1 数据源 14 种清单、§4.1.2 后端代理与凭据安全、§4.1.3 字段映射；§3.1 补 status-bar；新增 §3.6 系统自检（SC-1～SC-6）、§7.3 导出脱敏分层、§13 落地状态对照与实现口径差异 | `visual-editor.md` |
| 10 | C5 幽灵包 `@caoguo/map-components` | 新增 §2.0 交付形态与落地状态更正：说明包不存在、组件的两种内部形态、逐组件状态、给出方案 A/B；§2.2 速查表加状态列；头部产品名与版本更正 | `vue3-component-lib.md` |
| 11 | demo-center 无状态标注 | §2 四张 Demo 清单加状态列（D1～D16 全部 ✅）；新增「补充 Demo（D17～D26，PRD 未列但已实现）」与「待补 Demo（station3d / realtime / capacity / transit-OD）」 | `demo-center.md` |
| 12 | landing-page 无状态标注 | 新增 §2.1 落地状态对照（3.1～4.5 共 15 个区块，13 ✅ / 2 ❌：场景故事区、技术支持体系） | `landing-page.md` |
| 13 | C6 无 PRD 索引 | 新建 `docs/prd/README.md`：PRD↔交付物映射表、状态口径、阅读顺序、5 条维护约定（含「代码注释引用 PRD 章节须校验存在」） | `docs/prd/README.md`（新增） |
| 14 | 附带：垃圾目录 | 删除 `apps/{demo,docs,landing}/--no-clean/`（共约 2.7MB 构建产物副本），`.gitignore` 增补 `--no-clean/` | 工作区、`.gitignore` |

### 修复后状态标注覆盖

| PRD | 已落地 | 部分落地 | 未落地 |
|-----|--------|----------|--------|
| phase-0-foundation | 61 | 2 | 1 |
| phase-1-pipeline | 12 | 8 | 7 |
| phase-2-grid-water | 23 | 8 | 8 |
| phase-2-telecom | 4 | 0 | 0 |
| phase-3-transport-compute-telecom | 41 | 10 | 2 |
| visual-editor | 20 | 1 | 1 |
| vue3-component-lib | 1 | 0 | 7 |
| demo-center | 16（D1-D16）+ 10（补充） | 1 | 4 |
| landing-page | 13 | 0 | 2 |
| documentation | 45 | 0 | 0 |

### 剩余待办（P2）进度更新（2026-08-28 第二轮）

| # | 待办 | 状态 |
|---|------|------|
| 1 | `apps/docs` 补 capacity / transit-OD / predict / editor-runtime API 页 | ✅ 已完成；并顺带把**已存在但未注册**的 `station3d` / `realtime-grid` / `theme-store` / `llm-provider` 4 页接入侧边栏（此前写了页面却无人能找到） |
| 2 | `apps/demo` 补 station3d / realtime / capacity / transit-OD 四个 demo | ✅ 已完成（含总览卡片与侧边栏注册） |
| 3 | landing §4.2 场景故事区、§4.5 技术支持体系 | ✅ 已完成（`PartnerStories.vue` + `SupportSection.vue`） |
| 4 | `vue3-component-lib` 方案 A/B 决策 | ✅ 已完成（选定**方案 A**：组件库并入 `visual-editor.md` §14，原 PRD 标记为已归档） |
| 5 | 「渲染层待补」功能点排期（P-1 节点图标、I-3/I-4、LM-3、C-4 等） | ⏳ 待排期 |

### 第二轮修复记录（2026-08-28）

| 项目 | 内容 | 验证 |
|------|------|------|
| Demo 站 | 新增 `grid/station3d`（G-6 三维变电站 + 4 视角）、`grid/realtime`（LH-3 可插拔传输层 + 模拟源驱动负荷热力图）、`telecom/capacity`（CH 容量利用率/用户负载 + 超载预警）、`transport/transit`（TNS 站点热力 + OD 连线 + 预测 + 线路优化建议）；总览补 4 张卡片；侧边栏注册 | `pnpm --filter @caoguo/demo build` ✅ 15.7s |
| 文档站 | 新增 `api/capacity`、`api/transit-od`、`api/compute-predict`、`api/editor-runtime` 4 页；补注册既有 4 页 | `pnpm --filter @caoguo/docs build` ✅ 26s |
| Landing | 新增 `PartnerStories.vue`（管网/电网/水网/交通 4 则场景）、`SupportSection.vue`（部署/文档/组件复用/响应/培训/升级 6 项），插入 `/partner` 页 | `npx vitepress build` ✅ 15.9s |
| 代码注释 | `transit/od.ts`、`transit/types.ts` 的「PRD §2.4」→「phase-3 §3.4」（首轮只改了 `TransitHeatmap.ts`） | — |
| PRD 同步 | demo-center（4 个补齐页面状态）、landing-page（§4.2/§4.5 → ✅）、documentation（API 页清单 +8 项） | — |
| 组件库收敛（方案 A） | `visual-editor.md` 新增 §14「组件库」：交付形态（无独立包）、状态对照（🟡 已实现但不可独立复用 / 🔵 规划中）、规划中三组件（`CaoguoMap`/`DeviceLayer`/`MenuScreen` 及替代方案）、未来独立发包路径（§14.4）；`vue3-component-lib.md` 标记**已归档**并指向 §14；`docs/prd/README.md` 索引与阅读顺序同步 | — |

### 关键结论：组件库不具备独立交付形态

核实发现编辑器内 5 个组件（`MapNode` / `DeviceList` / `DetailPanel` / `FilterTabs` / `StatusBar`）的 props **统一为 `{ node: ComponentNode }`**，配置来自节点 JSON、取数依赖编辑器 store —— 它们是**画布节点渲染器**，不是通用 UI 组件。因此「独立发布组件库」在当前架构下不成立，这也是方案 A 被选中的技术依据。

---

## 七、第三轮修复记录（2026-08-28）：补齐「渲染层待补」功能点的数据层

审计遗留第 5 项（P-1 节点图标、I-3/I-4、LM-3、C-4 等「渲染层待补」功能点）开始落地。
策略：**先补可单测的纯函数数据层**，图表/面板类 UI 外壳仍按「算法纯函数 + 渲染薄壳」留给集成方。

| 包 | 功能点 | 新增能力 | 状态变化 | 单测 |
|----|--------|----------|----------|------|
| pipeline | P-3 设备卡片 | `topology/nodeCard.ts`：`getNodeDetail()` / `getPipeDetail()` / `polylineLengthM()`；含相连管段、挂接用户分类（含重要用户数）、卡片字段；图片与维护记录从 `properties.extra` 读取（不改数据模型）；`PipelineTopology.getNodeDetail/getPipeDetail` 委托纯函数 | ❌ → 🟡 部分落地 | 11 |
| pipeline | L-2 扩散动画 | `leakage/gaussianPlume.ts` 新增 `plumeAtTime(source, params, t)` 时间切片（烟羽前缘 = 风速 × 时长，截断计算范围）；`LeakagePlume.playGasAnimation()` / `stopGasAnimation()` 用 rAF 推进（可注入 `raf`，**无 rAF 环境自动退化为静态快照**） | ❌ → ✅ 已落地 | 7 |
| pipeline | B-5 重要用户标注 | `burst/importantUsers.ts`：`buildImportantUserMarkers()`（按严重度降序）/ `importantUserColor()`；`PipelineTopology.renderImportantUsers()` / `clearImportantUsers()`（独立图层，幂等） | 🟡 → ✅ 已落地 | 8 |
| compute | LM-3 延迟趋势 | `latency/trend.ts`：`latencyTrendSeries()` / `multiLatencyTrendSeries()`，输出逐点序列 + min/max/avg + 趋势方向 + 变化率；记录无 `timestamp` 时按 `stepMs` 合成时间轴；`LatencyMap.trendSeries()` 委托（`trend()` 仍保留统计摘要） | 🟡（补齐序列，折线图渲染待上层） | 11 |
| grid | LH-4 负荷预测 | `loadCore.ts` 新增 `forecastLoadSeries()`：在既有 `predictLoadSeries()` 数值序列之上补**带时间戳**的 `LoadForecastPoint[]`，供图表直接消费 | 🟡（补齐时间轴，图表渲染待上层） | 8 |

**验证**：pipeline 99 / grid 54 / compute 38 全部通过；三包 `pnpm build`（含 dts）成功。

### 本轮踩坑（写进约定）

1. **`??` 遇 0 不回退**：`polylineLengthM()` 在无几何时返回 `0` 而非 `undefined`，`pipe.length ?? polylineLengthM(...) ?? 直线距离` 会在 0 处短路，导致长度恒为 0 —— 由单测捕获，改为显式判空。
2. **`extends` 字段类型冲突**：`PipelinePipeDetail extends PipelinePipe` 时定义 `fromNode?: PipelineNode`，与父类型的 `fromNode: string`（节点 id）冲突，运行时无碍但 **dts 构建失败** —— 改名为 `fromNodeDetail` / `toNodeDetail`。给已有接口加"详情包装类型"时，先确认父类型同名字段的语义。

### 剩余（下一轮）

- **transport**：I-3 附近资源渲染 / I-4 绕行路径渲染（算法 `findNearbyResources` / `dijkstraAvoid` 已就绪）、T-3 设施标注渲染、T-4/T-5 图算法接入 `RoadNetwork`
- **water**：R-2 水库卡片数据层（对照 grid `getDeviceDetail` / pipeline `getNodeDetail`）
- **grid**：G-2 设备卡片的图片与维护记录字段（`GridDeviceProperties` 扩展）
- **telecom**：NH-4 故障根因分析（当前 `guessFaultReason()` 为启发式，需真实故障数据模型）
- **compute**：C-4 资源调度「分配」逻辑（当前仅 `filter()` 筛选，**业务规则待定**）

---

## 八、第四轮修复记录（2026-08-28）：transport 渲染层 + water 水库卡片

延续第三轮「先补可单测纯函数、UI 外壳交给集成方」的策略，本轮完成 transport 三项目与 water R-2。

| 包 | 功能点 | 新增能力 | 状态变化 | 单测 |
|----|--------|----------|----------|------|
| transport | I-4 绕行渲染 | `incident/detour.ts`：`detourToPolyline()`（节点序列 → 折线，优先复用路段 `geometry`、自动对齐遍历方向、缺失时退化直线）、`findConnectingEdge()`、`circleRing()`；`IncidentMap.renderDetour()` | 🟡 → ✅ 已落地 | 12 |
| transport | I-3 附近资源渲染 | `IncidentMap.renderNearbyResources()`；新增 `RESOURCE_COLORS`（摄像头蓝/救援橙/医院红） | 🟡 → ✅ 已落地 | — |
| transport | IM-2 影响范围渲染 | 顺带补齐：`IncidentMap.renderImpact()`（影响半径圆 + 受影响路段高亮） | （原仅数据层）→ ✅ | — |
| transport | — | `IncidentMap.renderAll()` 一键出图（标记+影响范围+资源+绕行）；`addLayerOnce()` / `clearLayer()` 幂等加层与单点清除 | 新增 | — |
| transport | T-3 设施标注 | `FACILITY_COLORS` / `FACILITY_LABELS`（新增）；设施图层由单一橙色改为**按类型着色** | 🟡 → ✅ 已落地 | 3 |
| transport | T-4 路径规划接入 | `RoadNetwork.planRoute()`（Dijkstra）/ `planRouteAStar()` / `renderRoute()` / `clearRoute()` | 🟡 → ✅ 已落地 | 5 |
| transport | T-5 缓冲查询渲染 | `RoadNetwork.queryBuffer()` / `renderBuffer()` / `clearBuffer()`（范围圆 + 命中节点） | 🟡 → ✅ 已落地 | 5 |
| water | R-2 水库卡片 | `river/reservoirCard.ts`：`getReservoirDetail()` / `getReservoirDetails()` / `storageLevelOf()`；含蓄水率分档、超警戒判定、上下游/同级统计、卡片字段；`RiverSystem` 加三个委托方法（含 `overWarningFeatures()` 防汛值守） | 🟡（数据层补齐，卡片 UI 待集成方） | 14 |

**验证**：`pnpm -r test` 全量 **662 个测试通过**（theme 42 / maplibre 89 / ai 108 / editor 33 / compute 38 / grid 54 / pipeline 99 / telecom 57 / transport 76 / water 66）；transport 与 water 的 `pnpm build`（含 dts）成功。

### 本轮踩坑

1. **脚本批量替换的原子性问题**：一次性对多文件执行多组替换时，中途 `assert` 失败会导致**部分文件已写入、部分未写入**（phase-3 四项已改、phase-2 未改）。批量改 PRD 时应让每组替换独立校验，失败后**先 grep 确认当前实际状态**再补，不要盲目重跑整个脚本。
2. **`import type` 漏项**：给 `style/transportTheme.ts` 加 `FACILITY_COLORS: Record<RoadNodeKind, string>` 时忘了在 `import type` 里加 `RoadNodeKind` —— 测试通过但 **dts 构建失败**（vitest 不做类型检查）。改动 `style/` 下的常量表后务必跑一次 build。

### 剩余（下一轮）

- **water**：R-5 实时水位叠加（雨量站/水位站实时数据接入与渲染）
- **grid**：G-2 设备卡片的图片与维护记录字段（`GridDeviceProperties` 扩展，可照 pipeline/water 的 `properties.extra` 模式）
- **telecom**：NH-4 故障根因分析（当前 `guessFaultReason()` 为启发式，需真实故障数据模型）
- **compute**：C-4 资源调度「分配」—— **业务规则待定**（按什么维度分配？是否考虑权重/优先级/租户？），需产品决策后再实现
- **transport**：TF-3 历史趋势曲线渲染（数据层 `edgeTrend()` 已就绪，缺图表层）

---

## 九、第五轮修复记录（2026-08-28）：卡片字段统一 + water R-5 + 标注纠错

| 包 | 项目 | 内容 | 状态变化 | 单测 |
|----|------|------|----------|------|
| maplibre | 共享抽象 | 新增 `cardFields.ts`：`MaintenanceRecord` / `readImages()` / `readMaintenance()` / `readCardFields()`。此前 pipeline 与 water 各自实现了一份同逻辑的解析函数（重复代码），grid 要做 G-2 时即将出现第三份 —— 统一提到基础包，三张网共用同一口径 | 新增 | 9 |
| grid | G-2 设备卡片 | `GridDeviceDetail.cardInfo` 增加 `images` / `maintenance`；`getDeviceDetail()` 改用共享 `readCardFields()` | 🟡（补齐图片/维护记录） | 4 |
| pipeline / water | 去重 | 删除本地 `readImages/readMaintenance` 实现，改为 `import { readImages, readMaintenance } from '@caoguo/maplibre'`；`MaintenanceRecord` 由 `import type` + `export type {}` 转出，**保持本包 API 不变** | 重构 | 原有 99 / 66 全过 |
| water | R-5 实时水位叠加 | 新增 `river/stationMetrics.ts`：`parseWaterMessage()`（精简键 `{f,wl,rf,fr,ts}` 与完整键双支持）、`applyMetricPatch()`（纯函数、不改入参）、`isOverWarning()`、`rainfallLevelOf()`、`stationSummary()`、`RAINFALL_COLORS`；`RiverSystem` 加 `updateStationMetrics()` / `parseStationMessage()` / `renderStationMetrics()` / `clearStationMetrics()` / `stationSummary()`，以及 `addLayerOnce()` / `removeLayerSafely()` 幂等工具 | ❌ → ✅ 已落地 | 18 |
| transport | TF-3 纠错 | 复核发现 `edgeTrend()` **本来就返回逐点序列**（`timestamps`/`speeds`/`flows`/`congestionTrend`），第四轮把它标为「缺图表层」属于**误判**：地图包本就不负责画折线图。改标 ✅ 并注明「折线图由集成方渲染」 | 🟡 → ✅（纠错） | — |

**验证**：`pnpm -r test` **693 个测试通过**（theme 42 / maplibre 98 / ai 108 / editor 33 / compute 38 / grid 58 / pipeline 99 / telecom 57 / transport 76 / water 84）；`pnpm -r build` 全量成功、0 类型错误。

### 本轮踩坑

1. **`export type { X } from '...'` 不引入本地绑定**：把 `MaintenanceRecord` 改为 re-export 后，本文件内的 `MaintenanceRecord[]` 直接编译不过 —— 必须同时 `import type { MaintenanceRecord } from '...'` 再 `export type { MaintenanceRecord };`。
2. **改 maplibre 必须重建**：新增 `cardFields.ts` 后若只跑下游包的测试，拿到的是旧 dist（memory 里已有的坑，本轮再次验证）。顺序是：先 `build maplibre`，再跑全量。
3. **PRD 状态也可能错标**：第四轮凭子代理结论把 TF-3 标为「缺图表层」，实际数据层已完整。状态标注必须**回源码核对**，不能只依赖二手结论。

### 剩余

- **telecom NH-4** 故障根因分析（`guessFaultReason()` 为启发式，需真实故障数据模型 —— 建议先补数据结构再谈算法）
- **compute C-4** 资源调度分配（业务规则待定，需产品决策）
- 各包「UI 外壳」类条目（G-2/R-2/P-3 的卡片面板、TF-3/LM-3/LH-4 的图表渲染）按架构约定交由集成方实现，PRD 中已逐条注明

---

## 十、第六轮修复记录（2026-08-28）：NH-4 多因子诊断 + C-4 分配策略 —— 审计遗留全部闭环

| 包 | 项目 | 内容 | 状态变化 | 单测 |
|----|------|------|----------|------|
| telecom | NH-4 故障根因分析 | 新增 `health/faultDiagnosis.ts`：把原 `guessFaultReason()` 的 if-else 链（只返回首个原因、阈值硬编码）升级为**多因子证据链** —— 收集全部命中因子（吞吐偏低/用户过载/功率异常），每条附证据文案（实际值 vs 阈值）；按严重度排序取主因 + 置信度；**区域聚集检测**（同区域 ≥2 站同时故障 → 判定区域性断电/传输中断，且该判定**优先于单站指标**，因为全局原因能解释局部异常、反之不成立）；全部阈值可配（`FaultDiagnosisOptions`）。`NetworkHealth` 加 `faultDiagnosis()` / `diagnoseFaults()`，`guessFaultReason()` 转为公开兼容方法（委托主因文案） | 🟡 → ✅ 已落地 | 20 |
| compute | C-4 资源调度分配 | 新增 `nodes/assignment.ts`：`assignTask()` / `assignTasks()` / `nodeCapacity()`，**三种可插拔策略** —— `balanced`（剩余算力占比最大者优先，通用兜底）/ `nearest`（就近，复用 `recommendBestNode`）/ `capacity`（总算力最大，大任务场景）；支持 region/types 过滤、offline 剔除、同区无候选时宽松跨区重试；失败返回结构化原因（`no-candidate` / `insufficient-capacity`）不抛错。纯函数不回写数据集 | 🟡（分配数据层补齐，面板 UI 待集成方） | 12 |

**边界声明**：NH-4 是基于基站实时属性的**规则诊断**，能回答"数据显示哪些指标异常"，不能替代运营商告警根因库与设备侧告警；C-4 的 balanced/nearest/capacity 是**演示级通用策略**，计费、配额、租户隔离等真实业务规则应由上层业务系统实现。两者都已在代码注释与 PRD 中注明。

**验证**：`pnpm -r test` **705 个测试通过**（theme 42 / maplibre 98 / ai 108 / editor 33 / compute 50 / grid 58 / pipeline 99 / telecom 77 / transport 76 / water 84）；`pnpm -r build` 0 类型错误。

### 本轮踩坑

1. **区域聚集检测会改变主因判定**：新测试用例里三站同区域，聚集（critical）压过了单站功率异常 —— 初看像 bug，实为**正确的诊断语义**。测试期望应随设计意图修正，而不是"改到绿为止"；为此补了一个专门用例锁定该语义（聚集优先于单站指标）。
2. **复用前先核对签名**：`nearest` 策略里按记忆调用 `recommendBestNode()`（以为返回单个对象），实际返回**排序数组**且入参字段更少 —— 写跨模块调用时先 `grep` 目标函数签名，别凭上一轮的印象。

### 审计遗留全部闭环

至此，PRD 完善度审计（§一～§四）与六轮修复（§六～§十）全部完成：

| 审计编号 | 问题 | 状态 |
|----------|------|------|
| C1 缺状态标注 | 7 份 PRD 零标注 | ✅ 全部回填（含后续功能落地的状态同步） |
| C2 缺验收标准 | 4 份 PRD 无验收 | ✅ 已补齐（交通/算力/通信/电网等各章） |
| C3 实现领先 PRD | capacity/station3d/realtime/transit 等 11 项 | ✅ 已回填 PRD 并补 demo/docs |
| C4 命名编号不一致 | 主题名/章节错引/函数名 | ✅ 已统一（以代码为准，PRD 标注偏差） |
| C5 幽灵包 | `@caoguo/map-components` 不存在 | ✅ 方案 A：并入 `visual-editor.md` §14，原 PRD 归档 |
| C6 无 PRD 索引 | 11 份文档无入口 | ✅ `docs/prd/README.md` |
| 附带 | `--no-clean` 垃圾目录 | ✅ 已清理并加 .gitignore |

**仍然开放的（非审计遗留，属产品决策/集成工作）**：
- 各包「UI 外壳」条目（G-2/R-2/P-3 卡片面板、TF-3/LM-3/LH-4 图表）—— 架构约定交集成方，PRD 已注明；
- water `DamOperation` 的 DO-4 多方案对比 / DO-5 调度甘特图（P1/P2，未排期）；
- telecom `§5.3` 与编辑器的集成方式说明。

---

## 十一、第七轮修复记录（2026-08-28）：UI 外壳 + DO-4/DO-5 + §5.3 集成说明 —— 开放项全部处理

用户指定处理的三类开放项全部完成：

### 1. UI 外壳（G-2 / R-2 / P-3 卡片 + TF-3 / LM-3 / LH-4 图表数据）

遵循「算法纯函数 + 渲染薄壳」架构，外壳以**零依赖**形态提供（不引入 Vue/图表库）：

| 交付物 | 位置 | 说明 |
|--------|------|------|
| 卡片 HTML 生成 | `@caoguo/maplibre` `cardFields.ts` → `renderCardHtml(card, opts)` + `CardModel` | 纯字符串输出（防注入转义），`inline`（默认，极简内联样式开箱可读）/ `class`（`cg-card__*` 类名，注释附默认 CSS）双模式 |
| 三包卡片封装 | `GridTopology.renderCardHtml(id)` / `PipelineTopology.renderNodeCardHtml(id)` + `renderPipeCardHtml(id)` / `RiverSystem.renderReservoirCardHtml(id)` | detail → CardModel 转换 + 状态配色（故障红/检修黄/正常绿，water 超警戒红色强调条） |
| 图表数据转换 | transport `edgeTrendToChartDataset()` / compute `latencyTrendToChartDataset()` / grid `loadForecastToChartDataset()` | 统一输出 ECharts / Chart.js 直接可用的 `{ xAxis, series }`；grid 版支持**预测/实测双序列按时间轴对齐**（缺失点为 null） |

「卡片面板 / 折线图组件」的富交互版本仍由集成方实现 —— 但现在集成方拿到的是**可直接 innerHTML 的 HTML** 与**可直接 setOption 的数据**，而非裸数据结构。

### 2. water DO-4 / DO-5（❌→✅）

新增 `dam/scheduleAnalysis.ts`：
- **DO-4** `compareDamSchedules(dataset, plans, rankBy)`：多方案批量推演，输出「水库×方案蓄水率矩阵」「水位站×方案扰动矩阵」；排名口径二选一（`minDownstreamChange` 下游扰动最小 / `maxStorageGain` 蓄水改善最大）—— **不擅自宣布"最优方案"**，口径由调用方选择；
- **DO-5** `simulateDamTimeline()`（把出库调整按时间步推进，复用 `updateStorageRate`，蓄水率钳制 [0,1]）+ `buildDamGantt()`（按蓄泄状态把序列切段，段并集覆盖全部时间步）。

### 3. telecom §5.3 与编辑器集成说明

`phase-3` PRD §5.3 补充集成方式对照表：**组件拼装**（编辑器画布 + 品牌主题 + 数据源绑定，零代码）vs **代码深定**（直接用 telecom 组件 + 运营商色板），两条路径共享 `CARRIER_THEMES` 保证视觉一致；并注明「运营商大屏模板」尚未沉淀到编辑器 `templates/`。

**验证**：`pnpm -r test` **721 个测试通过**（maplibre 103 含卡片渲染 14 例、water 94 含 DO-4/DO-5 10 例）；`pnpm -r build` 全量成功 0 类型错误。

### 本轮踩坑（第 3 次同类翻车，升级为强约定）

**python 批量替换的锚点复用问题**：给 `RiverSystem` 插入方法时，addition 末尾包含锚点行（`onFeatureSelect...`），又被 `addition + anchor` 多拼了一次 → 生成**双方法签名**，语法损坏。此前两轮也发生过（第八轮的双 onFeatureSelect、第十四轮的类似问题）。**强约定：插入式替换的 addition 结尾绝不能再包含锚点文本**；多轮对同一文件插入时，每轮插入后立即跑一次该包测试，不要攒到最后统一验证。本轮因攒批导致 water 测试失败才发现。

另外 `replaceAll` 在 maplibre 的低 lib target 下不可用（TS2550），统一用全局正则 `replace(/x/g, ...)`。
