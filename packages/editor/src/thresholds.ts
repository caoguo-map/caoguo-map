/**
 * 告警阈值本地规则着色（PRD 扩展）。
 * 与后端推送的 status 解耦：用户在组件配置里声明「监控字段 + 阈值」，
 * 前端根据该字段实时数值判定告警级别并着色，实现「本地规则」优先于后端状态着色。
 */

export type ThresholdLevel = 'none' | 'warn' | 'crit';

/** 阈值规则：监控字段（设备 sensor 字段名）+ 预警/告警阈值（>= 触发） */
export interface ThresholdRule {
  field?: string;
  warn?: number;
  crit?: number;
}

/** 从组件 config 读取阈值规则（扁平 key：thrField/thrWarn/thrCrit） */
export function readThresholdRule(cfg: Record<string, any> | undefined): ThresholdRule {
  if (!cfg) return {};
  const warn = cfg.thrWarn;
  const crit = cfg.thrCrit;
  return {
    field: typeof cfg.thrField === 'string' ? cfg.thrField : undefined,
    warn: typeof warn === 'number' ? warn : (warn != null ? Number(warn) : undefined),
    crit: typeof crit === 'number' ? crit : (crit != null ? Number(crit) : undefined),
  };
}

/** 评估数值命中哪个阈值级别 */
export function evalThreshold(rule: ThresholdRule, value: number | undefined): ThresholdLevel {
  if (value == null || Number.isNaN(value)) return 'none';
  if (rule.crit != null && value >= rule.crit) return 'crit';
  if (rule.warn != null && value >= rule.warn) return 'warn';
  return 'none';
}

/** 阈值级别 → 颜色（crit 红、warn 黄）。none 返回 null 表示交给默认着色（如 status 色） */
export function thresholdColor(level: ThresholdLevel): string | null {
  if (level === 'crit') return '#f87171';
  if (level === 'warn') return '#fbbf24';
  return null;
}

/**
 * 综合着色：优先应用本地阈值规则；无规则或字段缺失时回退到传入的默认颜色（通常是 status 色）。
 * @param rule       阈值规则
 * @param item       设备（含 sensor 字段）
 * @param fallback   回退颜色（status 色等）
 */
export function resolveDeviceColor(
  rule: ThresholdRule,
  item: { [k: string]: unknown },
  fallback: string,
): string {
  const lvl = evalThreshold(rule, rule.field ? (item[rule.field] as number | undefined) : undefined);
  return thresholdColor(lvl) ?? fallback;
}
