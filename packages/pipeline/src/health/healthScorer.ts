/**
 * 管线健康度评分（healthScorer）
 *
 * 6 维加权评分（PRD §4.4.2）：
 *   health_score = age (0.25) + material (0.20) + soil (0.15) +
 *                  history (0.20) + pressure (0.10) + protection (0.10)
 *
 * 每维 0-100，最终加权求和。
 * 评分模型可解释：每个维度的评分依据清晰可见。
 */

import type { PipeMaterial, PipeStatus } from '../types';

export interface PipeHealthInput {
  /** 安装日期 ISO */
  installDate?: string;
  /** 材质 */
  material?: PipeMaterial;
  /** 当前故障次数 */
  failureCount?: number;
  /** 当前压力（MPa） */
  pressure?: number;
  /** 最高允许压力（MPa） */
  ratedPressure?: number;
  /** 是否阴极保护 */
  hasCathodicProtection?: boolean;
  /** 土壤腐蚀指数 0-1（无数据时 0.5） */
  soilCorrosion?: number;
  /** 状态（damaged / under_repair 直接影响评分） */
  status?: PipeStatus;
}

export interface PipeHealthScore {
  /** 总分 0-100 */
  score: number;
  /** 等级 */
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  /** 6 维细分 */
  dimensions: {
    age: { score: number; weight: number; reason: string };
    material: { score: number; weight: number; reason: string };
    soil: { score: number; weight: number; reason: string };
    history: { score: number; weight: number; reason: string };
    pressure: { score: number; weight: number; reason: string };
    protection: { score: number; weight: number; reason: string };
  };
}

/** 默认权重 */
export const DEFAULT_WEIGHTS = {
  age: 0.25,
  material: 0.2,
  soil: 0.15,
  history: 0.2,
  pressure: 0.1,
  protection: 0.1,
};

const MATERIAL_RISK: Record<PipeMaterial, number> = {
  cast_iron: 0.85,    // 铸铁 = 高风险（旧管网）
  ductile_iron: 0.2,  // 球墨铸铁
  steel: 0.4,
  pe: 0.1,
  pvc: 0.15,
  concrete: 0.3,
  hdpe: 0.05,
  copper: 0.1,
  unknown: 0.5,
};

/**
 * 计算单根管线的健康度
 */
export function scorePipeHealth(input: PipeHealthInput, weights = DEFAULT_WEIGHTS): PipeHealthScore {
  const dims = {
    age: scoreAge(input, weights.age),
    material: scoreMaterial(input, weights.material),
    soil: scoreSoil(input, weights.soil),
    history: scoreHistory(input, weights.history),
    pressure: scorePressure(input, weights.pressure),
    protection: scoreProtection(input, weights.protection),
  };

  const total =
    dims.age.score * dims.age.weight +
    dims.material.score * dims.material.weight +
    dims.soil.score * dims.soil.weight +
    dims.history.score * dims.history.weight +
    dims.pressure.score * dims.pressure.weight +
    dims.protection.score * dims.protection.weight;

  // 损坏或维修中额外惩罚
  let final = total;
  if (input.status === 'damaged') final *= 0.5;
  else if (input.status === 'under_repair') final *= 0.7;
  else if (input.status === 'abandoned') final = 0;

  return {
    score: Math.round(final),
    level: toLevel(final),
    dimensions: dims,
  };
}

function toLevel(score: number): PipeHealthScore['level'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

function scoreAge(input: PipeHealthInput, weight: number): PipeHealthScore['dimensions']['age'] {
  if (!input.installDate) {
    return { score: 50, weight, reason: '未知安装日期，按中等计' };
  }
  const ageYears = (Date.now() - new Date(input.installDate).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears < 0) return { score: 100, weight, reason: '未来日期，视为优秀' };
  if (ageYears < 5) return { score: 100, weight, reason: '新建管线 (<5年)' };
  if (ageYears < 15) return { score: 85, weight, reason: '较新 (5-15年)' };
  if (ageYears < 25) return { score: 65, weight, reason: '中龄 (15-25年)' };
  if (ageYears < 40) return { score: 40, weight, reason: '老龄 (25-40年)' };
  if (ageYears < 60) return { score: 20, weight, reason: '超期 (>40年)' };
  return { score: 5, weight, reason: '超期 (>60年)' };
}

function scoreMaterial(input: PipeHealthInput, weight: number): PipeHealthScore['dimensions']['material'] {
  if (!input.material) {
    return { score: 50, weight, reason: '未知材质，按中等计' };
  }
  const risk = MATERIAL_RISK[input.material] ?? 0.5;
  const score = Math.round((1 - risk) * 100);
  const labels: Record<string, string> = {
    cast_iron: '铸铁（高风险）',
    ductile_iron: '球墨铸铁',
    steel: '钢',
    pe: 'PE（低风险）',
    pvc: 'PVC',
    concrete: '混凝土',
    hdpe: 'HDPE（最佳）',
    copper: '铜',
    unknown: '未知',
  };
  return {
    score,
    weight,
    reason: labels[input.material] ?? input.material,
  };
}

function scoreSoil(input: PipeHealthInput, weight: number): PipeHealthScore['dimensions']['soil'] {
  const c = input.soilCorrosion ?? 0.5;
  const score = Math.round((1 - c) * 100);
  return {
    score,
    weight,
    reason: c === 0.5 && !input.soilCorrosion ? '无土壤数据，按平均计' : `土壤腐蚀指数 ${c.toFixed(2)}`,
  };
}

function scoreHistory(input: PipeHealthInput, weight: number): PipeHealthScore['dimensions']['history'] {
  const fail = input.failureCount ?? 0;
  if (fail === 0) return { score: 100, weight, reason: '历史无故障' };
  if (fail === 1) return { score: 75, weight, reason: '历史 1 次故障' };
  if (fail === 2) return { score: 50, weight, reason: '历史 2 次故障' };
  if (fail === 3) return { score: 25, weight, reason: '历史 3 次故障' };
  return { score: 0, weight, reason: `历史 ≥${fail} 次故障` };
}

function scorePressure(input: PipeHealthInput, weight: number): PipeHealthScore['dimensions']['pressure'] {
  if (!input.pressure) {
    return { score: 75, weight, reason: '无压力数据，按中等偏好计' };
  }
  if (!input.ratedPressure) {
    return { score: 75, weight, reason: '仅知当前压力' };
  }
  const ratio = input.pressure / input.ratedPressure;
  if (ratio < 0.5) return { score: 60, weight, reason: '压力偏低 (使用率 <50%)' };
  if (ratio < 0.8) return { score: 90, weight, reason: '压力正常 (使用率 50-80%)' };
  if (ratio < 1.0) return { score: 75, weight, reason: '压力偏高 (使用率 80-100%)' };
  if (ratio < 1.2) return { score: 30, weight, reason: '压力超限 (100-120%)' };
  return { score: 0, weight, reason: '压力严重超限 (>120%)' };
}

function scoreProtection(input: PipeHealthInput, weight: number): PipeHealthScore['dimensions']['protection'] {
  if (input.hasCathodicProtection === true) {
    return { score: 90, weight, reason: '有阴极保护' };
  }
  if (input.hasCathodicProtection === false) {
    return { score: 30, weight, reason: '无阴极保护' };
  }
  return { score: 50, weight, reason: '阴保状态未知' };
}

/**
 * 批量评分（按需遍历）
 */
export function scorePipes(inputs: PipeHealthInput[], weights = DEFAULT_WEIGHTS): PipeHealthScore[] {
  return inputs.map((i) => scorePipeHealth(i, weights));
}
