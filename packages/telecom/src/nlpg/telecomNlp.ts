/**
 * NLPG 通信网查询意图识别（PRD §6.3）
 *
 * 通信查询意图：
 * - "5G 基站中近 7 天故障率超过 5% 的" → 时序聚合
 * - "这个区域内 4G 和 5G 覆盖的重叠率" → 覆盖叠加分析
 * - "周边 2 公里内哪些基站负载最高？" → 空间查询 + 排序
 */

export type TelecomNlpIntent =
  | 'fault_rate'
  | 'overlap_analysis'
  | 'high_load'
  | 'unknown';

export interface TelecomNlpFilters {
  /** 技术制式 */
  technology?: string;
  /** 故障率阈值 */
  faultRateThreshold?: number;
  /** 时间窗口 */
  timeWindow?: '7d' | '30d';
  /** 半径（米） */
  radius?: number;
  /** 技术 A（重叠分析） */
  techA?: string;
  /** 技术 B（重叠分析） */
  techB?: string;
}

export interface TelecomNlpResult {
  intent: TelecomNlpIntent;
  filters: TelecomNlpFilters;
  description: string;
  confidence: number;
}

const PATTERNS: Array<{ intent: TelecomNlpIntent; re: RegExp; confidence: number }> = [
  { intent: 'fault_rate', re: /故障率.*?(超过|大于|高于|>)|(故障).*?(率|比例)/, confidence: 0.9 },
  { intent: 'overlap_analysis', re: /(重叠|覆盖).*?(率|分析)|(覆盖).*?(重叠)/, confidence: 0.9 },
  { intent: 'high_load', re: /(负载|负荷).*?(最高|最高|最忙)|(基站).*?(负载|负荷)/, confidence: 0.85 },
];

const TECH_REGEX = /(5G|4G|3G)/g;

export function parseTelecomQuery(query: string): TelecomNlpResult {
  let best: { intent: TelecomNlpIntent; confidence: number } = { intent: 'unknown', confidence: 0 };
  for (const p of PATTERNS) {
    const m = query.match(p.re);
    if (m) {
      const c = p.confidence * (1 + 0.05 * (m[0].length / query.length));
      if (c > best.confidence) best = { intent: p.intent, confidence: Math.min(c, 1) };
    }
  }

  const filters: TelecomNlpFilters = {};

  // 技术制式
  const techs = query.match(TECH_REGEX);
  if (techs) {
    filters.technology = techs[0];
    if (best.intent === 'overlap_analysis') {
      filters.techA = techs[0];
      filters.techB = techs[1];
    }
  }

  // 故障率阈值
  const rateMatch = query.match(/(\d+)\s*%/);
  if (rateMatch && best.intent === 'fault_rate') {
    filters.faultRateThreshold = parseInt(rateMatch[1]) / 100;
  }

  // 时间窗口
  if (/近\s*7\s*天|最近\s*7\s*天|一周/.test(query)) filters.timeWindow = '7d';
  else if (/近\s*30\s*天|最近一个月|一个月/.test(query)) filters.timeWindow = '30d';

  // 半径
  const distMatch = query.match(/(\d+)\s*(公里|km|千米|米|m)/);
  if (distMatch) {
    let d = parseInt(distMatch[1]);
    if (/公里|km|千米/.test(distMatch[2])) d *= 1000;
    filters.radius = d;
  }

  return {
    intent: best.intent,
    filters,
    description: buildDescription(best.intent, filters),
    confidence: best.confidence,
  };
}

function buildDescription(intent: TelecomNlpIntent, f: TelecomNlpFilters): string {
  switch (intent) {
    case 'fault_rate':
      return `${f.technology ?? ''} 基站中近 ${f.timeWindow === '30d' ? '30' : '7'} 天故障率超过 ${(f.faultRateThreshold ?? 0.05) * 100}% 的`;
    case 'overlap_analysis':
      return `${f.techA ?? '4G'} 和 ${f.techB ?? '5G'} 覆盖重叠率分析`;
    case 'high_load':
      return `周边 ${f.radius ?? 2000}m 内负载最高的基站`;
    default:
      return '通信查询';
  }
}
