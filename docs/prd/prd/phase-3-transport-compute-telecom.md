# 草果地图 — Phase 3 PRD：交通网、算力网、通信网

| 项目 | 说明 |
|------|------|
| **产品名称** | 草果地图 · 交通/算力/通信行业方案 |
| **文档版本** | V1.0 |
| **编写日期** | 2026-08-21 |
| **阶段** | Phase 3（M10-M12） |
| **目标读者** | 技术负责人、前端工程师、后端工程师 |
| **前置依赖** | Phase 0 + Phase 1 + Phase 2 完成 |

---

## 一、阶段目标

在前三阶段积累的共性底座和行业组件模板基础上，**快速覆盖剩余三张网**，4 个月内各完成 MVP：

**交通网**：路网实时路况 + 拥堵预测 + 事件响应
**算力网**：资源拓扑可视化 + 利用率监控 + 供需预测
**通信网**：基站覆盖分析 + 信号质量热力 + 品牌化大屏

同时完成 AI Debug 工具和样式生成器 v2，形成完整产品 GA。

---

## 二、为什么 Phase 3 可以更快

Phase 0-2 已经沉淀了：

| 已有资产 | 复用到 Phase 3 |
|---------|---------------|
| 引擎核心 + 样式系统 | 直接复用，无需改动 |
| NLPG 框架 | 新增查询意图即可（每个网 5-10 条） |
| MapCopilot | 直接复用 |
| GeoAI 数据入图 | 直接复用 |
| 行业组件模板（拓扑/推演/热力） | 路由改为交通/算力/通信的拓扑结构 |
| 样式模板 | 新增三套行业样式 |

**估计工时**：每个网 2-3 周（vs Phase 1 管网的 4 周），因为 70% 是模式复用。

---

## 三、交通网方案

### 3.1 RoadNetwork — 路网编辑器

#### 3.1.1 数据模型

```
路网拓扑 = {
  nodes: [
    { id, type: "intersection|toll|rest_area|service_area", 
      lat, lng, name, properties: {...} }
  ],
  edges: [
    { id, from_node, to_node, type: "highway|national|provincial|urban",
      properties: { road_name, lanes, speed_limit, length, status } }
  ]
}
```

#### 3.1.2 功能点

| # | 功能 | 优先级 |
|---|------|--------|
| T-1 | 路网渲染：按道路等级着色 + 宽度分级 | P0 |
| T-2 | 实时路况叠加：路段按速度着色（绿→黄→红） | P0 |
| T-3 | 设施标注：收费站/服务区/枢纽/停车场 | P0 |
| T-4 | 路况时间轴：拖动时间轴回放历史路况 | P1 |
| T-5 | 路况预测：未来 15/30/60 min 路况预测 | P1 |

#### 3.1.3 着色规则

```javascript
// 按道路等级着色（底图模式）
const colorByRoadClass = [
  'match', ['get', 'road_class'],
  'highway',    '#f59e0b',  // 高速 橙色
  'national',   '#ef4444',  // 国道 红色
  'provincial', '#8b5cf6',  // 省道 紫色
  'urban',      '#6b7280',  // 城市道路 灰色
  '#9ca3af'
];

// 按实时速度着色（路况模式）
const colorBySpeed = [
  'interpolate', ['linear'], ['get', 'speed'],
  0, '#ef4444',     // 停滞 红
  20, '#f59e0b',    // 拥堵 橙
  40, '#fbbf24',    // 缓行 黄
  60, '#4ade80',    // 畅通 绿
  80, '#22d3ee'     // 高速 青
];
```

### 3.2 TrafficFlow — 交通流量可视化

#### 3.2.1 功能点

| # | 功能 | 优先级 |
|---|------|--------|
| TF-1 | 路段流量/速度实时着色 | P0 |
| TF-2 | 拥堵传播动画（拥堵区域动态扩展） | P1 |
| TF-3 | 流量趋势图（折线图，选中路段展示） | P1 |
| TF-4 | OD 矩证可视化（起终点连线，宽度=流量） | P2 |

#### 3.2.2 拥堵预测模型

