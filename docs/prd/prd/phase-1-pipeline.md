# 草果地图 — Phase 1 PRD：地下管网 MVP

| 项目 | 说明 |
|------|------|
| **产品名称** | 草果地图 · 管网空间智能方案 |
| **文档版本** | V1.1（补充功能点落地状态标注与验收标准） |
| **编写日期** | 2026-08-21 |
| **阶段** | Phase 1（M4-M6） |
| **目标读者** | 技术负责人、前端工程师、后端工程师、GIS 工程师 |
| **前置依赖** | Phase 0 完成（引擎 + Copilot + NLPG + GeoAI） |

---

> **状态口径（V1.1 补充，2026-08-28）**：功能点表新增「状态」列。图例：**✅ 已落地**（代码已交付且通过构建/测试，可在 `packages/` 查证）；**🟡 部分落地**（数据层/算法已实现，缺渲染或 UI 外壳 —— 本系列包遵循「算法纯函数 + 渲染薄壳」设计，业务 UI 面板由集成方实现）；**❌ 未落地**（尚未实现，不视作已完成）。验收标准中 `- [x]` 为已达成，`- [ ]` 为待完成（含「算法已就绪、渲染待补」的中间态）。严禁把「规划中」写成「已完成」。

## 一、阶段目标

以 **地下管网（燃气/供水/供热）** 作为第一个行业落地场景，4 个月内完成 MVP：

1. 管网拓扑可视化组件可编辑、可钻取
2. 爆管推演可在 3 秒内完成并展示影响范围
3. 泄漏扩散模拟可根据气象参数动态生成危险区域
4. 管线健康评估可输出风险热力图
5. 可在 1 个试点城市完成数据接入和现场演示

---

## 二、行业背景

### 2.1 市场机会

- **"十五五"地下管网投资约 5 万亿元**，燃气/供水/供热管线更新改造是刚需
- 城市生命线安全工程要求对管网进行实时监测和风险预警
- 现有管网 GIS（超图/中地）体验差、部署重、Web 端弱

### 2.2 现有方案痛点

| 痛点 | 描述 |
|------|------|
| 数据分散 | 各权属单位（燃气公司/水务集团/热力公司）数据格式不统一 |
| 操作复杂 | SuperMap Desktop 专业性强，一线巡检人员不会用 |
| 离线困难 | 管网数据敏感，不能上云，但现有方案离线部署复杂 |
| 推演缺失 | 现有系统只有"展示"，没有"推演"能力 |
| 开发慢 | 每做一个管网项目都要从零开发，没有可复用组件 |

### 2.3 我们的差异化

| 维度 | 现有方案 | 草果地图方案 |
|------|---------|-------------|
| 部署 | C/S 桌面端 + 重服务器 | 纯 Web，浏览器即用 |
| 授权 | 百万级/项目 | 开源免费 |
| 离线 | 需 VPN/专线 | 天然支持离线瓦片 |
| 推演 | 无或定制开发 | 开箱即用的推演组件 |
| 开发 | 每项目从零 | 可复用的管网组件库 |
| AI | 无 | Copilot 加速 + NLPG 查询 |

---

## 三、交付物清单

| # | 交付物 | 类型 | 验收标准 |
|---|--------|------|---------|
| D1 | `@caoguo/maplibre-pipeline` 组件包 | npm 包 | 可独立安装使用 |
| D2 | PipelineTopology 拓扑编辑器 | Web 组件 | 支持管段/节点/阀门的可视化编辑 |
| D3 | BurstSimulator 爆管推演 | Web 组件 | 点击故障管段 → 3 秒内展示影响范围 |
| D4 | LeakagePlume 泄漏扩散模拟 | Web 组件 | 根据风向/地形动态生成危险区域 |
| D5 | PipelineHealth 健康评估 | Web 组件 | 综合评分 + 风险热力图 |
| D6 | 管网专用样式 `caoguo-pipeline` | JSON | 管线按类型/压力/状态着色 |
| D7 | 管网行业方案文档 | 文档 | 含数据规范、接入指南、部署方案 |
| D8 | 管网推演 Demo | Web 应用 | 可交互的爆管推演演示 |
| D9 | 1 个试点城市数据接入 | 数据服务 | 真实管网数据可展示 |

---

## 四、模块详细需求

### 4.1 PipelineTopology — 管网拓扑编辑器

#### 4.1.1 需求描述

