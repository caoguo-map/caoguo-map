/**
 * 草果地图水网专用样式 - `caoguo-water`
 *
 * 设计目标：
 * - 行业辨识度高：河流按流量、水库按蓄水率、堤防按安全等级
 * - 语义清晰：低流量浅蓝 → 超警红色
 * - 与 caoguo-dark/light 主题协调（暗色底图 + 地形晕渲）
 *
 * 颜色规范依据 PRD phase-2-grid-water §4.1.3 / §6.2。
 */

import type { DikeSafetyLevel, WaterFeatureKind, WaterColorByMode } from '../types';
import { INDUSTRY_PALETTES } from '@caoguo/theme';

/** 河流按流量着色（PRD §4.1.3） */
export function flowColor(flowRate: number): string {
  if (flowRate >= 1000) return '#ef4444'; // 超警 红
  if (flowRate >= 500) return '#1d4ed8';  // 高流量 深蓝
  if (flowRate >= 100) return '#3b82f6';  // 中流量 蓝
  return '#93c5fd';                       // 低流量 浅蓝
}

/** 水库按蓄水率着色（PRD §4.1.3） */
export function storageColor(storageRate: number): string {
  if (storageRate >= 0.9) return '#ef4444'; // 满库/超汛限 红
  if (storageRate >= 0.7) return '#3b82f6'; // 充裕 蓝
  if (storageRate >= 0.3) return '#4ade80'; // 正常 绿
  return '#fbbf24';                          // 干旱 黄
}

/** 堤防安全状态配色（PRD §4.1.3）—— 颜色值统一取自 @caoguo/theme 六张网配色寄存器 */
export const DIKE_SAFETY_COLORS: Record<DikeSafetyLevel, string> = {
  safe: INDUSTRY_PALETTES.water.status.safe, // 安全 绿
  warning: INDUSTRY_PALETTES.water.status.warning, // 警戒 黄
  danger: INDUSTRY_PALETTES.water.status.danger, // 危险 红
  breach: INDUSTRY_PALETTES.water.status.breach, // 决口 暗红
};

/** 堤防安全状态中文标签 */
export const DIKE_SAFETY_LABELS: Record<DikeSafetyLevel, string> = {
  safe: '安全',
  warning: '警戒',
  danger: '危险',
  breach: '决口',
};

/** 要素类型配色 —— 颜色值统一取自 @caoguo/theme 六张网配色寄存器 */
export const WATER_FEATURE_COLORS: Record<WaterFeatureKind, string> = {
  basin: INDUSTRY_PALETTES.water.palette.basin, // 流域 天蓝
  mainstream: INDUSTRY_PALETTES.water.palette.mainstream, // 干流 蓝
  tributary: INDUSTRY_PALETTES.water.palette.tributary, // 支流 浅蓝
  reach: INDUSTRY_PALETTES.water.palette.reach, // 河段 淡蓝
  reservoir: INDUSTRY_PALETTES.water.palette.reservoir, // 水库 青
  gate: INDUSTRY_PALETTES.water.palette.gate, // 闸站 橙
  dike: INDUSTRY_PALETTES.water.palette.dike, // 堤防 黄
  rainStation: INDUSTRY_PALETTES.water.palette.rainStation, // 雨量站 青
  waterStation: INDUSTRY_PALETTES.water.palette.waterStation, // 水位站 天蓝
};

/** 要素类型图标（SVG path 描点） */
export const WATER_FEATURE_ICONS: Record<WaterFeatureKind, string> = {
  basin: 'M -10 -6 L 0 -10 L 10 -6 L 0 8 Z',
  mainstream: 'M -10 4 L -4 -6 L 4 -6 L 10 4',
  tributary: 'M -10 6 L 0 -6 L 10 6',
  reach: 'M -10 6 L 0 -6 L 10 6',
  reservoir: 'M -8 -8 L 8 -8 L 8 8 L -8 8 Z',
  gate: 'M -6 -6 L 6 6 M -6 6 L 6 -6',
  dike: 'M -10 0 L 10 0 M -8 -3 L 8 -3 M -8 3 L 8 3',
  rainStation: 'M 0 -10 L 3 -4 L -3 -4 Z',
  waterStation: 'M -8 -8 A 8 8 0 1 0 8 -8 L 0 8 Z',
};

/** 要素类型中文标签 */
export const WATER_FEATURE_LABELS: Record<WaterFeatureKind, string> = {
  basin: '流域',
  mainstream: '干流',
  tributary: '支流',
  reach: '河段',
  reservoir: '水库',
  gate: '闸站',
  dike: '堤防',
  rainStation: '雨量站',
  waterStation: '水位站',
};

/** 蓄水率分级 label */
export function storageLabel(storageRate: number): string {
  if (storageRate >= 0.9) return '满库/超汛限';
  if (storageRate >= 0.7) return '充裕';
  if (storageRate >= 0.3) return '正常';
  return '干旱';
}

/** 流量分级 label */
export function flowLabel(flowRate: number): string {
  if (flowRate >= 1000) return '超警';
  if (flowRate >= 500) return '高流量';
  if (flowRate >= 100) return '中流量';
  return '低流量';
}
