/**
 * 通信网卡片 / 折线数据层（P2-c UI 数据层，纯函数）
 *
 * 基站卡片、在线率折线、容量利用率折线，供业务层直接渲染。
 * 容量利用率折线同时服务于 P2-d CapacityHeatmap 的数据层。
 */

import type { BaseStation } from '../types';
import type { OnlineRateStats } from './NetworkHealth';

/** 基站卡片数据 */
export interface StationCard {
  title: string;
  carrier: string;
  type: string;
  statusLabel: string;
  throughputMbps: number;
  userCount: number;
  /** 容量利用率 0-1（有额定容量时计算，否则 undefined） */
  capacityUtil: number | undefined;
  statusColor: string;
}

const STATUS_COLOR: Record<string, string> = {
  online: '#22c55e',
  offline: '#9ca3af',
  fault: '#ef4444',
  maintenance: '#f59e0b',
};

/** 由基站生成卡片数据 */
export function buildStationCard(station: BaseStation): StationCard {
  const p = station.properties ?? {};
  const capacity = p.capacityMbps;
  const util = capacity && capacity > 0 && p.throughputMbps != null ? p.throughputMbps / capacity : undefined;
  return {
    title: station.name ?? station.id,
    carrier: station.carrier,
    type: station.type,
    statusLabel: p.status ?? 'unknown',
    throughputMbps: p.throughputMbps ?? 0,
    userCount: p.userCount ?? 0,
    capacityUtil: util != null ? Math.round(util * 1000) / 1000 : undefined,
    statusColor: STATUS_COLOR[p.status ?? 'unknown'] ?? '#9ca3af',
  };
}

/** 在线率折线序列（按分组） */
export function buildOnlineRateSeries(stats: OnlineRateStats[]): { labels: string[]; values: number[] } {
  return {
    labels: stats.map((s) => s.group),
    values: stats.map((s) => Math.round(s.onlineRate * 1000) / 1000),
  };
}

/** 容量利用率折线序列（按基站） */
export function buildCapacitySeries(stations: BaseStation[]): { labels: string[]; values: number[] } {
  const rows = stations
    .map((s) => ({
      id: s.name ?? s.id,
      util: s.properties?.capacityMbps ? (s.properties.throughputMbps ?? 0) / s.properties.capacityMbps : NaN,
    }))
    .filter((r) => !Number.isNaN(r.util))
    .sort((a, b) => b.util - a.util);
  return {
    labels: rows.map((r) => r.id),
    values: rows.map((r) => Math.round(r.util * 1000) / 1000),
  };
}