```python
# 基于历史同时段 + 实时趋势的简单预测
def predict_congestion(road_id, minutes_ahead):
    # 1. 历史同时段基准
    hist = get_historical_speed(road_id, same_time_last_week)
    
    # 2. 实时趋势（过去 30 分钟的变化率）
    recent = get_recent_speeds(road_id, minutes=30)
    trend = linear_regression_slope(recent)
    
    # 3. 预测
    predicted = hist + trend * minutes_ahead
    
    # 4. 置信区间
    std = get_historical_std(road_id, same_time_last_week)
    
    return {
        'speed': max(0, predicted),
        'confidence': max(0, 1 - minutes_ahead / 60),
        'congestion_level': classify_speed(predicted)
    }
```

### 3.3 IncidentMap — 事件响应图

#### 3.3.1 功能点

| # | 功能 | 优先级 |
|---|------|--------|
| IM-1 | 事件标记：事故/施工/管制/天气事件 | P0 |
| IM-2 | 影响范围：自动计算事件对路网的影响区域 | P0 |
| IM-3 | 附近资源：显示事件周边摄像头/救援站/医院 | P1 |
| IM-4 | 绕行方案：自动推荐替代路径 | P1 |
| IM-5 | 事件时间线：事件发生→处置→解除的时间轴 | P2 |

---

## 四、算力网方案

### 4.1 ComputeNodes — 算力节点地图

#### 4.1.1 数据模型

```
算力拓扑 = {
  nodes: [
    { id, type: "datacenter|edge_node|cloud_region",
      lat, lng, name,
      properties: {
        total_compute: "1000 TFLOPS",
        used_compute: "650 TFLOPS",
        gpu_count: 100,
        gpu_utilization: 0.65,
        storage: "10 PB",
        network_bandwidth: "100 Gbps",
        status: "online|offline|maintenance"
      }
    }
  ],
  links: [
    { id, from_node, to_node,
      properties: {
        bandwidth: "100 Gbps",
        latency_ms: 5,
        utilization: 0.3,
        type: "fiber|microwave|satellite"
      }
    }
  ]
}
```

#### 4.1.2 功能点

| # | 功能 | 优先级 |
|---|------|--------|
| C-1 | 节点分布地图：按类型（数据中心/边缘/区域云）显示 | P0 |
| C-2 | 节点详情面板：算力/存储/利用率/GPU 状态 | P0 |
| C-3 | 光缆路由可视化：节点间连线，按带宽/利用率着色（✅ 已落地：FiberRoute 渲染类，支持 geometry/节点坐标连线 + click 选中） | P0 |
| C-4 | 资源调度面板：按区域/类型筛选 → 分配任务 | P1 |
| C-5 | 供需预测：预测未来 7 天各区域算力需求 | P2 |

#### 4.1.3 着色规则

```javascript
// 节点按 GPU 利用率着色
const colorByGpuUtil = [
  'interpolate', ['linear'], ['get', 'gpu_utilization'],
  0, '#4ade80',     // 空闲 绿色
  0.3, '#22d3ee',   // 低负载 青色
  0.6, '#fbbf24',   // 中负载 黄色
  0.8, '#f59e0b',   // 高负载 橙色
  0.95, '#ef4444'   // 满载 红色
];

// 光缆按利用率着色
const colorByLinkUtil = [
  'interpolate', ['linear'], ['get', 'utilization'],
  0, '#4ade80',
  0.5, '#fbbf24',
  0.8, '#ef4444'
];

// 光缆线宽按带宽分级
const widthByBandwidth = [
  'match', ['get', 'bandwidth_gbps'],
  100, 4,   // 100G 粗线
  40, 3,    // 40G
  10, 2,    // 10G
  1         // 其他 细线
];
```

### 4.2 LatencyMap — 延迟热力图

#### 4.2.1 功能点

| # | 功能 | 优先级 |
|---|------|--------|
| LM-1 | 延迟等值线：以用户端为原点，绘制延迟等级区域 | P1 |
| LM-2 | 最优接入推荐：根据延迟排序推荐最近可用算力节点 | P0 |
| LM-3 | 延迟趋势：选中链路展示 24h 延迟变化曲线 | P1 |
| LM-4 | 延迟告警：链路延迟超过阈值自动告警 | P1 |

---

## 五、通信网方案

### 5.1 CellCoverage — 基站覆盖地图

#### 5.1.1 数据模型

