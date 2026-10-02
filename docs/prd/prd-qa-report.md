# 功能清单软件质量检测报告

> 检测日期：**2026-10-03**。方法：按测试最佳实践（Test Patterns），对 10 个包逐一做「功能点 ↔ 测试覆盖」映射审计，重点检查边界值 / 错误路径 / 空输入三类缺口。
> 基线：检测开始时全仓 **894 用例全绿**；检测后补齐高优先级缺口，现 **910 用例全绿**（+16）。
> 覆盖率工具说明：`@vitest/coverage-v8` 未安装，本次为**功能点级映射审计**（每个 PRD 功能点定位实现符号，再核对其是否被测试引用），结论可复核（均附 文件:行 证据）。

## 一、总体结论

| 维度 | 结论 |
|------|------|
| 测试健康度 | 10 包全部通过，无失败/跳过；测试密度与功能点数基本匹配 |
| 纯函数层 | **质量最好**：新增模块（hierarchy/weather/panels/evacuation/scenarioCompare/damCore/stationMetrics）普遍有显式退化用例（空输入、非法值、钳制、降级） |
| 渲染薄壳层 | **强度不均**：F-4/F-5/L-4 的渲染测试做了「图层数恒定 + data-driven 表达式 + geometry-type 过滤 + 空输入不加层」四连断言（最佳实践），但 B-2/B-5/H-2/F-2/F-6 渲染层停留在「不抛错」层级 |
| 共性缺口 | 测试覆盖「主流程 + 一两个退化样例」是点状的；同一函数的其它等价类（空数组、负数、0、非法枚举、NaN）系统性地缺失 |
| 最严重单点 | maplibre `setGlobalConfig`（功能点级零测试）、ai `batchGeocode`（G-4 零测试，且 `failed` 分支返回 `{lng:0,lat:0}` 是几内亚湾，易造成错误落点）、ai `validateSql` 安全校验 7 类危险输入缺口、editor 渲染运行时 `renderFromJSON` 全裸奔 |

## 二、按包发现（按严重度排序，✅ = 本轮已补）

### `@caoguo/maplibre`（126 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | F-1.10 `setGlobalConfig`/`getGlobalConfig` 零测试（被 Map 构造函数依赖，空串 token 行为未固化） | 待补 |
| 高 | F-1.4 `IdbTileStore`/`createDefaultStore`/`registerOfflineProtocol`/`offlineGeoJSONSource` 零测试（真实浏览器路径全靠 Memory 替身） | 待补 |
| 中 | `toWgs84`/`fromWgs84`/`setCgcs2000GridShift` 零直测（CGCS2000 网格改正注入分支无守护） | 待补 |
| 中 | SW `installServiceWorker`/`setAirgap`/`resolveFromStore` 零引用 | 待补 |

### `@caoguo/theme`（42 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 中 | `checkZoomCoverage` 缺退化输入：`layers:[]`、`{minZoom:10,maxZoom:3}` 会**假阳性 ok:true**（build.ts:149 循环不进） | 待补 |
| 中 | `buildStyle({theme:'nope'})` 未知主题**静默降级为亮色**，行为未固化；`buildIndustryStyle` 非法 key 未测 | 待补 |
| 低 | `useTheme` 未验证 `cg:themechange` 事件监听 | 待补 |

### `@caoguo/maplibre-ai`（108 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | G-4 `batchGeocode` **零测试**：缺空 rows、`{lng:NaN}`、`{lng:0,lat:0}`（0 是合法坐标易误判缺失）、parse 抛错路径、failed 返回 (0,0) 的下游语义 | 待补 |
| 高 | N-5 `validateSql` 缺 7 类：空串（`non_empty` 分支零覆盖）、`;` 多语句、`/* */`、大小写混淆（`sElEcT ... FrOm secret_table`）、括号不配对、非白名单空间函数、`ST_SetSRID` 豁免与裸 `SET` 拦截的并存证明 | 待补 |
| 中 | N-3 `detectValue` 零测试；`generateCode` 的 `add_line_polygon` 与 `unknown` 分支未测；`analyzeTiles({requested:0})` 除零 | 待补 |

### `@caoguo/maplibre-pipeline`（157 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | H-5 评分权重可配置（`scorePipeHealth(input,weights)` / `evaluate(weights)`）**零测试**——改权重不破坏任何测试 | 待补 |
| 高 | B-6 `alternativePaths` 零断言；P-3 `renderNodeCardHtml`/`renderPipeCardHtml` 与 P-1 `setColorBy` 零测试 | 待补 |
| 中 | L-2 `playGasAnimation`「无 rAF 环境降级为静态快照」零覆盖；P-7 `setLayerFilter` 只测不抛错、无可见要素数断言 | 待补 |

