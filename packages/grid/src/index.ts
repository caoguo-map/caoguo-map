/**
 * 草果地图电网组件包
 *
 * 面向电网（发电/输电/变电/配电/用户）的可视化与空间智能组件集合。
 *
 * ## 模块组织
 *
 * - `types/`    数据模型（GridDevice/GridLine/GridUser/GridTopologyDataset）
 * - `style/`    电网专用样式 `caoguo-grid`（电压等级/状态/负荷/年份配色）
 * - `graph/`    图算法内核（邻接表、BFS 方向遍历）
 * - `topology/` `GridTopology` 电网拓扑浏览器（5 级钻取 + 供电路径追踪）
 * - `outage/`   `OutageAnalyzer` 停电分析器（下游遍历 + 用户统计 + 备用路径）
 * - `load/`     `LoadHeatmap` 负荷热力图（负荷率着色 + 过载预警 + 负荷预测）
 *
 * ## 设计原则
 *
 * 1. **算法纯函数 + 渲染薄壳**：所有图算法、停电分析、负荷预测都是纯函数，
 *    可单独测试、可在 Node 环境运行。
 * 2. **可插拔**：每个组件可独立使用，也可组合。
 * 3. **离线友好**：所有计算在前端完成（Phase 2 MVP 离线优先）。
 * 4. **可解释**：停电分析结果附带受影响用户分类与恢复步骤。
 *
 * @packageDocumentation
 */

export * from './types/index';

// 样式（电网主题）
export * from './style/index';

// 图算法内核
export * from './graph/index';

// 子组件（按入口分离）
export * from './topology/index';
export * from './outage/index';
export * from './load/index';
export * from './realtime/index';
export * from './station3d/index';