```
通信拓扑 = {
  base_stations: [
    { id, type: "macro|micro|indoor_das",
      lat, lng, name, carrier: "移动|联通|电信",
      properties: {
        technology: "5G|4G|3G",
        frequency: "3.5GHz|2.6GHz|1.8GHz",
        power_dbm: 46,
        height_m: 30,
        azimuth: [0, 120, 240],  // 扇区方位角
        tilt: 6,                   // 下倾角
        status: "online|offline|fault",
        user_count: 150,
        throughput_mbps: 500
      }
    }
  ],
  coverage_areas: [
    { station_id, sector_id, 
      geom: Polygon,  // 覆盖范围多边形
      signal_level: "excellent|good|fair|poor" }
  ]
}
```

#### 5.1.2 功能点

| # | 功能 | 优先级 |
|---|------|--------|
| CC-1 | 基站分布地图：按运营商/技术类型着色 | P0 |
| CC-2 | 覆盖范围叠加：半透明多边形展示覆盖区域 | P0 |
| CC-3 | 信号强度热力图：基于路测/用户上报数据 | P1 |
| CC-4 | 覆盖盲区识别：自动标注无覆盖或弱覆盖区域 | P1 |
| CC-5 | 扇区可视化：展示方位角和波束方向 | P2 |

#### 5.1.3 着色规则

```javascript
// 基站按运营商着色
const colorByCarrier = [
  'match', ['get', 'carrier'],
  '中国移动', '#4ade80',  // 绿色
  '中国联通', '#ef4444',  // 红色
  '中国电信', '#3b82f6',  // 蓝色
  '中国广电', '#f59e0b',  // 橙色
  '#6b7280'
];

// 信号强度热力图
const colorBySignal = [
  'interpolate', ['linear'], ['get', 'rsrp'],
  -120, '#ef4444',  // 极弱 红
  -105, '#f59e0b',  // 弱 橙
  -90, '#fbbf24',   // 一般 黄
  -80, '#4ade80',   // 好 绿
  -65, '#22d3ee'    // 极好 青
];
```

### 5.2 NetworkHealth — 网络健康度面板

#### 5.2.1 功能点

| # | 功能 | 优先级 |
|---|------|--------|
| NH-1 | 基站在线率统计（按区域/运营商/类型） | P0 |
| NH-2 | 告警分布地图（故障基站闪烁标记） | P0 |
| NH-3 | 故障趋势图（日/周/月故障数变化） | P1 |
| NH-4 | 故障根因分析：关联多维度数据推荐排查方向 | P2 |

### 5.3 运营商品牌化大屏

利用 Phase 0 的样式系统（C5），为三大运营商预设品牌主题：

| 运营商 | 主色调 | 辅助色 |
|--------|--------|--------|
| 中国移动 | #4ade80 绿 | #166534 深绿 |
| 中国联通 | #ef4444 红 | #991b1b 深红 |
| 中国电信 | #3b82f6 蓝 | #1e40af 深蓝 |

一键切换运营商主题 + 白天/夜间模式。

---

## 六、NLPG 交通/算力/通信场景

### 6.1 交通查询

| 输入 | 行为 |
|------|------|
| "当前全网平均速度最低的 10 条路段" | 实时数据聚合 → 排序 → 地图高亮 |
| "这个事故点 3 公里内有多少摄像头？" | 缓冲区查询 → 关联摄像头表 |
| "预测未来 1 小时三环的拥堵变化" | 时序预测 → 趋势曲线 + 地图着色 |
| "今天早高峰拥堵比昨天严重吗？" | 同比分析 → 对比图 |

### 6.2 算力查询

| 输入 | 行为 |
|------|------|
| "利用率低于 30% 的 GPU 节点" | 属性过滤 → 地图展示 |
| "北京到上海之间有哪些光缆路由？" | 拓扑分析 → 路径高亮 |
| "预测下个月华东区的算力缺口" | 供需预测 → 报表 + 热力图 |

### 6.3 通信查询

| 输入 | 行为 |
|------|------|
| "5G 基站中近 7 天故障率超过 5% 的" | 时序聚合 → 排序 → 地图标记 |
| "这个区域内 4G 和 5G 覆盖的重叠率" | 覆盖叠加分析 |
| "周边 2 公里内哪些基站负载最高？" | 空间查询 + 排序 |

---

## 七、AI Debug 工具（全网共性）

