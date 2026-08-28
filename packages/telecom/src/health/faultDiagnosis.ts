/**
 * 故障根因分析（PRD phase-3 §5.2 NH-4 的数据层）
 *
 * 原实现 `NetworkHealth.guessFaultReason()` 是一条 if-else 链：
 * 只返回**第一个**命中的原因，阈值硬编码，且无法解释"为什么"。
 *
 * 本模块升级为**多因子证据链**：
 * 1. 收集全部命中的异常因子（而不是首个），每条给出证据值与阈值；
 * 2. 按严重度排序得出主因 `primary`，并给出置信度；
 * 3. 支持区域聚集检测（同区域多站同时故障 → 疑似区域性断电/传输中断）；
 * 4. **所有阈值可通过 options 覆盖**，不把业务参数写死在代码里。
 *
 * 重要说明：这是基于**基站实时属性**的规则诊断，不是运营商的告警根因库。
 * 它能回答"数据显示哪些指标异常"，不能替代设备侧告警与人工复核。
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { BaseStation } from '../types';

/** 根因编码 */
export type FaultReasonCode =
  /** 吞吐量异常偏低 */
  | 'low_throughput'
  /** 用户过载 */
  | 'user_overload'
  /** 发射功率异常 */
  | 'low_power'
  /** 区域性聚集故障（同区域多站同时故障） */
  | 'cluster_outage'
  /** 无明确异常 */
  | 'unknown';

/** 严重度 */
export type FaultSeverity = 'critical' | 'major' | 'minor';

/** 单条根因（含证据，便于 UI 展示"为什么"） */
export interface FaultReason {
  code: FaultReasonCode;
  /** 中文说明 */
  label: string;
  severity: FaultSeverity;
  /** 证据：实际值 → 阈值 */
  evidence: string;
}

/** 诊断阈值（全部可覆盖） */
export interface FaultDiagnosisOptions {
  /** 吞吐量下限（Mbps），低于此值视为异常 */
  minThroughputMbps?: number;
  /** 用户数上限，超过视为过载 */
  maxUserCount?: number;
  /** 发射功率下限（dBm） */
  minPowerDbm?: number;
  /**
   * 区域聚集判定：同区域故障站数 ≥ 该值即视为区域性故障
   * 传入 0 可关闭聚集检测
   */
  clusterMinFaults?: number;
}

/** 单个基站的诊断结果 */
export interface FaultDiagnosis {
  stationId: string;
  /** 命中的全部根因（按严重度降序） */
  reasons: FaultReason[];
  /** 主因（severity 最高者；无命中时为 unknown） */
  primary: FaultReason;
  /** 置信度 0-1：命中因子越多、区域聚集证据越强则越高 */
  confidence: number;
}

/** 批量诊断汇总 */
export interface FaultDiagnosisSummary {
  /** 参与诊断的故障站数 */
  total: number;
  /** 按根因编码计数 */
  byReason: Record<FaultReasonCode, number>;
  /** 判定为区域性故障的区域列表（含故障站数） */
  clusterRegions: Array<{ region: string; faultCount: number }>;
  /** 单个基站的诊断明细 */
  details: FaultDiagnosis[];
}

const DEFAULTS: Required<FaultDiagnosisOptions> = {
  minThroughputMbps: 10,
  maxUserCount: 500,
  minPowerDbm: 30,
  clusterMinFaults: 2,
};

const SEVERITY_WEIGHT: Record<FaultSeverity, number> = {
  critical: 3,
  major: 2,
  minor: 1,
};

/**
 * 同严重度下的优先级：数值越大越靠前。
 *
 * 依据「更全局的原因优先」：区域性故障（断电/传输中断）能解释单站指标异常，
 * 反之不成立 —— 因此同为 critical 时 cluster_outage 优先于 low_power。
 */
const REASON_PRIORITY: Record<FaultReasonCode, number> = {
  cluster_outage: 3,
  low_power: 2,
  user_overload: 1,
  low_throughput: 1,
  unknown: 0,
};

/**
 * 诊断单个基站
 * @param station 待诊断基站
 * @param opts.clusterFaultRegions 已判定为区域性故障的区域（由 `diagnoseFaults` 计算后传入）
 */
