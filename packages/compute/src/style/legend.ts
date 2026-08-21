/**
 * 算力网图例
 */

import type { ComputeNodeColorBy } from '../types';
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NODE_STATUS_COLORS,
  NODE_STATUS_LABELS,
} from './computeTheme';

export interface LegendItem {
  label: string;
  color: string;
  style?: 'solid' | 'dashed';
  shape?: 'rect' | 'circle' | 'triangle';
}

export interface LegendSection {
  title: string;
  items: LegendItem[];
}

export function legendByNodeType(): LegendSection {
  return {
    title: '节点类型',
    items: Object.keys(NODE_TYPE_COLORS).map((k) => ({
      label: NODE_TYPE_LABELS[k as keyof typeof NODE_TYPE_LABELS],
      color: NODE_TYPE_COLORS[k as keyof typeof NODE_TYPE_COLORS],
      shape: 'circle' as const,
    })),
  };
}

export function legendByGpuUtil(): LegendSection {
  return {
    title: 'GPU 利用率',
    items: [
      { label: '<30% 空闲', color: '#4ade80' },
      { label: '30-60% 低负载', color: '#22d3ee' },
      { label: '60-80% 中负载', color: '#fbbf24' },
      { label: '80-95% 高负载', color: '#f59e0b' },
      { label: '>95% 满载', color: '#ef4444' },
    ],
  };
}

export function legendByNodeStatus(): LegendSection {
  return {
    title: '节点状态',
    items: Object.keys(NODE_STATUS_COLORS).map((k) => ({
      label: NODE_STATUS_LABELS[k as keyof typeof NODE_STATUS_LABELS],
      color: NODE_STATUS_COLORS[k as keyof typeof NODE_STATUS_COLORS],
      shape: 'circle' as const,
    })),
  };
}

export function legendByLinkUtil(): LegendSection {
  return {
    title: '光缆利用率',
    items: [
      { label: '<50% 空闲', color: '#4ade80' },
      { label: '50-80% 正常', color: '#fbbf24' },
      { label: '>80% 拥塞', color: '#ef4444' },
    ],
  };
}

export function buildComputeLegend(mode: ComputeNodeColorBy): LegendSection {
  switch (mode) {
    case 'type':
      return legendByNodeType();
    case 'gpuUtil':
      return legendByGpuUtil();
    case 'status':
      return legendByNodeStatus();
    default:
      return legendByNodeType();
  }
}
