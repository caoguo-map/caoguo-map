/**
 * 交通 NLPG 查询执行层（PRD §6.1）
 *
 * 把 `parseTransportQuery` 识别出的意图 + 过滤条件真正落地为数据结果：
 *  - nearby_poi     → 调 findNearbyResources，返回半径内摄像头/医院/救援站
 *  - slowest_roads  → 对 dataset.speeds 排序，返回 Top N 最慢路段
 *  - predict_congestion → 调 predictCongestion，返回未来时段预测速度与拥堵等级
 *  - compare_congestion  → 同比分析（需 today/yesterday 双序列，缺则给出结构占位）
 *
 * 纯函数 + 数据桥接，不依赖地图渲染。
 */

import type { RoadNetworkDataset, RoadSpeedRecord } from '../types';
import { findNearbyResources } from '../incident/incidentCore';
import {
  predictCongestion,
  type CongestionPrediction,
} from '../traffic/congestionPredict';
import type {
  TransportNlpFilters,
  TransportNlpIntent,
} from './transportNlp';
import { parseTransportQuery } from './transportNlp';

/** 查询结果上下文（执行时由调用方注入的数据源） */
export interface TransportQueryContext {
  /** 查询中心点（如事故点 / 用户定位），经纬度 */
  center?: { lng: number; lat: number };
  /** 路网数据集（含 speeds） */
  dataset: RoadNetworkDataset;
  /** 预测用：历史同时段速度序列 */
  historicalSpeeds?: number[];
  /** 预测用：实时最近速度序列 */
  recentSpeeds?: number[];
  /** 同比用：今日序列 */
  todaySpeeds?: number[];
  /** 同比用：昨日序列 */
  yesterdaySpeeds?: number[];
}

export interface NearbyPoiResult {
  kind: 'camera' | 'rescue' | 'hospital';
  count: number;
  nodes: { id: string; lng: number; lat: number }[];
}

export interface SlowestRoad {
  edgeId: string;
  speed: number;
  flow?: number;
}

export interface CompareResult {
  hasData: boolean;
  todayAvg?: number;
  yesterdayAvg?: number;
  delta?: number;
  /** 相对昨日更堵（速度更低）则为 true */
  worse?: boolean;
  message: string;
}

export type TransportQueryData =
  | { type: 'nearby_poi'; results: NearbyPoiResult[] }
  | { type: 'slowest_roads'; roads: SlowestRoad[] }
  | { type: 'predict_congestion'; prediction: CongestionPrediction }
  | { type: 'compare_congestion'; compare: CompareResult }
  | { type: 'unknown'; message: string };

export interface TransportQueryExecution {
  intent: TransportNlpIntent;
  filters: TransportNlpFilters;
  data: TransportQueryData;
  summary: string;
}

/**
 * 执行交通自然语言查询：识别 → 取数 → 返回结构化结果。
 */
export function executeTransportQuery(
  query: string,
  ctx: TransportQueryContext,
  parsed?: { intent: TransportNlpIntent; filters: TransportNlpFilters }
): TransportQueryExecution {
  // 若未预解析，则现场识别意图
  const { intent, filters } =
    parsed ?? parseTransportQuery(query);

  switch (intent) {
    case 'nearby_poi':
      return {
        intent,
        filters,
        data: executeNearby(ctx, filters),
        summary: buildSummaryNearby(ctx, filters),
      };
    case 'slowest_roads':
      return {
        intent,
        filters,
        data: executeSlowest(ctx.dataset.speeds ?? [], filters),
        summary: buildSummarySlowest(ctx.dataset.speeds ?? [], filters),
      };
    case 'predict_congestion':
      return {
        intent,
        filters,
        data: executePredict(ctx, filters),
        summary: `预测未来 ${filters.minutesAhead ?? 30} 分钟拥堵`,
      };
    case 'compare_congestion':
      return {
        intent,
        filters,
        data: executeCompare(ctx),
        summary: '拥堵同比分析',
      };
    default:
      return {
        intent: 'unknown',
        filters,
        data: { type: 'unknown', message: '无法识别的交通查询' },
        summary: '无法识别的交通查询',
      };
  }
}

