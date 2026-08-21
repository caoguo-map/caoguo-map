/**
 * 管网图例（Legend）
 *
 * 每个组件都可以在浮层面板显示一份图例。本文件是图例数据生成器，
 * 业务方可拿到后用任意 UI 库渲染。
 */

import type { ColorByMode } from '../types';
import {
  PIPELINE_TYPE_COLORS,
  PIPELINE_TYPE_LABELS,
  PIPE_STATUS_COLORS,
  PIPE_STATUS_META,
  HEALTH_LEVEL_COLORS,
  HEALTH_LEVEL_LABELS,
  PIPE_MATERIAL_COLORS,
} from './pipelineTheme';

export interface LegendItem {
  label: string;
  color: string;
  /** 可选样式（实线/虚线） */
  style?: 'solid' | 'dashed';
  /** 圆形图标用（设备点） */
  shape?: 'rect' | 'circle' | 'triangle';
}

export interface LegendSection {
  title: string;
  items: LegendItem[];
}

/** 按"管线大类"生成图例 */
export function legendByType(): LegendSection {
  return {
    title: '管线类型',
    items: Object.keys(PIPELINE_TYPE_COLORS).map((k) => ({
      label: PIPELINE_TYPE_LABELS[k as keyof typeof PIPELINE_TYPE_LABELS],
      color: PIPELINE_TYPE_COLORS[k as keyof typeof PIPELINE_TYPE_COLORS],
    })),
  };
}

/** 按"管径"生成图例 */
export function legendByDiameter(): LegendSection {
  return {
    title: '管径（mm）',
    items: [
      { label: '≤50  支管', color: '#4ade80' },
      { label: '50-150  配水/配气', color: '#60a5fa' },
      { label: '150-300  干管', color: '#f59e0b' },
      { label: '300-600  主管', color: '#ef4444' },
      { label: '≥600  主干', color: '#7f1d1d' },
    ],
  };
}

/** 按"状态"生成图例（含动画标识） */
export function legendByStatus(): LegendSection {
  return {
    title: '管段状态',
    items: (Object.keys(PIPE_STATUS_COLORS) as Array<keyof typeof PIPE_STATUS_COLORS>).map(
      (k) => {
        const meta = PIPE_STATUS_META[k];
        return {
          label: meta.label,
          color: PIPE_STATUS_COLORS[k],
          style: meta.animation === 'dashed' ? ('dashed' as const) : ('solid' as const),
        };
      }
    ),
  };
}

/** 按"材质"生成图例 */
export function legendByMaterial(): LegendSection {
  return {
    title: '管材',
    items: Object.entries(PIPE_MATERIAL_COLORS).map(([k, v]) => ({
      label: materialLabel(k),
      color: v,
    })),
  };
}

/** 按"健康度"生成图例 */
export function legendByHealth(): LegendSection {
  return {
    title: '健康等级',
    items: Object.entries(HEALTH_LEVEL_COLORS).map(([k, v]) => ({
      label: `${HEALTH_LEVEL_LABELS[k]}（${healthRangeLabel(k)}）`,
      color: v,
    })),
  };
}

function materialLabel(k: string): string {
  const map: Record<string, string> = {
    cast_iron: '铸铁',
    ductile_iron: '球墨铸铁',
    steel: '钢',
    pe: 'PE',
    pvc: 'PVC',
    concrete: '混凝土',
    hdpe: 'HDPE',
    copper: '铜',
    unknown: '未知',
  };
  return map[k] ?? k;
}

function healthRangeLabel(k: string): string {
  const map: Record<string, string> = {
    excellent: '80-100',
    good: '60-80',
    fair: '40-60',
    poor: '20-40',
    critical: '0-20',
  };
  return map[k] ?? '';
}

/** 通用入口：按模式取图例 */
export function buildLegend(mode: ColorByMode): LegendSection {
  switch (mode) {
    case 'type':
      return legendByType();
    case 'diameter':
      return legendByDiameter();
    case 'status':
      return legendByStatus();
    case 'material':
      return legendByMaterial();
    case 'health':
      return legendByHealth();
    default:
      return legendByType();
  }
}
