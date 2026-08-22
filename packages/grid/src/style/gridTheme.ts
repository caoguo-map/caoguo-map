/**
 * 草果地图电网专用样式 - `caoguo-grid`
 *
 * 设计目标：
 * - 行业辨识度高：特高压=红、超高压=橙、高压=蓝、中压=绿、低压=黄绿
 * - 状态语义强：运行/备用/故障/检修 各有专属色
 * - 与 caoguo-dark/light 主题协调（暗色底图突出电力设施）
 *
 * 颜色规范依据 PRD phase-2-grid-water §3.1.3 / §6.1。
 */

import type { VoltageLevel, GridDeviceStatus, GridDeviceKind, GridLevel } from '../types';
import { INDUSTRY_META } from '@caoguo/theme';

/** 电网行业主色（六张网统一标识色，单一来源 @caoguo/theme） */
export const INDUSTRY_PRIMARY = INDUSTRY_META.grid.primary;

/** 电压等级配色（caoguo-grid，PRD §3.1.3） */
export const VOLTAGE_COLORS: Record<VoltageLevel, string> = {
  '1000': '#ef4444', // 特高压 红
  '500': '#f59e0b',  // 超高压 橙
  '220': '#3b82f6',  // 高压 蓝
  '110': '#60a5fa',  // 高压 浅蓝
  '35': '#4ade80',   // 中压 绿
  '10': '#a3e635',   // 低压 黄绿
  '0.4': '#a3e635',  // 用户 黄绿
};

/** 电压等级中文标签 */
export const VOLTAGE_LABELS: Record<VoltageLevel, string> = {
  '1000': '特高压 1000kV',
  '500': '超高压 500kV',
  '220': '高压 220kV',
  '110': '高压 110kV',
  '35': '中压 35kV',
  '10': '配电 10kV',
  '0.4': '低压 0.4kV',
};

/** 运行状态配色（PRD §3.1.3） */
export const GRID_STATUS_COLORS: Record<GridDeviceStatus, string> = {
  running: '#4ade80',     // 运行中 绿
  standby: '#fbbf24',     // 备用 黄
  fault: '#ef4444',       // 故障 红（+脉冲）
  maintenance: '#8b5cf6', // 检修 紫
};

/** 状态中文标签 */
export const GRID_STATUS_LABELS: Record<GridDeviceStatus, string> = {
  running: '运行中',
  standby: '备用',
  fault: '故障',
  maintenance: '检修',
};

/** 设备类型图标（SVG path 描点，地图渲染层用） */
export const GRID_DEVICE_ICONS: Record<GridDeviceKind, string> = {
  plant: 'M 0 -10 L 6 6 L -6 6 Z',            // 三角（发电厂）
  tower: 'M -4 -10 L 4 -10 L 3 10 L -3 10 Z', // 塔（铁塔）
  substation: 'M -8 -8 L 8 -8 L 8 8 L -8 8 Z', // 方（变电站）
  transformer: 'M -6 -6 L 6 -6 L 6 6 L -6 6 Z', // 小方（配变）
  user: 'M -5 0 A 5 5 0 1 0 5 0 A 5 5 0 1 0 -5 0', // 圆（用户）
};

/** 设备类型配色 */
export const GRID_DEVICE_COLORS: Record<GridDeviceKind, string> = {
  plant: '#ef4444',      // 电厂 红
  tower: '#f59e0b',      // 铁塔 橙
  substation: '#3b82f6', // 变电站 蓝
  transformer: '#4ade80', // 配变 绿
  user: '#a3e635',       // 用户 黄绿
};

/** 设备类型中文标签 */
export const GRID_DEVICE_LABELS: Record<GridDeviceKind, string> = {
  plant: '发电厂',
  tower: '铁塔',
  substation: '变电站',
  transformer: '配变',
  user: '用户',
};

/** 层级中文标签（5 级钻取） */
export const GRID_LEVEL_LABELS: Record<GridLevel, string> = {
  L1: '发电',
  L2: '输电',
  L3: '变电',
  L4: '配电',
  L5: '用户',
};

/** 负荷率着色（绿→黄→红渐变，PRD §3.3.1） */
export function loadColor(loadRate: number): string {
  if (loadRate >= 0.8) return '#ef4444'; // 过载 红
  if (loadRate >= 0.6) return '#fbbf24'; // 偏高 黄
  if (loadRate >= 0.4) return '#4ade80'; // 正常 绿
  return '#22c55e';                      // 轻载 深绿
}

/** 负荷率分级 label */
export function loadLabel(loadRate: number): string {
  if (loadRate >= 0.8) return '过载';
  if (loadRate >= 0.6) return '偏高';
  if (loadRate >= 0.4) return '正常';
  return '轻载';
}

/** 按电压等级取默认色（兜底） */
export function voltageColor(v: VoltageLevel | undefined): string {
  if (!v) return '#9ca3af';
  return VOLTAGE_COLORS[v];
}

/** 按状态取默认色 */
export function statusColor(s: GridDeviceStatus | undefined): string {
  if (!s) return '#6b7280';
  return GRID_STATUS_COLORS[s];
}
