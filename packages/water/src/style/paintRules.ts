/**
 * 水网 MapLibre paint 规则（caoguo-water）
 *
 * 把"河流/水库/堤防如何着色"的业务规则翻译成 MapLibre style spec。
 */

import type { WaterColorByMode } from '../types';
import { DIKE_SAFETY_COLORS } from './waterTheme';

export type PaintRule = unknown;

/** 按流量着色（PRD §4.1.3） */
export function paintByFlow(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'flowRate'], 0],
    0, '#93c5fd',     // 低流量 浅蓝
    100, '#3b82f6',   // 中流量 蓝
    500, '#1d4ed8',   // 高流量 深蓝
    1000, '#ef4444',  // 超警 红
  ];
}

/** 按蓄水率着色（PRD §4.1.3） */
export function paintByStorage(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'storageRate'], 0.5],
    0, '#fbbf24',     // 干旱 黄
    0.3, '#4ade80',   // 正常 绿
    0.7, '#3b82f6',   // 充裕 蓝
    0.9, '#ef4444',   // 满库 红
  ];
}

/** 按堤防安全状态着色（PRD §4.1.3） */
export function paintByDike(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'safetyLevel'], 'safe'],
    ...Object.entries(DIKE_SAFETY_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 按河流层级着色 */
export function paintByLevel(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'level'], 'reach'],
    'basin', '#0ea5e9',
    'mainstream', '#3b82f6',
    'tributary', '#60a5fa',
    'reach', '#93c5fd',
    '#94a3b8',
  ];
}

/** 根据模式返回 paint rule 工厂 */
export function paintBy(mode: WaterColorByMode): PaintRule {
  switch (mode) {
    case 'flow':
      return paintByFlow();
    case 'storage':
      return paintByStorage();
    case 'dike':
      return paintByDike();
    case 'level':
      return paintByLevel();
    case 'uniform':
    default:
      return '#60a5fa';
  }
}

/** 线宽（按流量递推） */
export function paintLineWidthByFlow(minWidth = 1.5, maxWidth = 7): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'flowRate'], 50],
    0, minWidth,
    1000, maxWidth,
  ];
}