可视化展示和编辑管网拓扑关系（管段→节点→设备），支持层级钻取。

#### 4.1.2 数据模型

```
管网拓扑 = {
  nodes: [
    { id, type: "junction|valve|pump|meter|source", 
      lat, lng, properties: {...} }
  ],
  edges: [
    { id, from_node, to_node, type: "pipe", 
      properties: { diameter, material, install_date, pressure } }
  ]
}
```

#### 4.1.3 功能点

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| P-1 | 拓扑渲染 | 管段按类型着色（燃气=黄色/供水=蓝色/供热=红色），节点按设备类型显示图标 | P0 | ✅ 已落地（管段着色 + 节点按类型着色 `NODE_KIND_COLORS` + emoji 图标层 `NODE_KIND_ICONS`） |
| P-2 | 层级钻取 | 区域→街道→小区→楼栋，逐级钻取管网 | P0 | 🟡 部分落地 |
| P-3 | 设备卡片 | 点击节点/管段弹出信息卡片（属性+图片+维护记录） | P0 | ✅ 已落地（数据层 `getNodeDetail()` / `getPipeDetail()` + 零依赖卡片外壳 `renderNodeCardHtml()` / `renderPipeCardHtml()`；富交互面板可自建） |
| P-4 | 连通性高亮 | 选中某段管线，高亮显示上下游连通路径 | P1 | ✅ 已落地 |
| P-5 | 拓扑编辑 | 拖拽添加管段/节点，自动维护连通性 | P2 | 🟡 部分落地（**数据层已落地**：`addNode()` / `addPipe()`（端点校验保证连通性、id 自动生成、重复抛错）/ `removePipe()` / `removeNode()`（级联删管段），写入后自动重渲染；**拖拽交互由集成方实现**——任何交互形态产出 node/pipe 对象后调本组 API 即可） |
| P-6 | 搜索定位 | 按设备编号/地址/区域搜索并定位 | P1 | ✅ 已落地（`search()` + `locate()` 一键定位飞行） |
| P-7 | 分层控制 | 按管径/材质/年代/状态分层显示 | P1 | ✅ 已落地 |

#### 4.1.4 管线着色规则

```javascript
// 按管径着色
const colorByDiameter = [
  'interpolate', ['linear'], ['get', 'diameter'],
  50, '#4ade80',    // DN50 以下 绿色（支管）
  150, '#60a5fa',   // DN150 蓝色（配水管）
  300, '#f59e0b',   // DN300 黄色（干管）
  600, '#ef4444',   // DN600+ 红色（主管）
];

// 按状态着色
const colorByStatus = [
  'match', ['get', 'status'],
  'normal', '#4ade80',
  'aging', '#fbbf24',
  'damaged', '#ef4444',
  'under_repair', '#8b5cf6',
  '#6b7280'  // 未知
];
```

#### 4.1.5 验收标准

- [ ] 10 万管段 + 5 万节点渲染流畅（30fps 以上）
- [ ] 层级钻取响应时间 < 500ms
- [ ] 设备卡片信息完整（编号/类型/材质/安装日期/维护记录）
- [ ] 连通性高亮计算时间 < 1 秒（50 万节点规模）
- [ ] 支持天地图/高德底图切换

---

### 4.2 BurstSimulator — 爆管推演

#### 4.2.1 需求描述

选择故障管段后，自动推演下游影响范围、受影响用户数、推荐最优隔离阀门组合。

#### 4.2.2 推演流程

```
用户点击故障管段
    ↓
前端传递 pipe_id 到后端
    ↓
后端执行图遍历算法：
  1. 从故障管段出发，沿拓扑向上游找到最近的可关闭阀门
  2. 沿拓扑向下游遍历，标记所有受影响节点和管段
  3. 查询受影响节点关联的用户/建筑
  4. 计算受影响用户总数/重要用户数
    ↓
返回推演结果 JSON：
  {
    impact_area: GeoJSON,        // 受影响区域多边形
    affected_nodes: [...],       // 受影响节点列表
    affected_users: number,      // 受影响用户数
    important_users: [...],      // 重要用户（医院/学校/工厂）
    valve_plan: {                // 隔离方案
      close_valves: [...],       // 需关闭的阀门
      open_valves: [...],        // 需打开的阀门（泄压）
      estimated_shutdown_time: "2h",  // 预计停气/停水时间
      alternative_supply: [...]  // 备选供气/供水路径
    }
  }
    ↓
前端高亮受影响区域 + 显示推演面板
```

