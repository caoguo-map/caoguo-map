/**
 * 草果地图管网组件包
 *
 * 面向地下管网（燃气/供水/供热/排水/电力管沟/通信管沟）的可视化与空间智能组件集合。
 *
 * ## 模块组织
 *
 * - `types/`     数据模型（Node/Pipe/User/TopologyDataset）
 * - `style/`     管网专用样式 `caoguo-pipeline`（配色规则、状态色、Material 主题）
 * - `graph/`     图算法内核（邻接表、BFS/DFS、连通性、上游阀门查找）
 * - `topology/`  `PipelineTopology` 拓扑编辑器组件
 * - `burst/`     `BurstSimulator` 爆管推演组件 + 图遍历算法
 * - `leakage/`   `LeakagePlume` 泄漏扩散模拟（高斯烟羽模型）
 * - `health/`    `PipelineHealth` 管线健康评估（多维加权评分 + 热力图）
 * - `nlpg/`      NLPG 管网查询意图识别（自然语言 → 管网查询）
 *
 * ## 设计原则
 *
 * 1. **算法纯函数 + 渲染薄壳**：所有图算法、Burst/Leakage/Health 计算都是纯函数，
 *    可单独测试、可在 Node 环境运行；渲染层负责订阅结果绘制到地图。
 * 2. **可插拔**：每个组件可独立使用，也可组合（如 Topology + Burst + Health）。
 * 3. **离线友好**：所有计算在前端完成，无需后端依赖（Phase 1 MVP 离线优先）。
 * 4. **可解释**：所有评分/推演结果附带 explain()，每个维度的依据可见（PRD H 验收）。
 *
 * @packageDocumentation
 */

export * from './types/index';

// 样式（管网主题）
export * from './style/index';

// 图算法内核
export * from './graph/index';

// 子组件（按入口分离）
export * from './topology/index';
export * from './burst/index';
export * from './leakage/index';
export * from './health/index';
export * from './nlpg/index';
