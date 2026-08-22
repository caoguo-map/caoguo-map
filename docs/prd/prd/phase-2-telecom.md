# 草果地图 — Phase 2 PRD：通信网容量热力图（CapacityHeatmap）

| 项目 | 说明 |
|------|------|
| **产品名称** | 草果地图 · 通信网空间智能方案（容量热力图专项） |
| **文档版本** | V1.0 |
| **编写日期** | 2026-08-22 |
| **阶段** | Phase 2（补充立项，原 `phase-3-transport-compute-telecom` 未细化容量专题） |
| **目标读者** | 技术负责人、前端工程师、GIS 工程师 |
| **前置依赖** | Phase 0（maplibre 引擎）+ `packages/telecom`（基站/健康度已落地） |

---

## 一、立项背景

`packages/telecom` 当前已具备：`CellCoverage`（覆盖/盲区/扇区）、`NetworkHealth`（在线率/告警/故障趋势）、`nlpg`（查询意图）。但**缺少容量维度可视化**——运维难以直观看到"哪些区域基站承载能力已逼近上限"。本专项补充 **CapacityHeatmap**，补齐通信网"覆盖—健康—容量"三视图。

> 说明：本专项为 Phase 2 补充立项（用户明确立项）。原 `phase-3-transport-compute-telecom.md` 仅概要提及通信，未定义容量热力图细节，故单独成文。

---

## 二、功能需求（CH 系列）

| 编号 | 功能 | 说明 | 验收 |
|------|------|------|------|
| CH-1 | 容量利用率热力图 | 基站吞吐/额定容量 → 容量利用率，热点图（高利用率=热） | 渲染出热力图层，权重=利用率 |
| CH-2 | 用户负载热力图 | userCount/容量 → 用户密度热点 | 可切换权重为用户负载 |
| CH-3 | 容量预警 | 利用率 > 80% 的基站高亮/标记 | 预警列表 + 地图高亮 |
| CH-4 | 数据层/UI 序列 | 输出卡片与折线序列（复用 P2-c `buildCapacitySeries`） | 纯函数可测 |

---

## 三、技术方案

- **数据层（纯函数）**：`capacity/capacityCore.ts`
  - `stationCapacityStats(stations)`：统计平均容量利用率、超载基站数
  - `capacityUtilizationPoints(stations, kind)`：生成热力图点集 GeoJSON（weight 按利用率/用户负载）
- **渲染层（薄壳）**：`CapacityHeatmap` 类（`packages/telecom`）
  - `render(kind)`：生成 maplibre heatmap 图层，kind ∈ `utilization` | `userLoad`
  - `clear()` / `destroy()`：图层清理
- **设计原则**：延续"算法纯函数 + 渲染薄壳"，零后端依赖，可离线运行。

---

## 四、验收指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 热力图渲染耗时 | < 1s（千级基站） | 纯前端计算 |
| 容量利用率计算正确率 | 100% | 单元覆盖 |
| 超载预警准确率 | 100%（阈值 80%） | 单元覆盖 |

---

## 五、进度标注

| 工作项 | 内容 | 状态 |
|--------|------|------|
| CH-1 | 容量利用率热力图 | ✅ 已落地（`capacity/capacityCore` + `CapacityHeatmap`） |
| CH-2 | 用户负载热力图 | ✅ 已落地（`render('userLoad')`） |
| CH-3 | 容量预警 | ✅ 已落地（`stationCapacityStats` 过滤 >0.8） |
| CH-4 | 数据层/UI 序列 | ✅ 沿用 P2-c `buildCapacitySeries` |

> 状态口径：代码层 ✅；端到端（真实基站数据接入/联调）随试点推进。