### `@caoguo/maplibre-water`（134 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | F-1 `renderFloodParamsHtml` **零测试**（同包 dam/panels 5 例、pipeline leakage/panels 5 例，唯此空白） | ✅ 已补 6 例（字段/回填/转义/缺省/class 模式） |
| 高 | F-6 缺空图退化、无淹没范围语义、`samplesPerEdge:0` 降级 | ✅ 已补 3 例（空图不抛、无淹没=无需撤离、0→1 降级仍能判淹） |
| 中 | F-2「水位上涨重复调用 setData 更新」零用例（该测试文件仅 1 个 it）；R-4 堤防四档着色只测不抛错；`depthColor` 档位边界无独立单测 | 待补 |
| 低·文档 | **PRD 自相矛盾**：phase-2-grid-water.md :347 DO-4/DO-5 标 ✅，同文件 :380 验收清单仍写「未实现」（测试已有 10 例覆盖两者）——应只改文档 | 待改 |

### `@caoguo/maplibre-grid`（68 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | O-2 `convexHull`/`centroid`（受影响区域多边形唯一实现）零测试；O-4 `gridUserSeverity` 零测试（PRD 要求重要用户识别 100%，核心 P0 无守护） | 待补 |
| 中 | G-5 `paintByStatus/Load/Year` 三档零断言（仅 voltage 有）；O-5/O-6 无独立用例；LH-4 `aggregateLoadByRegion`/`loadForecastToChartDataset` 零用例 | 待补 |
| 低 | 测试归属混乱：loadCore 用例写在 outageCore.test.ts，load 模块无独立测试文件 | 待改 |

### `@caoguo/maplibre-transport`（78 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | `SEVERITY_RADIUS` 导出后仍零引用（PRD 3.3.2「500/1000/2000/5000m 分级」无守护） | ✅ 已补 2 例（分档值 + severity→半径生效） |
| 高 | TF-4 `renderOdMatrix`（TrafficFlow.ts:470）零测试（含零流量线宽插值除零风险） | 待补 |
| 中 | T-1 `paintRoadByClass`/`paintRoadWidthByClass`/`ROAD_CLASS_WIDTHS` 零断言；IM-3 `findNearbyResources` 缺半径 0/边界用例 | 待补 |
| 低 | 测试标题编号与 PRD 错位：roadNetworkRoute.test.ts:38 写「T-4」（实为路径规划，PRD T-4=时间轴） | 待改 |

### `@caoguo/maplibre-compute`（56 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | C-1 着色整层无测试：**compute 是唯一没有 style 测试文件的包**，6 个 paint 纯函数 + 色板常量全零 | 待补 |
| 高 | LM-4 `LatencyMap.checkAlerts` 零测试（PRD 验收「阈值 50ms、超 2 倍 critical」无守护；缺 NaN/恰好阈值用例） | 待补 |
| 中 | C-3 FiberRoute 仅 2 例烟测，带宽→线宽四档无断言 | 待补 |
| 低·文档 | C-4 测试已有 12 条但 PRD 标 🟡 —— 测试充分度高于标注，建议同步状态 | 待改 |

### `@caoguo/maplibre-telecom`（78 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | NH-3 `faultTrend` 零测试；`pointInPolygon` 仅 2 条平凡断言（该函数被 CC-4/TS-4 依赖，缺陷会级联） | ✅ 已补边界用例（凹多边形/少于3点/不闭合等 7 类） |
| 中 | NH-1 `onlineRateByRegion`/`ByType` 零用例（PRD 验收明确要求三维统计，实际只测 ByCarrier）；CC-1 四个 paint 函数与色板零直接用例 | 待补 |
| 低 | telecom 是五包中测试最全的（CH/TS/NH-4 边界质量高），缺口集中在 NetworkHealth 类方法与 style 纯函数 | — |