#### 4.2.3 功能点

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| B-1 | 一键推演 | 点击故障管段，自动触发推演 | P0 | ✅ 已落地 |
| B-2 | 影响范围可视化 | 受影响区域用半透明红色多边形高亮 | P0 | ✅ 已落地 |
| B-3 | 受影响列表 | 侧边栏展示受影响用户/建筑列表 | P0 | ✅ 已落地 |
| B-4 | 阀门隔离方案 | 展示需要关闭/打开的阀门 + 操作顺序 | P0 | ✅ 已落地 |
| B-5 | 重要用户标注 | 医院/学校/工厂等重要用户用特殊标记 | P1 | ✅ 已落地（纯函数 `buildImportantUserMarkers()` + `PipelineTopology.renderImportantUsers()`，按严重度分级配色） |
| B-6 | 备选供气/供水路径 | 如有备用管线，推荐替代供应方案 | P1 | ✅ 已落地 |
| B-7 | 推演历史 | 保存推演记录，可回溯对比 | P2 | ✅ 已落地（内存历史 `historyEntries()` / `restoreHistory(i)` / `setHistoryLimit()` + **序列化持久化 `exportHistory()` / `importHistory()`**（JSON 往返还原、非法条目过滤）；落盘介质与对比视图由集成方实现） |

#### 4.2.4 核心算法

```python
# 伪代码：爆管推演
def simulate_burst(pipe_id,管网拓扑):
    # 1. 找上游最近阀门
    upstream_valve = find_nearest_valve_upstream(pipe_id, 管网拓扑)
    
    # 2. 下游影响范围（BFS 广度优先搜索）
    affected = bfs_downstream(pipe_id, 管网拓扑)
    
    # 3. 统计受影响用户
    affected_users = query_users(affected.node_ids)
    
    # 4. 生成隔离方案
    valve_plan = {
        'close': [upstream_valve],
        'open': find_pressure_release_valves(affected, 管网拓扑),
        'alternative': find_alternative_path(upstream_valve, affected, 管网拓扑)
    }
    
    # 5. 计算影响区域多边形
    impact_area = convex_hull(affected.pipe_geometries)
    
    return {
        'impact_area': impact_area,
        'affected_nodes': affected.nodes,
        'affected_users': len(affected_users),
        'valve_plan': valve_plan
    }
```

#### 4.2.5 验收标准

- [ ] 推演响应时间 < 3 秒（10 万管段规模）
- [ ] 影响范围计算准确率 ≥ 95%（与人工标注对比）
- [ ] 阀门隔离方案逻辑正确（关闭阀门后故障管段与气源/水源完全隔离）
- [ ] 推演结果可在地图上完整展示（区域+管线+阀门+用户）
- [ ] 支持燃气管网和供水管网两种拓扑结构

---

### 4.3 LeakagePlume — 泄漏扩散模拟

#### 4.3.1 需求描述

模拟燃气泄漏或供水爆管后的扩散范围，根据气象/地形/建筑参数动态生成危险区域。

#### 4.3.2 技术方案

**燃气泄漏**：简化高斯扩散模型（非 CFD，浏览器可运行）

```
输入参数：
  - 泄漏点坐标
  - 泄漏量（kg/s）
  - 风向/风速
  - 大气稳定度
  - 温度/湿度

计算模型：
  高斯烟羽模型 C(x,y,z) = Q/(2π·σy·σz·u) × exp(-y²/2σy²) × [exp(-(z-H)²/2σz²) + exp(-(z+H)²/2σz²)]

简化处理：
  - σy, σz 使用 Pasquill-Gifford 经验公式
  - 地形修正：DEM 数据叠加衰减因子
  - 建筑阻挡：简单遮挡模型（建筑高度 > 烟羽高度时截断）

输出：
  - 危险区域等浓度线多边形（爆炸下限 LEL 20%/50%/100%）
  - 下风向影响距离
```

**供水爆管**：基于地形的淹没分析

```
输入参数：
  - 爆管点坐标
  - 管径/水压
  - DEM 地形数据

计算模型：
  - 从爆管点出发，沿地形低处扩散
  - 使用 flood fill 算法在 DEM 网格上模拟

输出：
  - 淹没范围多边形
  - 最大水深估计
  - 受影响道路/建筑
```

