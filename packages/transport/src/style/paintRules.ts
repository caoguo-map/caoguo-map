/**
 * 交通网 MapLibre paint 规则（caoguo-transport）
 *
 * 把"路段/节点/事件如何着色"的业务规则翻译成 MapLibre style spec。
 *
 * 规则集：
 * - 路段按道路等级着色（roadClass，PRD §3.1.3）
 * - 路段按实时速度着色（speed）
 * - 路段按状态着色（status）
 * - 路段线宽按道路等级分级
 * - 事件按类型/严重程度着色
 */

import type { RoadColorBy } from '../types';
import {
  ROAD_CLASS_COLORS,
  ROAD_STATUS_COLORS,
  ROAD_CLASS_WIDTHS,
  INCIDENT_TYPE_COLORS,
  INCIDENT_SEVERITY_COLORS,
} from './transportTheme';

export type PaintRule = unknown;

/** 路段按"道路等级"着色（底图模式，PRD §3.1.3） */
export function paintRoadByClass(): PaintRule {
  return [
    'match',
    ['get', 'roadClass'],
    ...Object.entries(ROAD_CLASS_COLORS).flatMap(([k, v]) => [k, v]),
    '#9ca3af',
  ];
}

/** 路段按"实时速度"着色（路况模式，PRD §3.1.3） */
export function paintRoadBySpeed(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'speed'], 60],
    0, '#ef4444',     // 停滞 红
    20, '#f59e0b',    // 拥堵 橙
    40, '#fbbf24',    // 缓行 黄
    60, '#4ade80',    // 畅通 绿
    80, '#22d3ee',    // 高速 青
  ];
}

/** 路段按"状态"着色 */
export function paintRoadByStatus(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'status'], 'open'],
    ...Object.entries(ROAD_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 路段线宽按"道路等级"分级（PRD §3.1.3 宽度分级） */
export function paintRoadWidthByClass(): PaintRule {
  return [
    'match',
    ['get', 'roadClass'],
    ...Object.entries(ROAD_CLASS_WIDTHS).flatMap(([k, v]) => [k, v]),
    2,
  ];
}

/** 事件按"类型"着色 */
export function paintIncidentByType(): PaintRule {
  return [
    'match',
    ['get', 'type'],
    ...Object.entries(INCIDENT_TYPE_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 事件按"严重程度"着色 */
export function paintIncidentBySeverity(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'severity'], 'medium'],
    ...Object.entries(INCIDENT_SEVERITY_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 根据模式返回 paint rule 工厂 */
export function paintRoadBy(mode: RoadColorBy): PaintRule {
  switch (mode) {
    case 'roadClass':
      return paintRoadByClass();
    case 'speed':
      return paintRoadBySpeed();
    case 'status':
      return paintRoadByStatus();
    case 'uniform':
    default:
      return '#60a5fa';
  }
}