function executeNearby(
  ctx: TransportQueryContext,
  f: TransportNlpFilters
): TransportQueryData {
  const center = ctx.center ?? { lng: 0, lat: 0 };
  const radius = f.radius ?? 3000;
  const { cameras, rescue, hospitals } = findNearbyResources(
    ctx.dataset,
    center.lng,
    center.lat,
    radius
  );
  const map: Record<string, { kind: NearbyPoiResult['kind']; list: typeof cameras }> = {
    camera: { kind: 'camera', list: cameras },
    hospital: { kind: 'hospital', list: hospitals },
    rescue: { kind: 'rescue', list: rescue },
  };
  // 若指定了 poiKind，只返回该类型；否则返回全部三类
  const kinds = f.poiKind ? [f.poiKind] : (['camera', 'hospital', 'rescue'] as const);
  const results: NearbyPoiResult[] = kinds.map((k) => ({
    kind: k,
    count: map[k].list.length,
    nodes: map[k].list.map((n) => ({ id: n.id, lng: n.lng, lat: n.lat })),
  }));
  return { type: 'nearby_poi', results };
}

function executeSlowest(
  speeds: RoadSpeedRecord[],
  f: TransportNlpFilters
): TransportQueryData {
  const topN = f.topN ?? 10;
  const roads = [...speeds]
    .sort((a, b) => a.speed - b.speed)
    .slice(0, topN)
    .map((s) => ({ edgeId: s.edgeId, speed: s.speed, flow: s.flow }));
  return { type: 'slowest_roads', roads };
}

function executePredict(
  ctx: TransportQueryContext,
  f: TransportNlpFilters
): TransportQueryData {
  const prediction = predictCongestion({
    historicalSpeeds: ctx.historicalSpeeds,
    recentSpeeds: ctx.recentSpeeds,
    minutesAhead: f.minutesAhead ?? 30,
  });
  return { type: 'predict_congestion', prediction };
}

function executeCompare(ctx: TransportQueryContext): TransportQueryData {
  const t = ctx.todaySpeeds ?? [];
  const y = ctx.yesterdaySpeeds ?? [];
  if (t.length === 0 || y.length === 0) {
    return {
      type: 'compare_congestion',
      compare: {
        hasData: false,
        message: '同比分析需要今日与昨日的速度序列（todaySpeeds/yesterdaySpeeds）',
      },
    };
  }
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const todayAvg = avg(t);
  const yesterdayAvg = avg(y);
  const delta = todayAvg - yesterdayAvg;
  return {
    type: 'compare_congestion',
    compare: {
      hasData: true,
      todayAvg,
      yesterdayAvg,
      delta,
      worse: delta < 0,
      message:
        delta < 0
          ? `今日平均 ${todayAvg.toFixed(1)} km/h，较昨日低 ${Math.abs(delta).toFixed(1)} km/h，更拥堵`
          : `今日平均 ${todayAvg.toFixed(1)} km/h，较昨日高 ${delta.toFixed(1)} km/h，更畅通`,
    },
  };
}

function buildSummaryNearby(
  ctx: TransportQueryContext,
  f: TransportNlpFilters
): string {
  const center = ctx.center ?? { lng: 0, lat: 0 };
  const radius = f.radius ?? 3000;
  const { cameras, rescue, hospitals } = findNearbyResources(
    ctx.dataset,
    center.lng,
    center.lat,
    radius
  );
  const label = f.poiKind
    ? { camera: '摄像头', hospital: '医院', rescue: '救援站' }[f.poiKind]
    : '资源';
  if (f.poiKind) {
    const count = { camera: cameras, hospital: hospitals, rescue }[f.poiKind].length;
    return `${radius}m 内${label} ${count} 个`;
  }
  return `${radius}m 内摄像头 ${cameras.length} / 救援站 ${rescue.length} / 医院 ${hospitals.length}`;
}

function buildSummarySlowest(
  speeds: RoadSpeedRecord[],
  f: TransportNlpFilters
): string {
  const topN = f.topN ?? 10;
  const slowest = [...speeds].sort((a, b) => a.speed - b.speed)[0];
  if (!slowest) return '无速度数据';
  return `全网平均速度最低的 ${topN} 条路段，最慢为 ${slowest.edgeId}（${slowest.speed} km/h）`;
}
