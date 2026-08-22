import { registerTheme, buildStyle, type ThemeStyleFull } from '../build';

/**
 * 六张网行业主题真实配色寄存器。
 *
 * 所有语义色均来自各业务包（`@caoguo/{grid,water,transport,compute,telecom,pipeline}`）中
 * 既已落地的 `*Theme.ts` / `paintRules.ts` 颜色常量，是项目内已采用的「真实配色」。
 * 这里把它们汇总为权威色板，供大屏换肤、图例、demo 与业务包统一复用，也提供
 * `buildStyle({ theme: 'caoguo-ind-pipeline' })` 可直接使用的行业底图变体。
 */

/** 六张网标识 */
export type IndustryKey =
  | 'pipeline' // 管网
  | 'grid' // 电网
  | 'water' // 水网
  | 'transport' // 交通
  | 'compute' // 算力
  | 'telecom'; // 通信

/** 单个语义色条目：键（英文枚举）-> hex 颜色 */
export type Palette = Record<string, string>;

export interface IndustryMeta {
  /** 主题注册名（buildStyle 的 theme 值） */
  themeId: string;
  /** 中文名 */
  label: string;
  /** 行业主色（大屏辨识色，注入 --cg-map-accent / --cg-brand） */
  primary: string;
  /** 暗底主题基准（行业变体基于 dark 派生） */
  base: 'dark' | 'light';
}

export interface IndustryTheme {
  meta: IndustryMeta;
  /** 核心语义色板（要素分类 / 类型） */
  palette: Palette;
  /** 分级色（数值梯度，常用于热力 / 流量 / 负载） */
  ramp: string[];
  /** 状态色（正常 / 预警 / 危险 等） */
  status: Palette;
}

/** 六张网元信息：主色互不撞色，辨识度高 */
export const INDUSTRY_META: Record<IndustryKey, IndustryMeta> = {
  pipeline: { themeId: 'caoguo-ind-pipeline', label: '管网', primary: '#0891b2', base: 'dark' },
  grid: { themeId: 'caoguo-ind-grid', label: '电网', primary: '#f59e0b', base: 'dark' },
  water: { themeId: 'caoguo-ind-water', label: '水网', primary: '#3b82f6', base: 'dark' },
  transport: { themeId: 'caoguo-ind-transport', label: '交通', primary: '#f97316', base: 'dark' },
  compute: { themeId: 'caoguo-ind-compute', label: '算力', primary: '#8b5cf6', base: 'dark' },
  telecom: { themeId: 'caoguo-ind-telecom', label: '通信', primary: '#10b981', base: 'dark' },
};

/**
 * 六张网真实配色色板汇总。
 * 取值对应：
 *  - grid       ← packages/grid/src/style/gridTheme.ts + legend.ts
 *  - water      ← packages/water/src/style/waterTheme.ts + paintRules.ts
 *  - transport  ← packages/transport/src/style/transportTheme.ts
 *  - compute    ← packages/compute/src/style/computeTheme.ts + paintRules.ts
 *  - telecom    ← packages/telecom/src/style/telecomTheme.ts + paintRules.ts
 *  - pipeline   ← packages/pipeline/src/style/pipelineTheme.ts (PIPELINE_TYPE / PIPELINE_STATUS)
 */
