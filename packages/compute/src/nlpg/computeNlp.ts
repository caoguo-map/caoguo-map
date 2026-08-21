/**
 * NLPG 算力网查询意图识别（PRD §6.2）
 *
 * 算力查询意图：
 * - "利用率低于 30% 的 GPU 节点" → 属性过滤
 * - "北京到上海之间有哪些光缆路由？" → 拓扑分析
 * - "预测下个月华东区的算力缺口" → 供需预测
 */

export type ComputeNlpIntent =
  | 'low_utilization'
  | 'fiber_routes'
  | 'predict_gap'
  | 'unknown';

export interface ComputeNlpFilters {
  /** 利用率阈值 */
  maxUtilization?: number;
  /** 起点 */
  from?: string;
  /** 终点 */
  to?: string;
  /** 区域 */
  region?: string;
  /** 时间窗口 */
  timeWindow?: '7d' | '30d';
}

export interface ComputeNlpResult {
  intent: ComputeNlpIntent;
  filters: ComputeNlpFilters;
  description: string;
  confidence: number;
}

const PATTERNS: Array<{ intent: ComputeNlpIntent; re: RegExp; confidence: number }> = [
  { intent: 'low_utilization', re: /利用率.*?(低于|小于|不足|不到)|空闲.*?(节点|GPU)/, confidence: 0.9 },
  { intent: 'fiber_routes', re: /(光缆|路由|链路|光纤).*?(之间|有哪些|路径)|(之间).*?(光缆|路由|链路)/, confidence: 0.9 },
  { intent: 'predict_gap', re: /(预测|预估).*?(算力|缺口|需求)|(算力|缺口|需求).*?(预测|预估)/, confidence: 0.9 },
];

const CITY_REGEX = /(北京|上海|广州|深圳|武汉|成都|杭州|南京|天津|重庆|西安|苏州|郑州|长沙|合肥|福州|厦门|济南|青岛)/g;

export function parseComputeQuery(query: string): ComputeNlpResult {
  let best: { intent: ComputeNlpIntent; confidence: number } = { intent: 'unknown', confidence: 0 };
  for (const p of PATTERNS) {
    const m = query.match(p.re);
    if (m) {
      const c = p.confidence * (1 + 0.05 * (m[0].length / query.length));
      if (c > best.confidence) best = { intent: p.intent, confidence: Math.min(c, 1) };
    }
  }

  const filters: ComputeNlpFilters = {};

  // 利用率阈值
  const utilMatch = query.match(/(\d+)\s*%/);
  if (utilMatch && best.intent === 'low_utilization') {
    filters.maxUtilization = parseInt(utilMatch[1]) / 100;
  }

  // 起终点城市
  const cities = query.match(CITY_REGEX);
  if (cities && best.intent === 'fiber_routes') {
    filters.from = cities[0];
    filters.to = cities[1];
  }

  // 区域
  const regionMatch = query.match(/(华东|华南|华北|华中|西南|西北|东北)/);
  if (regionMatch) filters.region = regionMatch[1];

  // 时间窗口
  if (/下个月|未来.*月/.test(query)) filters.timeWindow = '30d';
  else if (/未来.*天|7\s*天|一周/.test(query)) filters.timeWindow = '7d';

  return {
    intent: best.intent,
    filters,
    description: buildDescription(best.intent, filters),
    confidence: best.confidence,
  };
}

function buildDescription(intent: ComputeNlpIntent, f: ComputeNlpFilters): string {
  switch (intent) {
    case 'low_utilization':
      return `利用率低于 ${(f.maxUtilization ?? 0.3) * 100}% 的 GPU 节点`;
    case 'fiber_routes':
      return `${f.from ?? '?'} 到 ${f.to ?? '?'} 的光缆路由`;
    case 'predict_gap':
      return `${f.region ?? '全网'} 算力缺口预测`;
    default:
      return '算力查询';
  }
}