### 7.1 功能点

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| AD-1 | 性能 Profiler 分析 | 接入 Chrome DevTools Performance 数据，自动分析渲染瓶颈 | P0 |
| AD-2 | 瓦片加载监控 | 实时显示瓦片请求/命中率/加载时间 | P1 |
| AD-3 | 内存泄漏检测 | 监控 GeoJSON/瓦片资源的内存占用趋势 | P1 |
| AD-4 | 优化建议引擎 | 基于规则匹配常见问题，给出代码级修改建议 | P1 |

### 7.2 常见问题诊断规则

| 问题模式 | 检测方法 | 建议 |
|---------|---------|------|
| 瓦片过载 | 平铺瓦片数 > 阈值 | 增加 simplification tolerance |
| Shader 过复杂 | Draw call 数量异常 | 合并图层，减少 paint 属性复杂度 |
| 频繁重绘 | 静态数据触发 re-render | 检查 data/source 是否意外更新 |
| 内存泄漏 | 内存持续增长不回收 | 检查 removeSource/removeLayer 调用 |
| 标注压盖 | 重叠注记数过多 | 启用文字避让或降低标注密度 |

---

## 八、样式生成器 v2

### 8.1 功能点

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| SG-1 | 色板提取 | 上传图片 → 提取主色调 → 生成 style.json 配色方案 | P1 |
| SG-2 | 风格模板 | 预置 6 套行业模板（管网/电网/水网/交通/算力/通信） | P0 |
| SG-3 | 品牌定制 | 输入品牌色 → 自动生成全套地图样式 | P1 |
| SG-4 | 运营商主题 | 三大运营商预设主题 + 自定义 | P1 |
| SG-5 | 昼夜切换 | 一键切换亮色/暗色模式 | P0 |

---

## 九、非功能性需求

| 指标 | 交通 | 算力 | 通信 |
|------|------|------|------|
| 实时数据刷新 | < 3 秒 | < 10 秒 | < 10 秒 |
| 路况预测延迟 | < 1 秒 | — | — |
| 数据支持规模 | 50 万路段 | 1 万节点 + 5 万链路 | 10 万基站 |
| 覆盖分析 | — | — | < 3 秒 |

---

## 十、GA 发布检查清单

Phase 3 结束时，草果地图 v1.0 GA 需要通过以下检查：

### 10.1 功能完整性

- [ ] 引擎核心功能稳定（渲染/交互/离线）
- [ ] 六张网组件包全部可用
- [ ] NLPG 支持六张网查询场景
- [ ] MapCopilot 5 类意图稳定
- [ ] GeoAI 数据入图管线可用
- [ ] AI Debug 工具可用
- [ ] 样式生成器可用

### 10.2 质量

- [ ] 单元测试覆盖率 ≥ 70%
- [ ] 所有 P0 功能有 E2E 测试
- [ ] 性能基准测试通过（见各 PRD 指标）
- [ ] 安全审计完成（NLPG SQL 校验、数据脱敏）
- [ ] 浏览器兼容性测试（Chrome/Firefox/Edge）

### 10.3 文档

- [ ] 快速开始文档可跑通
- [ ] API 参考文档完整
- [ ] 六张网行业方案文档完整
- [ ] 部署文档覆盖 Docker/K8s/离线
- [ ] 贡献者指南（开源社区）

### 10.4 交付

- [ ] npm 包可正常安装
- [ ] Docker 镜像可正常拉取运行
- [ ] 落地页信息更新（含六张网方案）
- [ ] Demo 中心包含六张网演示

---

## 十一、里程碑

| 周 | 里程碑 | 交付物 |
|----|--------|--------|
| M10 W1-W2 | 交通网 v0.1 | RoadNetwork + TrafficFlow |
| M10 W3-W4 | 算力网 v0.1 | ComputeNodes + FiberRoute |
| M11 W1-W2 | 通信网 v0.1 | CellCoverage + NetworkHealth |
| M11 W3-W4 | AI Debug + 样式生成器 v2 | 全网共性工具完善 |
| M12 W1-W2 | Demo + 文档 | 六张网 Demo 完整 + 文档收尾 |
| M12 W3-W4 | GA 发布 | v1.0 正式发布 |

---

> **Phase 3 的核心交付：六张网全覆盖 + AI 工具链完善 + v1.0 GA。此时草果地图已从"管网专用工具"升级为"六张网通用地图引擎"，具备完整的商业交付能力。**
