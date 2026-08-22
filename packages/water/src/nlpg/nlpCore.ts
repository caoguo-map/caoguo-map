/**
 * 水网 NLPG 核心算法（纯函数，PRD phase-2-grid-water §5.5）
 *
 * 从自由文本中抽取水系要素候选名（河道/水库/闸站/堤防），用于：
 *  - 报告/工单/调度文档中的要素名抽取
 *  - 与 WaterDataset 进行名称匹配
 *  - 自动补全数据集中缺失的要素名
 */

import type { WaterFeatureKind } from '../types';

// ============================================================
// 一、类型
// ============================================================

/**
 * 水系要素名候选
 *  - kind: 要素类型（河道/水库/闸站/堤防）
 *  - name: 抽取到的名称
 *  - span: 在原文中的字符区间 [start, end)
 */
export interface WaterNameCandidate {
  kind: 'river' | 'reservoir' | 'gate' | 'dike' | 'station';
  name: string;
  span: [number, number];
  /** 抽取置信度（0-1） */
  confidence: number;
}

/** 名称匹配结果 */
export interface WaterNameMatch {
  /** 候选名 */
  candidate: WaterNameCandidate;
  /** 匹配到的要素 id（未匹配为 null） */
  featureId: string | null;
  /** 匹配类型 */
  matchType: 'exact' | 'fuzzy' | 'alias' | null;
  /** 模糊匹配相似度（0-1，仅 fuzzy 时有值） */
  similarity?: number;
}

// ============================================================
// 二、抽取规则
// ============================================================

/**
 * 后缀 → 要素类型映射（按出现频次/语义明确度排序）
 *
 * 中文水系命名常见后缀：
 *  - 江/河/水/溪 → 河道
 *  - 水库/湖/潭 → 水库
 *  - 闸/坝/堰 → 闸站或水工建筑（闸站细分）
 *  - 堤/垸/圩 → 堤防
 *  - 站/水文站/水位站/雨量站 → 监测站
 */
type KindRule = {
  /** 后缀列表（按长度从长到短排列，复合优先） */
  suffixes: string[];
  kind: WaterNameCandidate['kind'];
  confidence: number;
};

/** 后缀规则（按复合后缀优先排序，复合在单字前） */
const KIND_RULES: KindRule[] = [
  // 河道
  { suffixes: ['江段', '河道', '水渠', '溪流', '河流'], kind: 'river', confidence: 0.95 },
  { suffixes: ['江', '河', '水', '溪', '川', '沟', '渠'], kind: 'river', confidence: 0.9 },
  // 水库/水电站
  { suffixes: ['水电站'], kind: 'reservoir', confidence: 0.98 },
  { suffixes: ['水库'], kind: 'reservoir', confidence: 0.95 },
  // 湖/潭
  { suffixes: ['湖', '潭'], kind: 'reservoir', confidence: 0.85 },
  // 闸（复合优先）
  { suffixes: ['节制闸', '船闸', '拦河闸', '进水闸', '水闸'], kind: 'gate', confidence: 0.95 },
  { suffixes: ['闸', '坝', '堰'], kind: 'gate', confidence: 0.85 },
  // 堤防（复合优先）
  { suffixes: ['堤防', '防洪堤', '大堤', '江堤', '河堤'], kind: 'dike', confidence: 0.9 },
  { suffixes: ['堤', '垸', '圩'], kind: 'dike', confidence: 0.8 },
  // 监测站（复合优先）
  { suffixes: ['水文站', '水位站', '雨量站', '流量站'], kind: 'station', confidence: 0.95 },
  { suffixes: ['监测站', '观测站', '测站'], kind: 'station', confidence: 0.9 },
];

/** 字符是否为中文 */
function isCJK(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0x4e00 && code <= 0x9fa5;
}

/** 字符是否为边界符（非中文/非字母数字，常作为名称前后界） */
function isBoundary(ch: string | undefined): boolean {
  if (ch === undefined) return true;
  if (isCJK(ch)) return false;
  // 字母数字视为名字的一部分（如"长江1号"中"1"算字）
  if (/[a-zA-Z0-9·]/.test(ch)) return false;
  return true;
}

// ============================================================
// 三、抽取主函数
// ============================================================

/**
 * 从原始文本中抽取水系要素候选名。
 *
 * 算法（扫描式）：
 *  1. 遍历文本每个位置 i，匹配所有规则的最长后缀
 *  2. 命中后从 i 向左回溯最长 12 字符，遇到前一个边界符停止
 *  3. 候选名最短 2 字（"长江"、"三峡"）
 *  4. 按候选 span 起点去重（保留置信度最高的）
 *
 * @example
 *   extractWaterNames('三峡水库今日入库流量 12000m³/s，三峡大坝泄洪')
 *   // → [
 *   //   { kind: 'reservoir', name: '三峡水库', span: [0, 4], confidence: 0.95 },
 *   //   { kind: 'gate', name: '三峡大坝', span: [13, 17], confidence: 0.85 },
 *   // ]
 */
