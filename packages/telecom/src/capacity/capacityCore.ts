/**
 * 容量热力图核心纯函数（PRD CH 系列）
 *
 * 由基站吞吐/额定容量/用户数推导容量利用率与热力图点集。
 * 纯函数，可在 Node 环境单测；渲染见 CapacityHeatmap.ts。
 */

import type { BaseStation } from '../types';

/** 容量利用率权重类型 */
export type CapacityWeight = 'utilization' | 'userLoad';

/** 单站容量统计 */
export interface StationCapacityStat {
  id: string;
  name: string;
  /** 容量利用率 0-1（无额定容量时 undefined） */
  utilization: number | undefined;
  /** 用户负载 = userCount / 容量用户上限（无额定时取 userCount 归一，undefined） */
  userLoad: number | undefined;
  overloaded: boolean;
}

/** 网络容量统计汇总 */
export interface CapacitySummary {
  total: number;
  /** 有额定容量的基站数 */
  withCapacity: number;
  /** 平均容量利用率（仅计有额定容量者） */
  avgUtilization: number;
  /** 超载基站数（利用率 > 0.8） */
  overloadedCount: number;
  overloadedStations: StationCapacityStat[];
}

const OVERLOAD = 0.8;

/** 计算单站容量指标 */
export function stationCapacityStat(station: BaseStation): StationCapacityStat {
  const p = station.properties ?? {};
  const cap = p.capacityMbps;
  const utilization = cap && cap > 0 && p.throughputMbps != null ? p.throughputMbps / cap : undefined;
  const userCap = p.capacityUserCount;
  const userLoad = userCap && userCap > 0 && p.userCount != null ? p.userCount / userCap : undefined;
  const overloaded = utilization != null && utilization > OVERLOAD;
  return {
    id: station.id,
    name: station.name ?? station.id,
    utilization,
    userLoad,
    overloaded,
  };
}

/** 汇总全网容量统计 */
export function stationCapacityStats(stations: BaseStation[]): CapacitySummary {
  const stats = stations.map(stationCapacityStat);
  const withCap = stats.filter((s) => s.utilization != null);
  const avg = withCap.length ? withCap.reduce((a, s) => a + (s.utilization ?? 0), 0) / withCap.length : 0;
  const overloadedStations = stats.filter((s) => s.overloaded);
  return {
    total: stations.length,
    withCapacity: withCap.length,
    avgUtilization: Math.round(avg * 1000) / 1000,
    overloadedCount: overloadedStations.length,
    overloadedStations,
  };
}

/**
 * 生成热力图点集（GeoJSON FeatureCollection）。
 * weight 由 kind 决定：utilization 用容量利用率，userLoad 用用户负载（缺失则回退利用率，仍缺失取 0）。
 */
export function capacityUtilizationPoints(
  stations: BaseStation[],
  kind: CapacityWeight = 'utilization',
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: stations.map((s) => {
      const stat = stationCapacityStat(s);
      const weight =
        kind === 'userLoad'
          ? stat.userLoad ?? stat.utilization ?? 0
          : stat.utilization ?? stat.userLoad ?? 0;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { stationId: s.id, name: s.name ?? s.id, weight },
      };
    }),
  };
}

// ============================================================
// CH-3 容量预警（多级阈值 + 排名）
// ============================================================

/** 预警严重等级 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/** 单条预警 */
export interface CapacityAlert {
  stationId: string;
  name: string;
  /** 容量利用率（0-1） */
  utilization: number;
  /** 严重等级 */
  severity: AlertSeverity;
  /** 超出阈值的比例（如 0.95 - 0.8 = 0.15） */
  exceed: number;
}

/** 预警阈值（默认 critical=0.95, warning=0.85, info=0.80） */
export interface AlertThresholds {
  critical: number;
  warning: number;
  info: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  critical: 0.95,
  warning: 0.85,
  info: 0.8,
};

/** 根据利用率映射严重等级 */
function severityOf(u: number, t: AlertThresholds): AlertSeverity {
  if (u >= t.critical) return 'critical';
  if (u >= t.warning) return 'warning';
  return 'info';
}

/**
 * CH-3 容量预警列表。
 *
 * 按利用率降序排列，仅返回 utilization ≥ info 阈值的基站。
 */
export function capacityAlerts(
  stations: BaseStation[],
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
): CapacityAlert[] {
  const out: CapacityAlert[] = [];
  for (const s of stations) {
    const stat = stationCapacityStat(s);
    if (stat.utilization == null) continue;
    if (stat.utilization < thresholds.info) continue;
    const severity = severityOf(stat.utilization, thresholds);
    const exceed = stat.utilization - thresholds.info;
    out.push({
      stationId: s.id,
      name: stat.name,
      utilization: stat.utilization,
      severity,
      exceed,
    });
  }
  return out.sort((a, b) => b.utilization - a.utilization);
}

/** 按 severity 分组统计 */
export function alertSeveritySummary(
  alerts: CapacityAlert[],
): Record<AlertSeverity, number> {
  const out: Record<AlertSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const a of alerts) out[a.severity]++;
  return out;
}

/** 取 Top N 超载基站（按利用率降序） */
export function topOverloadedStations(
  stations: BaseStation[],
  n: number,
  threshold: number = 0.8,
): StationCapacityStat[] {
  return stations
    .map(stationCapacityStat)
    .filter((s) => s.utilization != null && s.utilization > threshold)
    .sort((a, b) => (b.utilization ?? 0) - (a.utilization ?? 0))
    .slice(0, n);
}