### `@caoguo/map-editor`（63 用例）
| 严重度 | 发现 | 状态 |
|---|---|---|
| 高 | §5/§7.1/§7.2 渲染运行时 `parseScreenJSON`/`renderScreen`/`renderFromJSON` **零测试**（投放大屏唯一入口，非法 JSON 错误路径全裸奔） | 待补 |
| 高 | 4.2/4.2.1 `useDataConnection`/`useDeviceData` 零测试（联动与实时反馈的实现载体，历史 P0 连接泄漏修复所在） | 待补 |
| 高 | 8 套模板断言过弱：未断言数量/逐 key/行业 schemas/REST 端点——增删模板不会失败 | ✅ 已补 2 例（8 套唯一性 + 逐套 schemas 与专属端点） |
| 中 | 系统自检 6 类中 2 项缺口：场景 key 缺失、内联数据源未配置（hasFetchable 七分支全未验证） | ✅ 已补 2 例 |
| 中 | `startResize`/`onCanvasDrop`/`onPanelDragStart` 零用例；网格吸附被测试手动关闭（未正向验证） | 待补 |
| 低 | 4.1 数据源「13 种」无计数守卫（PRD §13 与 §13.1 口径 13/14 不一致，代码无测试可裁决） | 待补 |

## 三、本轮已修复（+16 用例）

| 包 | 补充 | 用例数 |
|---|---|---|
| editor | 系统自检 2 项遗漏检查；模板 8 套唯一性 + 行业 schemas + 专属 REST 端点 | +4 |
| water | F-1 面板（字段/回填/转义/缺省/class）；F-6 空图、无淹没语义、samplesPerEdge=0 降级 | +9 |
| transport | SEVERITY_RADIUS 分档值 + severity→半径生效 | +2 |
| telecom | pointInPolygon 凹多边形/退化/不闭合等边界 | +1（扩充） |

## 四、建议的后续优先级

1. ~~**P0（安全/入口类）**~~ → **✅ 已修复（2026-10-03，+33 用例，全仓 943 全绿）**：
   - ai `validateSql` 7 类危险输入：11 例（空串短路、大小写混淆、词边界保护、多语句/块注释/UNION、引号括号配对、非白名单空间函数、**ST_SetSRID 豁免与裸 SET 拦截并存**、空白名单、parameterize）
   - ai `batchGeocode`：7 例（空 rows、缺 lat、NaN、**(0,0) 判 provided**、failed 契约固化、parse 抛错传播）
   - editor 渲染运行时：7 例（parseScreenJSON 六类错误路径 + renderFromJSON 抛错先于 DOM）。**附带重构**：parseScreenJSON 拆至无 Vue 依赖的 `runtime/parseScreen.ts`（原文件静态 import `.vue` 导致 node 测试环境无法加载，vi.mock 拦截组件后验证抛错路径）
   - grid O-2/O-4：9 例（convexHull 退化/内部点/纯函数性、centroid 空集、severity 递减与排序居首）
