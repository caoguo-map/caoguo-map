/**
 * 草果地图通信网组件包
 *
 * 面向通信网（基站覆盖/信号热力/网络健康）的可视化与空间智能组件集合。
 *
 * ## 模块组织
 *
 * - `types/`     数据模型（BaseStation/CoverageArea/SignalSample）
 * - `style/`     通信专用样式 `caoguo-telecom`（运营商/信号热力/品牌主题）
 * - `coverage/`  `CellCoverage` 基站覆盖地图 + 盲区识别 + 扇区可视化
 * - `topology/`  拓扑分析（最近邻/连通性/中心性/覆盖重叠）
 * - `health/`    `NetworkHealth` 网络健康度（在线率/告警/故障趋势）
 * - `nlpg/`      NLPG 通信查询意图识别
 *
 * ## 设计原则
 *
 * 1. **算法纯函数 + 渲染薄壳**：覆盖分析、盲区识别、重叠率都是纯函数。
 * 2. **可插拔**：每个组件可独立使用。
 * 3. **离线友好**：所有计算在前端完成。
 *
 * @packageDocumentation
 */

export * from './types/index';
export * from './style/index';
export * from './coverage/index';
export * from './topology/index';
export * from './health/index';
export * from './capacity/index';
export * from './nlpg/index';
