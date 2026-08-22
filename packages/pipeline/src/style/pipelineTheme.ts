/**
 * 草果地图管网专用样式 - `caoguo-pipeline`
 *
 * 设计目标：
 * - 行业辨识度高：燃气=琥珀、供水=蓝、供热=红、电力=紫、通信=绿、排水=灰
 * - 状态语义强：正常/老化/损坏/维修中 各有专属色 + 动画
 * - 与 caoguo-dark/light 主题协调：在亮/暗模式下都可读
 *
 * 颜色规范依据 PRD §4.5。
 */

import type { PipelineType, PipeMaterial, PipeStatus, NodeKind } from '../types';
import { INDUSTRY_META } from '@caoguo/theme';

/** 管网行业主色（六张网统一标识色，单一来源 @caoguo/theme） */
export const INDUSTRY_PRIMARY = INDUSTRY_META.pipeline.primary;

/** 管线大类配色（caoguo-pipeline） */
export const PIPELINE_TYPE_COLORS: Record<PipelineType, string> = {
  gas: '#f59e0b',       // 琥珀（燃气）
  water: '#3b82f6',      // 蓝（供水）
  drainage: '#6b7280',   // 灰（排水）
  heating: '#ef4444',    // 红（供热）
  power: '#8b5cf6',      // 紫（电力管沟）
  telecom: '#10b981',    // 绿（通信管沟）
};

/** 管线大类的中文标签（地图图例/卡片显示） */
export const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  gas: '燃气管',
  water: '供水管',
  drainage: '排水管',
  heating: '供热管',
  power: '电力管沟',
  telecom: '通信管沟',
};

/** 管线大类的 Emoji 图标（轻量可视化标识，用于卡片/Tag） */
export const PIPELINE_TYPE_ICONS: Record<PipelineType, string> = {
  gas: '🔥',
  water: '💧',
  drainage: '🚰',
  heating: '🔴',
  power: '⚡',
  telecom: '📡',
};

/** 管段状态配色 */
export const PIPE_STATUS_COLORS: Record<PipeStatus, string> = {
  normal: '#4ade80',       // 绿
  aging: '#fbbf24',        // 黄
  damaged: '#ef4444',      // 红
  under_repair: '#8b5cf6', // 紫
  abandoned: '#4b5563',    // 深灰
  unknown: '#6b7280',      // 灰
};

/** 状态的语义 + 动画 */
export const PIPE_STATUS_META: Record<
  PipeStatus,
  { label: string; animation?: 'pulse' | 'dashed' | 'none' }
> = {
  normal: { label: '正常', animation: 'none' },
  aging: { label: '老化', animation: 'none' },
  damaged: { label: '损坏', animation: 'pulse' },
  under_repair: { label: '维修中', animation: 'dashed' },
  abandoned: { label: '废弃', animation: 'none' },
  unknown: { label: '未知', animation: 'none' },
};

/** 管材配色（maplibre style 用） */
export const PIPE_MATERIAL_COLORS: Record<PipeMaterial, string> = {
  cast_iron: '#94a3b8',     // 蓝灰（旧铸铁）
  ductile_iron: '#0ea5e9',  // 天蓝（球墨铸铁）
  steel: '#64748b',         // 钢蓝
  pe: '#22c55e',            // 绿（PE 现代管材）
  pvc: '#a78bfa',           // 紫（PVC）
  concrete: '#a8a29e',      // 米灰（混凝土）
  hdpe: '#16a34a',          // 深绿（HDPE）
  copper: '#d97706',        // 橙（铜）
  unknown: '#6b7280',
};

/** 节点图标（用 SVG path 描点，地图渲染层用） */
export const NODE_KIND_ICONS: Record<NodeKind, string> = {
  junction: 'M -6 0 L 6 0 M 0 -6 L 0 6',        // 十字
  valve: 'M -8 -4 L 8 4 M 0 -4 L 0 4',          // X
  pump: 'M -6 0 A 6 6 0 1 0 6 0 A 6 6 0 1 0 -6 0', // 圆
  meter: 'M -6 -6 L 6 -6 L 6 6 L -6 6 Z',       // 方
  source: 'M 0 -10 L 6 6 L -6 6 Z',             // 三角
  tank: 'M -8 -6 Q 0 -10 8 -6 L 8 6 L -8 6 Z',  // 圆角
  junction_box: 'M -7 -4 L 7 -4 L 7 4 L -7 4 Z',// 小方
};

/** 节点配色（默认按 type 衍生） */
export const NODE_KIND_COLORS: Record<NodeKind, string> = {
  junction: '#94a3b8',
  valve: '#ef4444',     // 阀门=红（控制关键）
  pump: '#f59e0b',
  meter: '#3b82f6',
  source: '#22c55e',
  tank: '#06b6d4',
  junction_box: '#8b5cf6',
};

/** 健康度等级配色（PipelineHealth 用） */
export const HEALTH_LEVEL_COLORS: Record<string, string> = {
  excellent: '#22c55e',  // 绿 80-100
  good: '#3b82f6',       // 蓝 60-80
  fair: '#eab308',       // 黄 40-60
  poor: '#f97316',       // 橙 20-40
  critical: '#ef4444',   // 红 0-20
};

/** 健康等级 label */
export const HEALTH_LEVEL_LABELS: Record<string, string> = {
  excellent: '优',
  good: '良',
  fair: '中',
  poor: '差',
  critical: '危',
};

/**
 * 健康度 → 等级（保留闭区间，遵守 PRD §4.4.2）
 * @param score 0-100 健康分
 */
export function healthLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

/** 按管线类型取默认色（兜底用） */
export function pipelineTypeColor(type: PipelineType | undefined): string {
  if (!type) return '#94a3b8';
  return PIPELINE_TYPE_COLORS[type];
}