export const INDUSTRY_PALETTES: Record<IndustryKey, IndustryTheme> = {
  pipeline: {
    meta: INDUSTRY_META.pipeline,
    palette: {
      gas: '#f97316', // 输气
      oil: '#fbbf24', // 输油
      waterSupply: '#3b82f6', // 供水
      drainage: '#0ea5e9', // 排水
      composite: '#8b5cf6', // 综合管廊
    },
    ramp: ['#93c5fd', '#3b82f6', '#1d4ed8', '#7f1d1d'], // 低 -> 高 -> 危险
    status: {
      normal: '#4ade80',
      warning: '#fbbf24',
      danger: '#ef4444',
      maintenance: '#8b5cf6',
    },
  },
  grid: {
    meta: INDUSTRY_META.grid,
    palette: {
      uhv: '#ef4444', // 特高压
      high: '#f59e0b', // 高压
      medium: '#3b82f6', // 中压
      low: '#22c55e', // 低压
      distribution: '#a855f7', // 配电
      node: '#fbbf24', // 变电站
    },
    ramp: ['#15803d', '#22c55e', '#a3e635', '#facc15', '#f59e0b', '#ef4444'], // 负载 轻->重
    status: {
      normal: '#22c55e',
      warning: '#f59e0b',
      fault: '#ef4444',
      offline: '#6b7280',
    },
  },
  water: {
    meta: INDUSTRY_META.water,
    palette: {
      basin: '#0ea5e9', // 流域
      mainstream: '#3b82f6', // 干流
      tributary: '#60a5fa', // 支流
      reach: '#93c5fd', // 河段
      reservoir: '#0ea5e9', // 水库
      gate: '#f59e0b', // 闸站
      dike: '#fbbf24', // 堤防
      rainStation: '#22d3ee', // 雨量站
      waterStation: '#38bdf8', // 水位站
    },
    ramp: ['#93c5fd', '#3b82f6', '#1d4ed8', '#ef4444'], // 流量 低->超警
    status: {
      safe: '#4ade80',
      warning: '#fbbf24',
      danger: '#ef4444',
      breach: '#7f1d1d',
    },
  },
  transport: {
    meta: INDUSTRY_META.transport,
    palette: {
      highway: '#f59e0b', // 高速
      national: '#ef4444', // 国道
      provincial: '#8b5cf6', // 省道
      urban: '#6b7280', // 城市道路
      rail: '#22d3ee', // 轨道
      aviation: '#14b8a6', // 航空
    },
    ramp: ['#ef4444', '#f59e0b', '#fbbf24', '#4ade80', '#22d3ee'], // 拥堵 停滞->高速
    status: {
      open: '#4ade80',
      closed: '#ef4444',
      construction: '#fbbf24',
      controlled: '#8b5cf6',
    },
  },
  compute: {
    meta: INDUSTRY_META.compute,
    palette: {
      coreNode: '#3b82f6', // 主节点
      regionCloud: '#8b5cf6', // 区域云
      backbone: '#22d3ee', // 骨干网
      edge: '#14b8a6', // 边缘
      cluster: '#f59e0b', // 集群
    },
    ramp: ['#1e3a8a', '#3b82f6', '#22d3ee', '#a3e635', '#f59e0b', '#ef4444'], // 负载 低->高
    status: {
      idle: '#6b7280',
      healthy: '#22c55e',
      warning: '#f59e0b',
      critical: '#ef4444',
    },
  },
  telecom: {
    meta: INDUSTRY_META.telecom,
    palette: {
      fiber: '#22d3ee', // 光纤
      '5g': '#10b981', // 5G
      microwave: '#f59e0b', // 微波
      satellite: '#8b5cf6', // 卫星
      baseStation: '#14b8a6', // 基站
    },
    ramp: ['#ef4444', '#f59e0b', '#fbbf24', '#22d3ee', '#10b981'], // 信号 差->好
    status: {
      offline: '#6b7280',
      poor: '#ef4444',
      fair: '#f59e0b',
      good: '#22d3ee',
      excellent: '#10b981',
    },
  },
};

/** 基于暗/亮底图克隆并注入行业主色，派生一张行业主题底图 */
export function buildIndustryStyle(key: IndustryKey, mode: 'dark' | 'light' = 'dark'): ThemeStyleFull {
  const theme = INDUSTRY_PALETTES[key];
  const base = theme.meta.base === 'dark' ? 'caoguo-dark' : 'caoguo-light';
  const style = buildStyle({ theme: mode === 'dark' ? base : 'caoguo-light' }) as ThemeStyleFull;
  // 注入行业主色到地图 accent 变量（业务图层与大屏辉光统一取色）
  style.metadata = {
    ...(style.metadata ?? {}),
    'cg:industry': key,
    'cg:industry-label': theme.meta.label,
    'cg:industry-primary': theme.meta.primary,
  };
  return style;
}

let registered = false;

/** 将六张网行业主题注册到主题注册表，使 buildStyle({ theme }) 可用 */
export function registerIndustryThemes(): void {
  if (registered) return;
  (Object.keys(INDUSTRY_PALETTES) as IndustryKey[]).forEach((key) => {
    const theme = INDUSTRY_PALETTES[key];
    registerTheme(theme.meta.themeId, buildIndustryStyle(key, theme.meta.base));
  });
  registered = true;
}