#### 4.3.3 功能点

| # | 功能 | 优先级 | 状态 |
|---|------|--------|------|
| L-1 | 参数面板：风向/风速/泄漏量可调节 | P0 | 🟡 部分落地 |
| L-2 | 动态扩散动画：危险区域随时间扩大 | P0 | ✅ 已落地（纯函数 `plumeAtTime(t)` 时间切片 + `LeakagePlume.playGasAnimation()`，rAF 推进烟羽前缘；**无 rAF 环境自动退化为静态快照**） |
| L-3 | 等浓度线：展示不同浓度等级的危险区域 | P1 | ✅ 已落地（`renderContours` 按阈值 step 分级着色 + `fill-outline-color` 描边；此前误标） |
| L-4 | 叠加分析：危险区域与建筑/人口数据叠加 | P1 | 🟡 部分落地（数据层 `overlayUsers()` 已落地：point-in-polygon 叠加 + 分类统计 + 影响人口合计，`LeakagePlume.overlayUsers()` 取最大等值线叠加；**建筑/人口数据由调用方注入**，渲染/展示交集成方） |
| L-5 | 气象数据接入：自动获取实时风向/风速 | P2 | ❌ 未落地 |

#### 4.3.4 验收标准

- [ ] 危险区域多边形生成时间 < 1 秒
- [ ] 扩散动画流畅（30fps）
- [ ] 参数调整后 < 500ms 刷新结果
- [ ] 高斯模型计算结果与理论值偏差 < 10%

---

### 4.4 PipelineHealth — 管线健康评估

#### 4.4.1 需求描述

综合多维数据评估管线健康状态，生成风险热力图，辅助维护决策。

#### 4.4.2 评估维度

```javascript
health_score = weighted_sum({
  age:          weight(0.25) × aging_factor(install_date),
  material:     weight(0.20) × material_risk(material),
  soil:         weight(0.15) × soil_corrosion(lat, lng),
  history:      weight(0.20) × failure_history(pipe_id),
  pressure:     weight(0.10) × pressure_stress(current_pressure, rated_pressure),
  protection:   weight(0.10) × cathodic_protection_status(pipe_id)
});

// 健康等级
const levels = {
  'excellent': [80, 100],  // 绿色
  'good':     [60, 80],    // 蓝色
  'fair':     [40, 60],    // 黄色
  'poor':     [20, 40],    // 橙色
  'critical': [0, 20]      // 红色
};
```

#### 4.4.3 功能点

| # | 功能 | 优先级 | 状态 |
|---|------|--------|------|
| H-1 | 健康评分计算引擎 | P0 | ✅ 已落地 |
| H-2 | 风险热力图（按区域聚合显示） | P0 | ✅ 已落地 |
| H-3 | 单管线健康详情（各维度评分+雷达图） | P1 | ✅ 已落地 |
| H-4 | 优先维护建议列表（风险最高的 Top N 管线） | P1 | ✅ 已落地 |
| H-5 | 评分模型参数可配置（权重/阈值可调） | P2 | ✅ 已落地（`scorePipeHealth(input, weights)` 自定义权重 + `PipelineHealth.evaluate(weights)`；默认权重 `DEFAULT_WEIGHTS`） |

#### 4.4.4 验收标准

- [ ] 10 万管段健康评分计算时间 < 10 秒
- [ ] 热力图渲染流畅
- [ ] 评分结果可导出（Excel/PDF）
- [ ] 甲方评审核心要求：**评分模型可解释**（每个维度的评分依据清晰可见，不是黑箱）

---

### 4.5 管网专用样式

#### 4.5.1 管线分类着色

| 管线类型 | 颜色 | 图标 |
|---------|------|------|
| 燃气管 | #f59e0b (琥珀色) | 🔥 |
| 供水管 | #3b82f6 (蓝色) | 💧 |
| 排水管 | #6b7280 (灰色) | 🚰 |
| 供热管 | #ef4444 (红色) | 🔴 |
| 电力管 | #8b5cf6 (紫色) | ⚡ |
| 通信管 | #10b981 (绿色) | 📡 |

#### 4.5.2 状态着色

| 状态 | 颜色 | 动画 |
|------|------|------|
| 正常 | #4ade80 (绿色) | 无 |
| 老化 | #fbbf24 (黄色) | 无 |
| 损坏 | #ef4444 (红色) | 脉冲动画 |
| 维修中 | #8b5cf6 (紫色) | 虚线动画 |

