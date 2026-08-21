/**
 * 电网图例构建（caoguo-grid）
 *
 * 为前端图例面板提供「标题 + 色块列表」结构，
 * 与 pipeline 包 buildLegend 保持一致的数据形态。
 */

import type { GridColorByMode } from '../types';
import {
  VOLTAGE_COLORS,
  VOLTAGE_LABELS,
  GRID_STATUS_COLORS,
  GRID_STATUS_LABELS,
} from './gridTheme';

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
export function buildGridLegend(mode: GridColorByMode): Legend {
  switch (mode) {
    case 'voltage':
      return {
        title: '电压等级',
        items: Object.entries(VOLTAGE_COLORS).map(([k, color]) => ({
          color,
          label: VOLTAGE_LABELS[k as keyof typeof VOLTAGE_LABELS],
        })),
      };
    case 'status':
      return {
        title: '运行状态',
        items: Object.entries(GRID_STATUS_COLORS).map(([k, color]) => ({
          color,
          label: GRID_STATUS_LABELS[k as keyof typeof GRID_STATUS_LABELS],
        })),
      };
    case 'load':
      return {
        title: '负载率',
        items: [
          { color: '#22c55e', label: '轻载 <40%' },
          { color: '#4ade80', label: '正常 40-60%' },
          { color: '#fbbf24', label: '偏高 60-80%' },
          { color: '#ef4444', label: '过载 ≥80%' },
        ],
      };
    case 'year':
      return {
        title: '投运年份',
        items: [
          { color: '#ef4444', label: '1980 前' },
          { color: '#fbbf24', label: '1980-2000' },
          { color: '#3b82f6', label: '2000-2015' },
          { color: '#22c55e', label: '2015 后' },
        ],
      };
    case 'uniform':
    default:
      return { title: '单色', items: [{ color: '#60a5fa', label: '全部' }] };
  }
}
