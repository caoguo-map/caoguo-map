/**
 * 草果地图通信网专用样式 - `caoguo-telecom`
 *
 * 颜色规范依据 PRD phase-3 §5.1.3：
 * - 基站按运营商着色：移动绿 / 联通红 / 电信蓝 / 广电橙
 * - 信号强度（RSRP）热力：极弱红 → 弱橙 → 一般黄 → 好绿 → 极好青
 * - 运营商品牌主题（PRD §5.3）
 */

import type { Carrier, Technology, StationStatus, SignalLevel } from '../types';
import { INDUSTRY_META } from '@caoguo/theme';

/** 通信网行业主色（六张网统一标识色，单一来源 @caoguo/theme） */
export const INDUSTRY_PRIMARY = INDUSTRY_META.telecom.primary;

/** 运营商配色（PRD §5.1.3） */
export const CARRIER_COLORS: Record<Carrier, string> = {
  '中国移动': '#4ade80',
  '中国联通': '#ef4444',
  '中国电信': '#3b82f6',
  '中国广电': '#f59e0b',
};

/** 技术制式配色 */
export const TECHNOLOGY_COLORS: Record<Technology, string> = {
  '5G': '#22d3ee',
  '4G': '#3b82f6',
  '3G': '#6b7280',
};

/** 基站状态配色 */
export const STATION_STATUS_COLORS: Record<StationStatus, string> = {
  online: '#4ade80',
  offline: '#6b7280',
  fault: '#ef4444',
};

/** 基站状态中文标签 */
export const STATION_STATUS_LABELS: Record<StationStatus, string> = {
  online: '在线',
  offline: '离线',
  fault: '故障',
};

/** 信号等级配色 */
export const SIGNAL_LEVEL_COLORS: Record<SignalLevel, string> = {
  excellent: '#22d3ee',
  good: '#4ade80',
  fair: '#fbbf24',
  poor: '#f59e0b',
};

/** 信号等级中文标签 */
export const SIGNAL_LEVEL_LABELS: Record<SignalLevel, string> = {
  excellent: '极好',
  good: '良好',
  fair: '一般',
  poor: '弱',
};

/**
 * 运营商品牌主题（PRD §5.3）
 */
export interface CarrierTheme {
  name: Carrier;
  primary: string;
  secondary: string;
}

export const CARRIER_THEMES: Record<Carrier, CarrierTheme> = {
  '中国移动': { name: '中国移动', primary: '#4ade80', secondary: '#166534' },
  '中国联通': { name: '中国联通', primary: '#ef4444', secondary: '#991b1b' },
  '中国电信': { name: '中国电信', primary: '#3b82f6', secondary: '#1e40af' },
  '中国广电': { name: '中国广电', primary: '#f59e0b', secondary: '#92400e' },
};

/**
 * RSRP → 信号等级
 * PRD §5.1.3 colorBySignal：
 * -120 极弱红 / -105 弱橙 / -90 一般黄 / -80 好绿 / -65 极好青
 */
export function classifyRsrp(rsrp: number): SignalLevel {
  if (rsrp >= -65) return 'excellent';
  if (rsrp >= -80) return 'good';
  if (rsrp >= -90) return 'fair';
  return 'poor';
}
