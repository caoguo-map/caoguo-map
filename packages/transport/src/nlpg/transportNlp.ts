/**
 * NLPG 交通网查询意图识别（PRD §6.1）
 *
 * 交通查询意图：
 * - "当前全网平均速度最低的 10 条路段" → 排序 → 高亮
 * - "这个事故点 3 公里内有多少摄像头？" → 缓冲查询
 * - "预测未来 1 小时三环的拥堵变化" → 时序预测
 * - "今天早高峰拥堵比昨天严重吗？" → 同比分析
 */

import type { RoadClass } from '../types';

export type TransportNlpIntent =
  | 'slowest_roads'
  | 'nearby_poi'
  | 'predict_congestion'
  | 'compare_congestion'
  | 'unknown';

export interface TransportNlpFilters {
  /** 路段数量限制（Top N） */
  topN?: number;
  /** 半径（米） */
  radius?: number;
  /** POI 类型（当前支持摄像头/医院/救援站） */
  poiKind?: 'camera' | 'rescue' | 'hospital';
  /** 预测时长（分钟） */
  minutesAhead?: number;
  /** 道路等级 */
  roadClass?: RoadClass;
  /** 时间窗口 */
  timeWindow?: 'morning' | 'evening' | '1h' | '1d';
}

export interface TransportNlpResult {
  intent: TransportNlpIntent;
  filters: TransportNlpFilters;
  description: string;
  confidence: number;
}

const PATTERNS: Array<{ intent: TransportNlpIntent; re: RegExp; confidence: number }> = [
  { intent: 'slowest_roads', re: /(平均速度|速度).*?(最低|最慢|慢)|(最低|最慢).*?(速度|路段)/, confidence: 0.9 },
  { intent: 'nearby_poi', re: /(\d+)\s*(公里|km|千米|米|m).*?(摄像头|医院|救援|收费站|停车场|资源)|(摄像头|医院|救援|收费站|停车场|资源).*?(\d+)\s*(公里|km|米|m)|(附近|周边).*?(有什么|资源|设施|摄像头|医院)/, confidence: 0.9 },
  { intent: 'predict_congestion', re: /预测.*?(拥堵|路况)|拥堵.*?(变化|预测)/, confidence: 0.9 },
  { intent: 'compare_congestion', re: /(昨天|今天|同期|同比).*?(拥堵|严重)|(早高峰|晚高峰)/, confidence: 0.85 },
];

const ROAD_CLASS_REGEX: Array<{ cls: RoadClass; re: RegExp }> = [
  { cls: 'highway', re: /高速|快速路/ },
  { cls: 'national', re: /国道/ },
  { cls: 'provincial', re: /省道/ },
  { cls: 'urban', re: /城市道路|市区|城区|三环|二环|内环/ },
];

export function parseTransportQuery(query: string): TransportNlpResult {
  let best: { intent: TransportNlpIntent; confidence: number } = { intent: 'unknown', confidence: 0 };
  for (const p of PATTERNS) {
    const m = query.match(p.re);
    if (m) {
      const c = p.confidence * (1 + 0.05 * (m[0].length / query.length));
      if (c > best.confidence) best = { intent: p.intent, confidence: Math.min(c, 1) };
    }
  }

  const filters: TransportNlpFilters = {};

  // Top N
  const topNMatch = query.match(/(\d+)\s*(条|个|处)/);
  if (topNMatch && best.intent === 'slowest_roads') {
    filters.topN = parseInt(topNMatch[1]);
  }

  // 半径
  const distMatch = query.match(/(\d+)\s*(公里|km|千米|米|m)/);
  if (distMatch) {
    let d = parseInt(distMatch[1]);
    const unit = distMatch[2];
    if (/公里|km|千米/.test(unit)) d *= 1000;
    filters.radius = d;
  }

  // POI 类型
  if (/摄像头/.test(query)) filters.poiKind = 'camera';
  else if (/医院/.test(query)) filters.poiKind = 'hospital';
  else if (/救援/.test(query)) filters.poiKind = 'rescue';

  // 预测时长
  const timeMatch = query.match(/(\d+)\s*(小时|分钟|min|h)/);
  if (timeMatch && best.intent === 'predict_congestion') {
    let minutes = parseInt(timeMatch[1]);
    if (/小时|h/.test(timeMatch[2])) minutes *= 60;
    filters.minutesAhead = minutes;
  }

  // 道路等级
  for (const r of ROAD_CLASS_REGEX) {
    if (r.re.test(query)) {
      filters.roadClass = r.cls;
      break;
    }
  }

  // 时间窗口
  if (/早高峰/.test(query)) filters.timeWindow = 'morning';
  else if (/晚高峰/.test(query)) filters.timeWindow = 'evening';

  return {
    intent: best.intent,
    filters,
    description: buildDescription(best.intent, filters),
    confidence: best.confidence,
  };
}

function buildDescription(intent: TransportNlpIntent, f: TransportNlpFilters): string {
  const parts: string[] = [];
  switch (intent) {
    case 'slowest_roads':
      parts.push(`全网平均速度最低的 ${f.topN ?? 10} 条路段`);
      break;
    case 'nearby_poi':
      parts.push(`查找 ${f.radius ?? 3000}m 内的${poiLabel(f.poiKind)}`);
      break;
    case 'predict_congestion':
      parts.push(`预测未来 ${f.minutesAhead ?? 30} 分钟拥堵`);
      break;
    case 'compare_congestion':
      parts.push('拥堵同比分析');
      break;
    default:
      parts.push('交通查询');
  }
  if (f.roadClass) parts.push(`[${f.roadClass}]`);
  return parts.join(' ');
}

function poiLabel(kind?: TransportNlpFilters['poiKind']): string {
  const map: Record<string, string> = {
    camera: '摄像头',
    hospital: '医院',
    rescue: '救援站',
  };
  return map[kind ?? ''] ?? 'POI';
}
