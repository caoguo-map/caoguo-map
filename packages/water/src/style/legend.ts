/**
 * 水网图例构建（caoguo-water）
 */

import type { WaterColorByMode } from '../types';
import { DIKE_SAFETY_COLORS, DIKE_SAFETY_LABELS } from './waterTheme';

export interface LegendItem {
  color: string;
  label: string;
  style?: 'solid' | 'dashed';
}

export interface Legend {
  title: string;
  items: LegendItem[];
}

/** 按着色模式构建图例 */
export function buildWaterLegend(mode: WaterColorByMode): Legend {
  switch (mode) {
    case 'flow':
      return {
        title: '河流流量',
        items: [
          { color: '#93c5fd', label: '低流量 <100 m³/s' },
          { color: '#3b82f6', label: '中流量 100-500' },
          { color: '#1d4ed8', label: '高流量 500-1000' },
          { color: '#ef4444', label: '超警 ≥1000' },
        ],
      };
    case 'storage':
      return {
        title: '水库蓄水率',
        items: [
          { color: '#fbbf24', label: '干旱 <30%' },
          { color: '#4ade80', label: '正常 30-70%' },
          { color: '#3b82f6', label: '充裕 70-90%' },
          { color: '#ef4444', label: '满库 ≥90%' },
        ],
      };
    case 'dike':
      return {
        title: '堤防安全状态',
        items: Object.entries(DIKE_SAFETY_COLORS).map(([k, color]) => ({
          color,
          label: DIKE_SAFETY_LABELS[k as keyof typeof DIKE_SAFETY_LABELS],
        })),
      };
    case 'level':
      return {
        title: '河流层级',
        items: [
          { color: '#0ea5e9', label: '流域' },
          { color: '#3b82f6', label: '干流' },
          { color: '#60a5fa', label: '支流' },
          { color: '#93c5fd', label: '河段' },
        ],
      };
    case 'uniform':
    default:
      return { title: '单色', items: [{ color: '#60a5fa', label: '全部' }] };
  }
}
