export * from './waterTheme';
export * from './paintRules';
export * from './legend';

// 与 README / 顶层 index.ts 承诺一致的别名导出
import { flowColor, storageColor, WATER_FEATURE_COLORS, DIKE_SAFETY_COLORS } from './waterTheme';
import { buildWaterLegend } from './legend';

/** 水网可视化主题（聚合常用配色与图例） */
export const waterTheme = {
  flowColor,
  storageColor,
  featureColors: WATER_FEATURE_COLORS,
  safetyColors: DIKE_SAFETY_COLORS,
  legend: buildWaterLegend,
};

/** 河流/水系配色常量（流向着色档位） */
export const WATER_FLOW_COLORS = {
  low: '#38bdf8',
  medium: '#f59e0b',
  high: '#ef4444',
};

/** 水网图例（别名，等价于 buildWaterLegend()） */
export const waterLegend = buildWaterLegend;