export function extractWaterNames(rawText: string): WaterNameCandidate[] {
  if (!rawText) return [];

  const map = new Map<number, WaterNameCandidate>();
  const len = rawText.length;

  for (let i = 0; i < len; i++) {
    // 跳过：如果当前位置已是某个候选的内部
    if (map.has(i)) continue;

    // 找到当前位置能命中的最长后缀
    let hit: { suffix: string; rule: KindRule } | null = null;
    for (const rule of KIND_RULES) {
      for (const suf of rule.suffixes) {
        if (i + suf.length <= len && rawText.startsWith(suf, i)) {
          if (!hit || suf.length > hit.suffix.length) {
            hit = { suffix: suf, rule };
          }
        }
      }
    }
    if (!hit) continue;

    // 从 i 向左回溯，最多 12 字符，遇到边界符停止
    let start = i;
    const maxPrefix = 12 - hit.suffix.length;
    let walked = 0;
    while (start > 0 && walked < maxPrefix) {
      const prev = rawText[start - 1];
      if (isBoundary(prev)) break;
      // 排除中文后缀字（避免"今日水"被错误抽取为"日水"）
      //   这里允许任意中文字符但禁止某些停用字
      if (STOP_CHARS.has(prev)) break;
      start--;
      walked++;
    }
    const name = rawText.slice(start, i + hit.suffix.length);
    // 最短 2 字限制（"长江"=2，"江"=1 不算）
    if (name.length < 2) continue;
    // 候选名前必须以中文字符开始（避免 "1号闸" 被错误地以"号闸"抽取）
    if (!isCJK(name[0])) continue;

    const cur: WaterNameCandidate = {
      kind: hit.rule.kind,
      name,
      span: [start, i + hit.suffix.length],
      confidence: hit.rule.confidence,
    };

    const exist = map.get(start);
    if (!exist || cur.confidence > exist.confidence ||
        (cur.confidence === exist.confidence && cur.name.length > exist.name.length)) {
      map.set(start, cur);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.span[0] - b.span[0]);
}

/**
 * 停用字：抽取时遇到此字立即停止向左回溯
 * 避免"今日水"中的"日水"、"当前位"中的"前位"被错误抽取
 */
const STOP_CHARS = new Set<string>([
  '今', '当', '此', '该', '为', '在', '于', '至', '向', '从',
  '的', '了', '和', '与', '或', '之', '其', '各', '全', '共', '总',
  '上', '下', '左', '右', '前', '后', '内', '外', '中', '间',
  '日', '月', '年', '时', '分', '秒', '点', '号', '次', '日',
]);

// ============================================================
// 四、名称匹配
// ============================================================

/**
 * Levenshtein 距离（编辑距离）
 * 用于模糊匹配候选名与数据集要素名
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // 单行数组滚动
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // 插入
        prev[j] + 1,           // 删除
        prev[j - 1] + cost,    // 替换
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** 计算字符串相似度（1 - normalized distance） */
function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * 名称匹配：将候选名与数据集要素匹配。
 *
 * 匹配策略：
 *  1. exact  —— name 完全相等
 *  2. alias  —— 候选名被要素 properties.code/extra.alias 命中
 *  3. fuzzy  —— 相似度 ≥ threshold（默认 0.7）取最高
 *
 * @param candidates 候选名列表（来自 extractWaterNames）
 * @param kindFilter  仅匹配指定要素类型（默认全匹配）
 * @param threshold  fuzzy 阈值，默认 0.7
 */
export function matchWaterNames<
  T extends { id: string; name?: string; properties?: Record<string, unknown> },
>(
  candidates: WaterNameCandidate[],
  dataset: T[],
  options: { kindFilter?: WaterFeatureKind[]; threshold?: number } = {},
): WaterNameMatch[] {
  const threshold = options.threshold ?? 0.7;
  const kindSet = options.kindFilter ? new Set(options.kindFilter) : null;

  // 预计算 name → feature 索引
  const exactMap = new Map<string, T>();
  const aliasMap = new Map<string, T>();
  for (const f of dataset) {
    if (f.name) exactMap.set(f.name, f);
    const code = f.properties?.code as string | undefined;
    if (code) exactMap.set(code, f);
    const aliases = f.properties?.aliases as string[] | undefined;
    if (Array.isArray(aliases)) {
      for (const a of aliases) aliasMap.set(a, f);
    }
  }

  const results: WaterNameMatch[] = [];
  for (const cand of candidates) {
    const exact = exactMap.get(cand.name);
    if (exact) {
      results.push({ candidate: cand, featureId: exact.id, matchType: 'exact' });
      continue;
    }
    const aliasHit = aliasMap.get(cand.name);
    if (aliasHit) {
      results.push({ candidate: cand, featureId: aliasHit.id, matchType: 'alias' });
      continue;
    }
    // fuzzy：仅在 type 过滤通过的元素中找
    let best: { f: T; sim: number } | null = null;
    for (const f of dataset) {
      if (!f.name) continue;
      const sim = similarity(cand.name, f.name);
      if (sim >= threshold && (!best || sim > best.sim)) {
        best = { f, sim };
      }
    }
    if (best) {
      results.push({
        candidate: cand,
        featureId: best.f.id,
        matchType: 'fuzzy',
        similarity: best.sim,
      });
    } else {
      results.push({ candidate: cand, featureId: null, matchType: null });
    }
  }
  return results;
}