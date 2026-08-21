/**
 * 算力网 MapLibre paint 规则（caoguo-compute）
 *
 * PRD §4.1.3 着色规则：
 * - 节点按 GPU 利用率着色
 * - 光缆按利用率着色
 * - 光缆线宽按带宽分级
 */

import type { ComputeNodeColorBy, LinkColorBy } from '../types';
import {
  NODE_TYPE_COLORS,
  NODE_STATUS_COLORS,
  LINK_TYPE_COLORS,
} from './computeTheme';

export type PaintRule = unknown;

/** 节点按"类型"着色 */
export function paintNodeByType(): PaintRule {
  return [
    'match',
    ['get', 'type'],
    ...Object.entries(NODE_TYPE_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 节点按"GPU 利用率"着色（PRD §4.1.3） */
export function paintNodeByGpuUtil(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'gpuUtilization'], 0],
    0, '#4ade80',     // 空闲 绿
    0.3, '#22d3ee',   // 低负载 青
    0.6, '#fbbf24',   // 中负载 黄
    0.8, '#f59e0b',   // 高负载 橙
    0.95, '#ef4444',  // 满载 红
  ];
}

/** 节点按"状态"着色 */
export function paintNodeByStatus(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'status'], 'online'],
    ...Object.entries(NODE_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 链路按"利用率"着色（PRD §4.1.3） */
export function paintLinkByUtilization(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'utilization'], 0],
    0, '#4ade80',
    0.5, '#fbbf24',
    0.8, '#ef4444',
  ];
}

/** 链路按"类型"着色 */
export function paintLinkByType(): PaintRule {
  return [
    'match',
    ['get', 'type'],
    ...Object.entries(LINK_TYPE_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 链路线宽按"带宽"分级（PRD §4.1.3） */
export function paintLinkWidthByBandwidth(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'bandwidthGbps'], 10],
    100, 4,
    40, 3,
    10, 2,
    1,
  ];
}

/** 节点着色工厂 */
export function paintNodeBy(mode: ComputeNodeColorBy): PaintRule {
  switch (mode) {
    case 'type':
      return paintNodeByType();
    case 'gpuUtil':
      return paintNodeByGpuUtil();
    case 'status':
      return paintNodeByStatus();
    default:
      return paintNodeByType();
  }
}

/** 链路着色工厂 */
export function paintLinkBy(mode: LinkColorBy): PaintRule {
  switch (mode) {
    case 'type':
      return paintLinkByType();
    case 'utilization':
      return paintLinkByUtilization();
    default:
      return paintLinkByUtilization();
  }
}
