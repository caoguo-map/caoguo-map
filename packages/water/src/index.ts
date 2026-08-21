/**
 * 草果地图水网组件包
 *
 * 面向水网（流域/河流/水库/闸站/堤防）的可视化与空间智能组件集合。
 *
 * ## 模块组织
 *
 * - `types/`  数据模型（WaterFeature/WaterDataset/FloodInput 等）
 * - `style/`  水网专用样式 `caoguo-water`（流量/蓄水率/堤防安全配色）
 * - `river/`  `RiverSystem` 水系拓扑图（层级渲染 + 顺逆流钻取）
 * - `flood/`  `FloodInundation` 洪水淹没模拟（SCS-CN + 推理公式 + flood fill）
 * - `dam/`    `DamOperation` 水库联合调度（泄量调整 + 下游水位推演）
 *
 * ## 设计原则
 *
 * 1. **算法纯函数 + 渲染薄壳**：所有水文模型、淹没模拟、调度推演都是纯函数。
 * 2. **可插拔**：每个组件可独立使用，也可组合。
 * 3. **离线友好**：所有计算在前端完成（Phase 2 MVP 离线优先）。
 *
 * @packageDocumentation
 */

export * from './types/index';

// 样式（水网主题）
export * from './style/index';

// 子组件（按入口分离）
export * from './river/index';
export * from './flood/index';
export * from './dam/index';
