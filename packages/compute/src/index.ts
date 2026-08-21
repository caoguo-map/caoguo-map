/**
 * 草果地图算力网组件包
 *
 * 面向算力网（数据中心/边缘节点/光缆）的可视化与空间智能组件集合。
 *
 * ## 模块组织
 *
 * - `types/`     数据模型（ComputeNode/FiberLink/LatencyRecord）
 * - `style/`     算力专用样式 `caoguo-compute`（GPU 利用率/光缆利用率配色）
 * - `graph/`     图算法（邻接表、最低延迟路径、路由分析、最优接入推荐）
 * - `nodes/`     `ComputeNodes` 节点地图 + 光缆路由可视化
 * - `latency/`   `LatencyMap` 延迟热力 + 最优接入 + 告警
 * - `predict/`   供需预测（算力缺口）
 * - `nlpg/`      NLPG 算力查询意图识别
 *
 * ## 设计原则
 *
 * 1. **算法纯函数 + 渲染薄壳**：供需预测、延迟分析、路由分析都是纯函数。
 * 2. **可插拔**：每个组件可独立使用。
 * 3. **离线友好**：所有计算在前端完成。
 *
 * @packageDocumentation
 */

export * from './types/index';
export * from './style/index';
export * from './graph/index';
export * from './nodes/index';
export * from './latency/index';
export * from './predict/index';
export * from './nlpg/index';
