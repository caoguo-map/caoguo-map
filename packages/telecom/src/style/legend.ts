/**
 * 通信网图例
 */

import type { StationColorBy } from '../types';
import {
  CARRIER_COLORS,
  TECHNOLOGY_COLORS,
  STATION_STATUS_COLORS,
  STATION_STATUS_LABELS,
} from './telecomTheme';

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

export function legendByCarrier(): LegendSection {
  return {
    title: '运营商',
    items: Object.keys(CARRIER_COLORS).map((k) => ({
      label: k,
      color: CARRIER_COLORS[k as keyof typeof CARRIER_COLORS],
      shape: 'circle' as const,
    })),
  };
}

export function legendByTechnology(): LegendSection {
  return {
    title: '技术制式',
    items: Object.keys(TECHNOLOGY_COLORS).map((k) => ({
      label: k,
      color: TECHNOLOGY_COLORS[k as keyof typeof TECHNOLOGY_COLORS],
      shape: 'circle' as const,
    })),
  };
}

export function legendByStationStatus(): LegendSection {
  return {
    title: '基站状态',
    items: Object.keys(STATION_STATUS_COLORS).map((k) => ({
      label: STATION_STATUS_LABELS[k as keyof typeof STATION_STATUS_LABELS],
      color: STATION_STATUS_COLORS[k as keyof typeof STATION_STATUS_COLORS],
      shape: 'circle' as const,
    })),
  };
}

export function legendBySignal(): LegendSection {
  return {
    title: '信号强度（RSRP dBm）',
    items: [
      { label: '≥-65 极好', color: '#22d3ee' },
      { label: '-80~-65 良好', color: '#4ade80' },
      { label: '-90~-80 一般', color: '#fbbf24' },
      { label: '-105~-90 弱', color: '#f59e0b' },
      { label: '<-105 极弱', color: '#ef4444' },
    ],
  };
}

export function buildTelecomLegend(mode: StationColorBy): LegendSection {
  switch (mode) {
    case 'carrier':
      return legendByCarrier();
    case 'technology':
      return legendByTechnology();
    case 'status':
      return legendByStationStatus();
    default:
      return legendByCarrier();
  }
}
