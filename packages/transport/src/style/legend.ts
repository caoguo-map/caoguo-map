/**
 * 交通网图例（Legend）
 */

import type { RoadColorBy } from '../types';
import {
  ROAD_CLASS_COLORS,
  ROAD_CLASS_LABELS,
  ROAD_STATUS_COLORS,
  ROAD_STATUS_LABELS,
  INCIDENT_TYPE_COLORS,
  INCIDENT_TYPE_LABELS,
} from './transportTheme';

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

export function legendByRoadClass(): LegendSection {
  return {
    title: '道路等级',
    items: Object.keys(ROAD_CLASS_COLORS).map((k) => ({
      label: ROAD_CLASS_LABELS[k as keyof typeof ROAD_CLASS_LABELS],
      color: ROAD_CLASS_COLORS[k as keyof typeof ROAD_CLASS_COLORS],
    })),
  };
}

export function legendByStatus(): LegendSection {
  return {
    title: '路段状态',
    items: Object.keys(ROAD_STATUS_COLORS).map((k) => ({
      label: ROAD_STATUS_LABELS[k as keyof typeof ROAD_STATUS_LABELS],
      color: ROAD_STATUS_COLORS[k as keyof typeof ROAD_STATUS_COLORS],
    })),
  };
}

export function legendBySpeed(): LegendSection {
  return {
    title: '实时路况（km/h）',
    items: [
      { label: '≥80 高速', color: '#22d3ee' },
      { label: '60-80 畅通', color: '#4ade80' },
      { label: '40-60 缓行', color: '#fbbf24' },
      { label: '20-40 拥堵', color: '#f59e0b' },
      { label: '<20 停滞', color: '#ef4444' },
    ],
  };
}

export function legendByIncident(): LegendSection {
  return {
    title: '事件类型',
    items: Object.keys(INCIDENT_TYPE_COLORS).map((k) => ({
      label: INCIDENT_TYPE_LABELS[k as keyof typeof INCIDENT_TYPE_LABELS],
      color: INCIDENT_TYPE_COLORS[k as keyof typeof INCIDENT_TYPE_COLORS],
      shape: 'circle' as const,
    })),
  };
}

export function buildRoadLegend(mode: RoadColorBy): LegendSection {
  switch (mode) {
    case 'roadClass':
      return legendByRoadClass();
    case 'speed':
      return legendBySpeed();
    case 'status':
      return legendByStatus();
    default:
      return legendByRoadClass();
  }
}
