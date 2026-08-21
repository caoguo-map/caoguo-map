/**
 * 草果地图算力网专用样式 - `caoguo-compute`
 *
 * 颜色规范依据 PRD phase-3 §4.1.3：
 * - 节点按 GPU 利用率着色：空闲绿 → 低负载青 → 中负载黄 → 高负载橙 → 满载红
 * - 光缆按利用率着色：绿 → 黄 → 红
 * - 光缆线宽按带宽分级
 */

import type { ComputeNodeType, ComputeNodeStatus, FiberLinkType } from '../types';

/** 节点类型配色 */
export const NODE_TYPE_COLORS: Record<ComputeNodeType, string> = {
  datacenter: '#3b82f6',   // 数据中心 蓝
  edge_node: '#4ade80',    // 边缘节点 绿
  cloud_region: '#a78bfa', // 区域云 紫
};

/** 节点类型中文标签 */
export const NODE_TYPE_LABELS: Record<ComputeNodeType, string> = {
  datacenter: '数据中心',
  edge_node: '边缘节点',
  cloud_region: '区域云',
};

/** 节点状态配色 */
export const NODE_STATUS_COLORS: Record<ComputeNodeStatus, string> = {
  online: '#4ade80',       // 在线 绿
  offline: '#6b7280',      // 离线 灰
  maintenance: '#fbbf24',  // 维护 黄
};

/** 节点状态中文标签 */
export const NODE_STATUS_LABELS: Record<ComputeNodeStatus, string> = {
  online: '在线',
  offline: '离线',
  maintenance: '维护中',
};

/** 链路类型配色 */
export const LINK_TYPE_COLORS: Record<FiberLinkType, string> = {
  fiber: '#3b82f6',       // 光缆 蓝
  microwave: '#f59e0b',   // 微波 橙
  satellite: '#a78bfa',   // 卫星 紫
};

/** 链路类型中文标签 */
export const LINK_TYPE_LABELS: Record<FiberLinkType, string> = {
  fiber: '光缆',
  microwave: '微波',
  satellite: '卫星',
};