export function diagnoseFaultStation(
  station: BaseStation,
  opts: FaultDiagnosisOptions & { clusterFaultRegions?: Set<string> } = {}
): FaultDiagnosis {
  const o = { ...DEFAULTS, ...opts };
  const p = station.properties ?? {};
  const reasons: FaultReason[] = [];

  const throughput = num(p.throughputMbps);
  if (throughput !== undefined && throughput < o.minThroughputMbps) {
    reasons.push({
      code: 'low_throughput',
      label: '吞吐量异常偏低',
      severity: 'major',
      evidence: `吞吐 ${throughput} Mbps < 阈值 ${o.minThroughputMbps} Mbps`,
    });
  }

  const users = num(p.userCount);
  if (users !== undefined && users > o.maxUserCount) {
    reasons.push({
      code: 'user_overload',
      label: '用户过载',
      severity: 'major',
      evidence: `在线用户 ${users} > 阈值 ${o.maxUserCount}`,
    });
  }

  const power = num(p.powerDbm);
  if (power !== undefined && power < o.minPowerDbm) {
    reasons.push({
      code: 'low_power',
      label: '发射功率异常',
      severity: 'critical',
      evidence: `功率 ${power} dBm < 阈值 ${o.minPowerDbm} dBm`,
    });
  }

  // 区域性聚集故障（需由批量诊断传入区域集合）
  const region = station.properties?.region;
  if (region && opts.clusterFaultRegions?.has(region)) {
    reasons.push({
      code: 'cluster_outage',
      label: '区域性聚集故障',
      severity: 'critical',
      evidence: `所在区域「${region}」存在多站同时故障，疑似断电或传输中断`,
    });
  }

  reasons.sort((a, b) => {
    const bySeverity = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
    return bySeverity !== 0 ? bySeverity : REASON_PRIORITY[b.code] - REASON_PRIORITY[a.code];
  });

  const primary: FaultReason =
    reasons[0] ?? {
      code: 'unknown',
      label: '未知故障',
      severity: 'minor',
      evidence: '各指标均在阈值内，需结合设备侧告警排查',
    };

  return {
    stationId: station.id,
    reasons,
    primary,
    confidence: confidenceOf(reasons),
  };
}

/**
 * 批量诊断故障基站，并做区域聚集检测
 * @param stations 全量基站（内部会筛出 status === 'fault' 的）
 */
export function diagnoseFaults(
  stations: BaseStation[],
  opts: FaultDiagnosisOptions = {}
): FaultDiagnosisSummary {
  const o = { ...DEFAULTS, ...opts };
  const faulted = stations.filter((s) => s.properties?.status === 'fault');

  // 区域聚集：同区域故障数 >= clusterMinFaults
  const byRegion = new Map<string, number>();
  for (const s of faulted) {
    const region = s.properties?.region;
    if (!region) continue;
    byRegion.set(region, (byRegion.get(region) ?? 0) + 1);
  }
  const clusterRegions = o.clusterMinFaults > 0
    ? [...byRegion.entries()]
        .filter(([, count]) => count >= o.clusterMinFaults)
        .map(([region, faultCount]) => ({ region, faultCount }))
        .sort((a, b) => b.faultCount - a.faultCount)
    : [];
  const clusterSet = new Set(clusterRegions.map((c) => c.region));

  const details = faulted.map((s) =>
    diagnoseFaultStation(s, { ...o, clusterFaultRegions: clusterSet })
  );

  const byReason: Record<FaultReasonCode, number> = {
    low_throughput: 0,
    user_overload: 0,
    low_power: 0,
    cluster_outage: 0,
    unknown: 0,
  };
  for (const d of details) byReason[d.primary.code] += 1;

  return { total: faulted.length, byReason, clusterRegions, details };
}

/** 置信度：命中因子越多越可信，存在 critical 级别证据时显著提高 */
function confidenceOf(reasons: FaultReason[]): number {
  if (reasons.length === 0) return 0;
  const hasCritical = reasons.some((r) => r.severity === 'critical');
  const base = Math.min(0.4 + 0.2 * (reasons.length - 1), 0.8);
  return Math.round((hasCritical ? Math.min(base + 0.15, 0.95) : base) * 100) / 100;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
