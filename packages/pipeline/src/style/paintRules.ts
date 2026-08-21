/**
 * 管网 MapLibre paint 规则（caoguo-pipeline）
 *
 * 把"管线/节点如何着色"的业务规则翻译成 MapLibre style spec，
 * 业务方可直接 addLayer / setPaintProperty 使用。
 *
 * 规则集：
 * - 管线按管线大类着色（type）
 * - 管线按管径着色（diameter，PRD §4.1.4）
 * - 管线按状态着色（status）
 * - 管线按材质着色（material）
 * - 管线按健康度着色（health，PipelineHealth 集成）
 *
 * 节点按节点类型着色 + 图标。
 */

import type {
  PipelineType,
  PipeMaterial,
  PipeStatus,
  ColorByMode,
} from '../types';
import { PIPELINE_TYPE_COLORS, PIPE_STATUS_COLORS, HEALTH_LEVEL_COLORS, PIPE_MATERIAL_COLORS } from './pipelineTheme';

/**
 * MapLibre style spec 的 color function DSL（typed），
 * 业务方可直接 `map.addLayer({type:'line', paint: {'line-color': rule} })`
 *
 * MapLibre 表达式其实接受 string | number | 嵌套数组，所以我们用 unknown 让 TS 放行
 */
export type PaintRule = unknown;

/** 管线按"管线大类"着色 */
export function paintPipeByType(types?: PipelineType[]): PaintRule {
  if (!types || types.length === 0) {
    // 全部类型都涂色
    return [
      'match',
      ['get', 'pipelineType'],
      ...Object.entries(PIPELINE_TYPE_COLORS).flatMap(([k, v]) => [k, v]),
      '#94a3b8',
    ];
  }
  return [
    'match',
    ['get', 'pipelineType'],
    ...types.flatMap((t) => [t, PIPELINE_TYPE_COLORS[t]]),
    '#94a3b8',
  ];
}

/** 管线按"管径"渐变着色（PRD §4.1.4） */
export function paintPipeByDiameter(): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'diameter'], 0],
    0, '#4ade80',     // 极细管  绿
    50, '#4ade80',    // DN50 以下  绿（支管）
    150, '#60a5fa',   // DN150 蓝（配水管）
    300, '#f59e0b',   // DN300 黄（干管）
    600, '#ef4444',   // DN600+ 红（主管）
    1500, '#7f1d1d',  // 极大管  深红
  ];
}

/** 管线按"状态"着色 */
export function paintPipeByStatus(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'status'], 'unknown'],
    ...Object.entries(PIPE_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 管线按"材质"着色 */
export function paintPipeByMaterial(): PaintRule {
  return [
    'match',
    ['coalesce', ['get', 'material'], 'unknown'],
    ...Object.entries(PIPE_MATERIAL_COLORS).flatMap(([k, v]) => [k, v]),
    '#6b7280',
  ];
}

/** 管线按"健康度"着色（健康分 0-100，规则按 healthLevel 离散） */
export function paintPipeByHealth(): PaintRule {
  return [
    'step',
    ['coalesce', ['get', 'healthScore'], 100],
    HEALTH_LEVEL_COLORS.critical,  // <20
    20, HEALTH_LEVEL_COLORS.poor,
    40, HEALTH_LEVEL_COLORS.fair,
    60, HEALTH_LEVEL_COLORS.good,
    80, HEALTH_LEVEL_COLORS.excellent,
  ];
}

/** 根据模式返回 paint rule 工厂 */
export function paintPipeBy(mode: ColorByMode, opts?: { types?: PipelineType[] }): PaintRule {
  switch (mode) {
    case 'type':
      return paintPipeByType(opts?.types);
    case 'diameter':
      return paintPipeByDiameter();
    case 'status':
      return paintPipeByStatus();
    case 'material':
      return paintPipeByMaterial();
    case 'health':
      return paintPipeByHealth();
    case 'uniform':
    default:
      return '#60a5fa';
  }
}

/** 节点按 kind 着色（maplibre style circle-color 用） */
export function paintNodeByKind(): PaintRule {
  return [
    'match',
    ['get', 'kind'],
    'junction', '#94a3b8',
    'valve', '#ef4444',
    'pump', '#f59e0b',
    'meter', '#3b82f6',
    'source', '#22c55e',
    'tank', '#06b6d4',
    'junction_box', '#8b5cf6',
    '#cbd5e1',
  ];
}

/** 默认管段宽度（按管径递推） */
export function paintPipeWidthByDiameter(minWidth = 1.5, maxWidth = 6): PaintRule {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'diameter'], 100],
    0, minWidth,
    1500, maxWidth,
  ];
}