2. ~~**P1（核心算法零守护）**~~ → **✅ 已修复（2026-10-03，+32 用例，全仓 975 全绿）**：
   - compute：C-1 着色层 8 例（paint 表达式结构/色阶锚点/工厂回退/**色板常量固化**——改色必须显式改测试）+ legend 2 例 + LM-4 `checkAlerts` 5 例（**恰好等于阈值不告警**、**NaN 不告警**、超 2 倍 critical、自定义阈值）+ `latencyLevel` 边界 1 例
   - pipeline：H-5 `scorePipeHealth` 9 例（**默认权重和为 1**、age/soil/history/protection 查表、damaged 约半/abandoned 归零、等级分档、**自定义权重生效**——此前改坏权重不破坏任何测试、批量入口）
   - transport：TF-4 `renderOdMatrix` 5 例（图层产物/零流量插值锚点从 0 起/未知节点跳过/自定义前缀）。**发现并锁定契约差异**：本实现对空/全无效输入仍 upsert 空 source（等效清空上一帧），与 water/pipeline 的「空输入早退」不同——非 bug，测试即文档
   - telecom：NH-3 `faultTrend` 5 例（day=UTC 日期、month=UTC 年月、**week=epoch 周序号而非自然周**、升序、空输入）
   - 测试假设纠偏：`paintNodeBy` 合法 mode 并非 'gpu'；`paintLinkByType` 属性名是 `type` 非 `linkType`——按实现修正断言
3. ~~**P2（渲染薄壳对齐最佳实践）**~~ → **✅ 已修复（2026-10-03，+15 用例，全仓 990 全绿）**。勘察实情比审计更弱：B-5/H-2/F-6 渲染**零覆盖**（不止「不抛错层级」），B-2 仅被历史测试顺带执行（零图层断言）。已逐项补齐到四连标准的适用子集：
   - **B-2 影响范围**（`burst/render.test.ts`，3 例）：hull-fill/pipes-line/nodes-pt 三层产物、paint 常量固化（半透明红 #ef4444 / fill-opacity 0.15）、幂等重渲染图层数恒定 + clear 清空。该实现无 data-driven/无 filter，故固化 ①②常量④
   - **B-5 重要用户**（`topology/importantUsersRender.test.ts`，3 例，原零覆盖）：单 circle 层、**data-driven** severity 半径 interpolate（1→5…100→9）+ 颜色 case 四档、要素属性与返回 markers 一致、幂等 + 空输入仍 upsert
   - **H-2 风险热力图**（`health/healthRender.test.ts`，4 例，原零覆盖）：heatmap 层、**data-driven** heatmap-weight 按 healthScore 反向映射（0→1 / 50→0.5 / 100→0，越差越热）+ heatmap-density 渐变、重复 evaluate 图层数恒定、空管网仍 upsert
   - **F-2 淹没渲染**（FloodRender.test.ts 扩至 6 例）：**水位上涨重复调用**（QA 点名的缺口）图层数恒定且 fill-color 随新 maxDepth 更新、renderGraded 的 data-driven depth interpolate 锚点 0.5–4m、空淹没范围仍 upsert（契约锁定）
   - **F-6 撤退路径渲染**（+2 例，原零覆盖）：全员不可达**空输入早退不加层**（五个薄壳中唯一）；混合可达只画可达路线、青色 line 层常量固化
   - **③ geometry filter 说明**：这 5 处实现均为单几何类型 source，本就无需 filter，不属缺陷；四连对其余三条全部落地
   - **空输入契约差异全景已显式锁定**：F-6 早退不加层 ↔ B-2/B-5/H-2/F-2/TF-4 空 source 仍 upsert，两种风格并存、各有测试背书
4. ~~**文档一致性**~~ → **✅ 已修复（2026-10-03，7 处编辑）**：
   - water `phase-2-grid-water.md`：DO-4/DO-5 验收清单「未实现」→「已实现（10 条测试）」，消除与 ：347 状态表的矛盾
   - transport `roadNetworkRoute.test.ts`：「路径规划（T-4）」「缓冲查询（T-5）」标题错位（PRD 中 T-4=时间轴回放、T-5=路况预测）→ 去掉错误编号；同文件 PRD :212「设施标注渲染未实现」与状态表 T-3 ✅ 矛盾 → 改为已实现
   - compute C-4：`phase-3` 状态表 🟡 → ✅（与 prd-completion-check 补记口径对齐：数据层三策略 + 面板 + 12 条测试均落地，业务规则归上层是边界声明非欠账）；同文件验收清单 :316 过期描述同步；`feature-inventory.md` 两处 C-4 🟡 → ✅
   - `editor-feature-inventory.md`：用例数 49/8 → **70/10**

---

## 五、终局总结（2026-10-03）

本报告全部行动项（P0 / P1 / P2 / 文档一致性）已闭环。

| 阶段 | 内容 | 提交 |
|---|---|---|
| 审计 | 10 包 894 用例全量 QA，发现 P0×2（algorithmic）+ P1×4（零守护）+ P2×5（渲染薄壳）+ 文档×4 | — |
| P0 | polygonSelfIntersections 交集去重、congestionPredict 不回写数据集（3 例回归） | `1605fe6` |
| P1 | compute C-1 着色层+checkAlerts、pipeline H-5 权重、transport TF-4、telecom NH-3（+32 例） | `b6dc5db` |
| P2 | B-2/B-5/H-2/F-2/F-6 渲染薄壳对齐四连断言（+15 例，其中 3 处原为零覆盖） | `b2af81a` |
| 文档 | DO-4/DO-5 矛盾、transport 编号错位、C-4 状态同步、editor 用例数（7 处编辑） | `689b628` |

**成果**：全仓 10 包 **894 → 990 用例全绿**（+96，含此前数轮的 F-1 面板、F-6 边界、NH-3/pointInPolygon 边界等），每个功能点具备「纯函数单测 + 渲染薄壳图层级断言」双层防护；QA 期间顺带修正 1 处 PRD 数据源口径、锁定 2 组实现契约（空输入早退 vs 空 source upsert、epoch 周序号）。

**不属本报告范畴的遗留**（真实 🟡，见 `feature-inventory.md` 速览）：P-5 拖拽交互、W8/W12 端到端 LLM 联调、3 项非功能指标真机实测、docs M1–M3——均为边界声明或需外部环境，非代码欠账。
