/**
 * 草果地图交通网专用样式 - `caoguo-transport`
 *
 * 颜色规范依据 PRD phase-3 §3.1.3：
 * - 道路等级：高速橙 / 国道红 / 省道紫 / 城市灰
 * - 实时速度：停滞红 → 拥堵橙 → 缓行黄 → 畅通绿 → 高速青
 */

import type {
  RoadClass,
  RoadStatus,
  IncidentType,
  IncidentSeverity,
  CongestionLevel,
} from '../types';
import { INDUSTRY_PALETTES } from '@caoguo/theme';

/** 道路等级配色（底图模式，PRD §3.1.3）—— 颜色值统一取自 @caoguo/theme 六张网配色寄存器 */
export const ROAD_CLASS_COLORS: Record<RoadClass, string> = {
  highway: INDUSTRY_PALETTES.transport.palette.highway, // 高速 橙色
  national: INDUSTRY_PALETTES.transport.palette.national, // 国道 红色
  provincial: INDUSTRY_PALETTES.transport.palette.provincial, // 省道 紫色
  urban: INDUSTRY_PALETTES.transport.palette.urban, // 城市道路 灰色
};

/** 道路等级中文标签 */
export const ROAD_CLASS_LABELS: Record<RoadClass, string> = {
  highway: '高速',
  national: '国道',
  provincial: '省道',
  urban: '城市道路',
};

/** 路段状态配色 —— 颜色值统一取自 @caoguo/theme 六张网配色寄存器 */
export const ROAD_STATUS_COLORS: Record<RoadStatus, string> = {
  open: INDUSTRY_PALETTES.transport.status.open, // 绿 开放
  closed: INDUSTRY_PALETTES.transport.status.closed, // 红 封闭
  construction: INDUSTRY_PALETTES.transport.status.construction, // 黄 施工
  controlled: INDUSTRY_PALETTES.transport.status.controlled, // 紫 管制
};

/** 路段状态中文标签 */
export const ROAD_STATUS_LABELS: Record<RoadStatus, string> = {
  open: '开放',
  closed: '封闭',
  construction: '施工',
  controlled: '管制',
};

/** 事件类型配色 */
export const INCIDENT_TYPE_COLORS: Record<IncidentType, string> = {
  accident: '#ef4444',       // 事故 红
  construction: '#f59e0b',   // 施工 橙
  control: '#8b5cf6',        // 管制 紫
  weather: '#22d3ee',        // 天气 青
};

/** 事件类型中文标签 */
export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  accident: '事故',
  construction: '施工',
  control: '管制',
  weather: '天气',
};

/** 事件严重程度配色 */
export const INCIDENT_SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  low: '#fbbf24',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7f1d1d',
};

/** 事件严重程度中文标签 */
export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low: '轻微',
  medium: '中等',
  high: '严重',
  critical: '重大',
};

/** 拥堵等级配色（PRD §3.2.2 classify_speed） */
export const CONGESTION_COLORS: Record<CongestionLevel, string> = {
  free: '#22d3ee',       // 高速 青
  smooth: '#4ade80',     // 畅通 绿
  slow: '#fbbf24',       // 缓行 黄
  congested: '#f59e0b',  // 拥堵 橙
  jammed: '#ef4444',     // 停滞 红
};

/** 拥堵等级中文标签 */
export const CONGESTION_LABELS: Record<CongestionLevel, string> = {
  free: '高速',
  smooth: '畅通',
  slow: '缓行',
  congested: '拥堵',
  jammed: '停滞',
};

/**
 * 按速度分类拥堵等级（PRD §3.2.2）
 * - >=60 高速 / 畅通
 * - 40-60 缓行
 * - 20-40 拥堵
 * - <20 停滞
 */
export function classifySpeed(speed: number): CongestionLevel {
  if (speed >= 60) return speed >= 80 ? 'free' : 'smooth';
  if (speed >= 40) return 'slow';
  if (speed >= 20) return 'congested';
  return 'jammed';
}

/** 道路等级 → 默认线宽（高速粗，城市细） */
export const ROAD_CLASS_WIDTHS: Record<RoadClass, number> = {
  highway: 5,
  national: 4,
  provincial: 3,
  urban: 2,
};
