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

  /** NH-4 故障根因分析（启发式） */
  private guessFaultReason(s: BaseStation): string {
    const p = s.properties ?? {};
    if (p.throughputMbps !== undefined && p.throughputMbps < 10) return '吞吐量异常偏低';
    if (p.userCount !== undefined && p.userCount > 500) return '用户过载';
    if (p.powerDbm !== undefined && p.powerDbm < 30) return '发射功率异常';
    return '未知故障';
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