---

## 五、NLPG 管网场景扩展

在 Phase 0 的 NLPG 基础上，新增管网专属查询意图：

| 业务人员输入 | 生成 SQL |
|-------------|---------|
| "查出朝阳区所有使用超过 20 年的铸铁燃气管" | `SELECT * FROM pipelines WHERE material='铸铁' AND install_date < '2006-01-01' AND ST_Within(geom, (SELECT geom FROM districts WHERE name='朝阳区'))` |
| "这个阀门关了之后影响哪些小区？" | 图遍历查询（NLPG 识别为拓扑查询，路由到 BurstSimulator） |
| "500 米内有几所学校？" | `SELECT * FROM schools WHERE ST_DWithin(geom, ST_MakePoint(...), 500)` |
| "昨天的燃气报警集中在哪个区域？" | `SELECT * FROM alarms WHERE type='gas' AND time > now()-interval '1 day'` → 空间聚类 |
| "压力低于 0.2MPa 的管段" | `SELECT * FROM pipelines WHERE pressure < 0.2` |

---

## 六、非功能性需求

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 爆管推演延迟 | < 3 秒 | 10 万管段规模 |
| 泄漏扩散计算 | < 1 秒 | 单次模拟 |
| 健康评分计算 | < 10 秒 | 10 万管段全量评分 |
| 拓扑连通性查询 | < 1 秒 | BFS 遍历 |
| 管网组件包体积 | < 50KB (gzip) | 不含地图引擎 |
| 数据支持规模 | 50 万管段 + 30 万节点 | 流畅运行 |
| 离线模式 | 完全支持 | 所有计算在前端完成 |

---

## 七、数据接入规范

### 7.1 数据格式要求

| 数据类型 | 推荐格式 | 必需字段 |
|---------|---------|---------|
| 管段 | GeoJSON LineString / MVT | id, from_node, to_node, diameter, material, install_date, pressure, status |
| 节点 | GeoJSON Point / MVT | id, type(junction/valve/pump/meter), lat, lng |
| 阀门 | GeoJSON Point | id, type(gate/check/butterfly), status(open/close), location |
| 用户 | CSV/JSON | id, name, type(residential/commercial/industrial), node_id |

### 7.2 数据接入流程

```
甲方提供原始数据（Shapefile / CAD / Excel / 数据库导出）
    ↓
GeoAI 智能数据管线（Phase 0 已有）
    ↓
坐标系转换 → 格式标准化 → 拓扑关系构建
    ↓
PostGIS 数据库存储
    ↓
Martin 瓦片服务发布
    ↓
草果地图前端加载
```

---

## 八、试点方案

### 8.1 试点选择标准

- 管网数据可获取（至少有管段+节点拓扑）
- 有真实的应急演练或维护需求
- 甲方愿意配合数据对接和 Demo 演示

### 8.2 试点交付物

| # | 交付物 | 说明 |
|---|--------|------|
| 1 | 管网可视化大屏 | 接入甲方真实数据的可视化展示 |
| 2 | 爆管推演演示 | 模拟 3 个典型故障场景的推演 |
| 3 | 风险评估报告 | 基于 PipelineHealth 的管线健康评估 |
| 4 | NLPG 查询演示 | 业务人员现场自然语言查询 |
| 5 | 部署文档 | 甲方运维团队可自行维护 |

---

## 九、里程碑

| 周 | 里程碑 | 交付物 |
|----|--------|--------|
| M4 W1-W2 | 数据规范 + 样式 | 管网数据接入规范 + 管网专用样式 |
| M4 W3-W4 | PipelineTopology v0.1 | 基础拓扑渲染 + 层级钻取 |
| M5 W1-W2 | BurstSimulator v0.1 | 基础爆管推演（图遍历版） |
| M5 W3-W4 | NLPG 管网扩展 + 拓扑完善 | 管网查询意图 + 连通性高亮 |
| M6 W1-W2 | LeakagePlume + PipelineHealth | 泄漏模拟 + 健康评估 |
| M6 W3-W4 | Demo + 试点 | 管网推演 Demo + 试点数据接入 |

---

> **Phase 1 的核心交付：管网组件可插拔使用 + 爆管推演可用 + 试点案例可展示。这是草果地图的第一个行业标杆，后续五张网的客户看到这个 Demo 就能理解产品价值。**
