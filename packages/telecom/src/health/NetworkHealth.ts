/**
 * NetworkHealth 网络健康度面板（PRD §5.2）
 *
 * 功能点：
 * - NH-1 基站在线率统计（按区域/运营商/类型）
 * - NH-2 告警分布地图（故障基站闪烁标记）
 * - NH-3 故障趋势图（日/周/月故障数变化）
 * - NH-4 故障根因分析
 */

import type { TelecomTopologyDataset, BaseStation, Carrier } from '../types';

import { diagnoseFaultStation, diagnoseFaults } from './faultDiagnosis';
import type { FaultDiagnosis, FaultDiagnosisSummary, FaultDiagnosisOptions } from './faultDiagnosis';

/** 在线率统计结果 */
export interface OnlineRateStats {
  /** 分组键（如运营商名/区域/类型） */
  group: string;
  total: number;
  online: number;
  onlineRate: number;
}

/** 故障告警 */
export interface StationAlert {
  station: BaseStation;
  /** 告警类型 */
  reason: string;
}

export interface NetworkHealthOptions {
  dataset: TelecomTopologyDataset;
}

/**
 * NetworkHealth 组件（纯逻辑，无地图依赖，便于测试）
 */
export class NetworkHealth {
  private dataset: TelecomTopologyDataset;

  constructor(options: NetworkHealthOptions) {
    this.dataset = options.dataset;
  }

  /** NH-1 基站在线率统计（按运营商） */
  onlineRateByCarrier(): OnlineRateStats[] {
    return this.groupOnlineRate((s) => s.carrier);
  }

  /** NH-1 基站在线率统计（按区域） */
  onlineRateByRegion(): OnlineRateStats[] {
    return this.groupOnlineRate((s) => s.properties?.region ?? 'default');
  }

  /** NH-1 基站在线率统计（按类型） */
  onlineRateByType(): OnlineRateStats[] {
    return this.groupOnlineRate((s) => s.type);
  }

  private groupOnlineRate(keyFn: (s: BaseStation) => string): OnlineRateStats[] {
    const map = new Map<string, { total: number; online: number }>();
    for (const s of this.dataset.baseStations) {
      const key = keyFn(s);
      const cur = map.get(key) ?? { total: 0, online: 0 };
      cur.total += 1;
      if (s.properties?.status === 'online') cur.online += 1;
      map.set(key, cur);
    }
    return [...map.entries()].map(([group, { total, online }]) => ({
      group,
      total,
      online,
      onlineRate: total > 0 ? online / total : 0,
    }));
  }

  /** NH-2 故障基站告警列表 */
  faultAlerts(): StationAlert[] {
    return this.dataset.baseStations
      .filter((s) => s.properties?.status === 'fault')
      .map((s) => ({ station: s, reason: this.guessFaultReason(s) }));
  }

  /**
   * NH-4 故障根因分析（启发式，兼容旧签名）
   *
   * 内部委托 `diagnoseFaultStation()` 的多因子证据链，返回主因文案。
   * **需要完整证据链（全部命中因子 + 置信度）时请用 `faultDiagnosis()` / `diagnoseFaults()`。**
   */
  guessFaultReason(s: BaseStation): string {
    return diagnoseFaultStation(s, { clusterFaultRegions: this.clusterFaultRegions() }).primary
      .label;
  }

  /** NH-4 单站完整诊断（全部命中因子 + 证据 + 置信度） */
  faultDiagnosis(stationId: string, opts?: FaultDiagnosisOptions): FaultDiagnosis | undefined {
    const station = this.dataset.baseStations.find((s) => s.id === stationId);
    if (!station) return undefined;
    return diagnoseFaultStation(station, {
      ...opts,
      clusterFaultRegions: this.clusterFaultRegions(opts),
    });
  }

  /** NH-4 批量诊断（含区域聚集检测与按根因计数） */
  diagnoseFaults(opts?: FaultDiagnosisOptions): FaultDiagnosisSummary {
    return diagnoseFaults(this.dataset.baseStations, opts);
  }

  /** 判定为区域性故障的区域集合（内部复用） */
  private clusterFaultRegions(opts?: FaultDiagnosisOptions): Set<string> {
    return new Set(diagnoseFaults(this.dataset.baseStations, opts).clusterRegions.map((c) => c.region));
  }

  /** NH-3 故障趋势：按日期聚合故障数（传入带时间戳的故障记录） */
  faultTrend(
    records: Array<{ stationId: string; timestamp: number }>,
    bucket: 'day' | 'week' | 'month'
  ): Array<{ bucket: string; count: number }> {
    const map = new Map<string, number>();
    for (const r of records) {
      const d = new Date(r.timestamp);
      let key: string;
      if (bucket === 'day') key = d.toISOString().slice(0, 10);
      else if (bucket === 'week') {
        const week = Math.floor(d.getTime() / (7 * 86400 * 1000));
        key = `week-${week}`;
      } else {
        key = d.toISOString().slice(0, 7);
      }
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  }
}
