/**
 * 通信网 MapLibre paint 规则（caoguo-telecom）
 *
 * PRD §5.1.3 着色规则：
 * - 基站按运营商着色
 * - 信号强度（RSRP）热力
 */

import type { StationColorBy } from '../types';
import {
  CARRIER_COLORS,
  TECHNOLOGY_COLORS,
  STATION_STATUS_COLORS,
} from './telecomTheme';

export type PaintRule = unknown;

/** 基站按"运营商"着色（PRD §5.1.3） */
export function paintStationByCarrier(): PaintRule {
  return [
    'match',
    ['get', 'carrier'],
    ...Object.entries(CARRIER_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 基站按"技术制式"着色 */
export function paintStationByTechnology(): PaintRule {
  return [
    'match',
    ['get', 'technology'],
    ...Object.entries(TECHNOLOGY_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 基站按"状态"着色 */
export function paintStationByStatus(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'status'], 'online'],
    ...Object.entries(STATION_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 信号强度（RSRP）热力（PRD §5.1.3） */
export function paintSignalByRsrp(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['get', 'rsrp'],
    -120, '#ef4444',  // 极弱 红
    -105, '#f59e0b',  // 弱 橙
    -90, '#fbbf24',   // 一般 黄
    -80, '#4ade80',   // 好 绿
    -65, '#22d3ee',   // 极好 青
  ];
}

/** 覆盖区域按信号等级着色 */
export function paintCoverageBySignal(): PaintRule {
  return [
    'match',
    ['get', 'signalLevel'],
    'excellent', '#22d3ee',
    'good', '#4ade80',
    'fair', '#fbbf24',
    'poor', '#f59e0b',
    '#6b7280',
  ];
}

/** 基站着色工厂 */
export function paintStationBy(mode: StationColorBy): PaintRule {
  switch (mode) {
    case 'carrier':
      return paintStationByCarrier();
    case 'technology':
      return paintStationByTechnology();
    case 'status':
      return paintStationByStatus();
    default:
      return paintStationByCarrier();
  }
}
