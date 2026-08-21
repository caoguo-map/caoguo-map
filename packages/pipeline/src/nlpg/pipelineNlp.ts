/**
 * NLPG 管网场景扩展（Phase 1）
 */
import type { PipelineType } from '../types';

export type PipelineNlpIntent =
  | 'burst'
  | 'valve'
  | 'material_age'
  | 'pressure'
  | 'nearby'
  | 'alarm_cluster'
  | 'unknown';

export interface PipelineNlpFilters {
  pipelineType?: PipelineType;
  material?: string;
  minAgeYears?: number;
  maxAgeYears?: number;
  minPressure?: number;
  maxPressure?: number;
  radius?: number;
  timeWindow?: '1h' | '1d' | '7d' | '30d';
  region?: string;
}

export interface PipelineNlpResult {
  intent: PipelineNlpIntent;
  filters: PipelineNlpFilters;
  description: string;
  confidence: number;
}

const PATTERNS: Array<{ intent: PipelineNlpIntent; re: RegExp; confidence: number }> = [
  { intent: 'burst', re: /(爆管|破裂|泄漏|故障|事故|爆裂)/, confidence: 0.95 },
  { intent: 'valve', re: /(阀门|闸).*?(关闭|关|合)|(?:关闭|关|合).*?(阀门|闸)/, confidence: 0.9 },
  { intent: 'material_age', re: /(\d+)\s*年.*?(铸铁|钢|PE|PVC|铜)/, confidence: 0.85 },
  { intent: 'material_age', re: /(铸铁|钢|PE|PVC|铜).*?(\d+)\s*年/, confidence: 0.85 },
  { intent: 'pressure', re: /压力.*?(低于|高于|小于|大于|<|>|>=|<=|低|高)\s*(\d+\.?\d*)/, confidence: 0.85 },
  { intent: 'nearby', re: /(\d+)\s*(米|m|公里|km).*?(学校|医院|工厂|消防|政府|小区)/, confidence: 0.85 },
  { intent: 'alarm_cluster', re: /报警|告警/, confidence: 0.8 },
];

const TYPE_REGEX: Array<{ type: PipelineType; re: RegExp }> = [
  { type: 'gas', re: /燃气|煤气|天然气/ },
  { type: 'water', re: /供水|自来水|水管/ },
  { type: 'drainage', re: /排水|污水|雨水/ },
  { type: 'heating', re: /供热|暖气|热力/ },
  { type: 'power', re: /电力|电缆|高压/ },
  { type: 'telecom', re: /通信|光纤|光缆/ },
];

const MATERIAL_REGEX: Array<{ key: string; re: RegExp; cname: string }> = [
  { key: 'cast_iron', cname: '铸铁', re: /铸铁/ },
  { key: 'ductile_iron', cname: '球墨铸铁', re: /球墨/ },
  { key: 'steel', cname: '钢', re: /钢/ },
  { key: 'pe', cname: 'PE', re: /PE/ },
  { key: 'pvc', cname: 'PVC', re: /PVC/ },
  { key: 'concrete', cname: '混凝土', re: /混凝土/ },
  { key: 'hdpe', cname: 'HDPE', re: /HDPE/ },
  { key: 'copper', cname: '铜', re: /铜/ },
];

const REGION_REGEX = /(朝阳区|海淀区|江岸区|江汉区|硚口区|汉阳区|武昌区|青山区|洪山区|东西湖区|黄陂区|新洲区|江夏区|蔡甸区|汉南区)/;

export function parsePipelineQuery(query: string): PipelineNlpResult {
  let best: { intent: PipelineNlpIntent; confidence: number } = { intent: 'unknown', confidence: 0 };
  for (const p of PATTERNS) {
    const m = query.match(p.re);
    if (m) {
      const c = p.confidence * (1 + 0.05 * (m[0].length / query.length));
      if (c > best.confidence) best = { intent: p.intent, confidence: Math.min(c, 1) };
    }
  }

  const filters: PipelineNlpFilters = {};
  for (const t of TYPE_REGEX) {
    if (t.re.test(query)) {
      filters.pipelineType = t.type;
      break;
    }
  }
  for (const m of MATERIAL_REGEX) {
    if (m.re.test(query)) {
      filters.material = m.key;
      break;
    }
  }
  const ageMatch = query.match(/(\d+)\s*年/);
  if (ageMatch) {
    const years = parseInt(ageMatch[1]);
    if (best.intent === 'material_age') {
      if (/超[过于]/.test(query) || /[以]?上/.test(query)) filters.minAgeYears = years;
      else if (/内|以下|不超/.test(query)) filters.maxAgeYears = years;
      else filters.minAgeYears = years;
    } else {
      filters.minAgeYears = years;
    }
  }
  const pressureMatch = query.match(/(\d+\.?\d*)\s*(MPa|mpa)/);
  if (pressureMatch) {
    const v = parseFloat(pressureMatch[1]);
    if (/低|小于|小于等于|</.test(query)) filters.maxPressure = v;
    else if (/高|大于|大于等于|>/.test(query)) filters.minPressure = v;
    else filters.maxPressure = v;
  } else if (/压力/.test(query)) {
    filters.maxPressure = 0.2; // 默认低压阈值
  }
  const distMatch = query.match(/(\d+)\s*(公里|km|千米|米|m)/);
  if (distMatch) {
    let d = parseInt(distMatch[1]);
    const unit = distMatch[2];
    if (/公里|km|千米/.test(unit)) d *= 1000;
    filters.radius = d;
  }
  if (/昨天/.test(query)) filters.timeWindow = '1d';
  else if (/今天/.test(query)) filters.timeWindow = '1d';
  else if (/最近一周|过去一周|7\s*天/.test(query)) filters.timeWindow = '7d';
  else if (/最近一个月/.test(query)) filters.timeWindow = '30d';
  const regionMatch = query.match(REGION_REGEX);
  if (regionMatch) filters.region = regionMatch[1];

  return {
    intent: best.intent,
    filters,
    description: buildDescription(best.intent, filters),
    confidence: best.confidence,
  };
}

function buildDescription(intent: PipelineNlpIntent, f: PipelineNlpFilters): string {
  const desc: string[] = [];
  if (intent === 'burst') desc.push('触发爆管推演');
  else if (intent === 'valve') desc.push('查询阀门关闭影响');
  else if (intent === 'material_age') {
    const matName = MATERIAL_REGEX.find((m) => m.key === f.material)?.cname ?? f.material ?? '';
    desc.push(`筛选${matName}管${f.minAgeYears ?? '?'}年以上`);
  } else if (intent === 'pressure') desc.push(`筛选压力${f.maxPressure ?? ''}MPa以下`);
  else if (intent === 'nearby') desc.push(`${f.radius}m内查找POI`);
  else if (intent === 'alarm_cluster') desc.push(`查询${f.timeWindow ?? '1d'}内报警聚集`);
  if (f.pipelineType) desc.push(`[${f.pipelineType}]`);
  if (f.region) desc.push(`区域:${f.region}`);
  return desc.join(' ');
}
