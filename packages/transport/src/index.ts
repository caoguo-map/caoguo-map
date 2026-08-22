/**
 * 草果地图交通网组件包
 *
 * 面向交通（路网/交通流/事件响应）的可视化与空间智能组件集合。
 *
 * ## 模块组织
 *
 * - `types/`     数据模型（RoadNode/RoadEdge/Incident/RoadSpeedRecord）
 * - `style/`     交通专用样式 `caoguo-transport`（道路等级/速度/状态/事件配色）
 * - `graph/`     图算法（邻接表、BFS、Dijkstra、缓冲查询）
 * - `road/`      `RoadNetwork` 路网编辑器组件
 * - `traffic/`   `TrafficFlow` 交通流 + 拥堵预测
 * - `incident/`  `IncidentMap` 事件响应（影响范围/附近资源/绕行）
 * - `nlpg/`      NLPG 交通查询意图识别
 * - `transit/`   `TransitHeatmap` 公交/地铁客流 OD 热力
 *
 * ## 设计原则
 *
 * 1. **算法纯函数 + 渲染薄壳**：拥堵预测、事件分析、图遍历、OD 聚合都是纯函数。
 * 2. **可插拔**：每个组件可独立使用，也可组合。
 * 3. **离线友好**：所有计算在前端完成。
 *
 * @packageDocumentation
 */

export * from './types/index';
export * from './style/index';
export * from './graph/index';
export * from './road/index';
export * from './traffic/index';
export * from './incident/index';
export * from './nlpg/index';
export * from './transit/index';
