/**
 * 电网 MapLibre paint 规则（caoguo-grid）
 *
 * 把"设备/线路如何着色"的业务规则翻译成 MapLibre style spec。
 * 规则集：
 * - 线路/设备按电压等级着色（voltage，PRD §3.1.3）
 * - 按运行状态着色（status）
 * - 按负载率着色（load）
 * - 按投运年份着色（year）
 */

import type { GridColorByMode } from '../types';
import {
  VOLTAGE_COLORS,
  GRID_STATUS_COLORS,
} from './gridTheme';

export type PaintRule = unknown;

/** 线路按电压等级着色 */
export function paintByVoltage(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'voltage'], '10'],
    ...Object.entries(VOLTAGE_COLORS).flatMap(([k, v]) => [k, v]),
    '#9ca3af',
  ];
}

/** 按运行状态着色 */
export function paintByStatus(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'status'], 'running'],
    ...Object.entries(GRID_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 按负载率着色（绿→黄→红渐变，PRD §3.3.1） */
export function paintByLoad(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'loadRate'], 0],
    0, '#22c55e',   // 轻载 深绿
    0.4, '#4ade80', // 正常 绿
    0.6, '#fbbf24', // 偏高 黄
    0.8, '#ef4444', // 过载 红
    1.0, '#dc2626', // 严重过载 深红
  ];
}

/** 按投运年份着色（越旧越暖） */
export function paintByYear(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'commissionYear'], 2020],
    1980, '#ef4444', // 老设备 红
    2000, '#fbbf24', // 较老 黄
    2015, '#3b82f6', // 较新 蓝
    2025, '#22c55e', // 新设备 绿
  ];
}

/** 根据模式返回 paint rule 工厂 */
export function paintBy(mode: GridColorByMode): PaintRule {
  switch (mode) {
    case 'voltage':
      return paintByVoltage();
    case 'status':
      return paintByStatus();
    case 'load':
      return paintByLoad();
    case 'year':
      return paintByYear();
    case 'uniform':
    default:
      return '#60a5fa';
  }
}

/** 线路宽度（按电压等级递推：高压更粗） */
export function paintLineWidthByVoltage(minWidth = 1.5, maxWidth = 6): PaintRule {
  return [
    'interpolate',
    ['linear'],
    // 注意：数据中 voltage 为字符串（'10'/'500'），需先 to-number，否则 interpolate 求值为 NaN 导致线宽 0、管线不可见
    ['coalesce', ['to-number', ['get', 'voltage'], 10], 10],
    10, minWidth,
    1000, maxWidth,
  ];
}
