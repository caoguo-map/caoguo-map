/**
 * 管线健康卡片 / 折线数据层（P2-c UI 数据层，纯函数）
 *
 * 由 {@link HealthResult} 生成卡片展示结构与折线序列，供业务层直接渲染。
 */

import type { HealthResult } from './PipelineHealth';

/** 健康卡片数据 */
export interface HealthCard {
  title: string;
  /** 全网平均健康分（0-100） */
  avgScore: number;
  /** 健康等级文字 */
  grade: '优' | '良' | '中' | '差';
  /** 最差管段数（<60 分） */
  worstCount: number;
  /** 优先维护条数 */
  maintenanceCount: number;
  /** 计算耗时（ms） */
  durationMs: number;
}

function gradeOf(score: number): HealthCard['grade'] {
  if (score >= 85) return '优';
  if (score >= 70) return '良';
  if (score >= 60) return '中';
  return '差';
}

/** 由评估结果生成健康卡片 */
export function buildHealthCard(report: HealthResult): HealthCard {
  const scores = report.scores.map((s) => s.score.score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const worstCount = report.scores.filter((s) => s.score.score < 60).length;
  return {
    title: '管网健康评估',
    avgScore: Math.round(avg * 10) / 10,
    grade: gradeOf(avg),
    worstCount,
    maintenanceCount: report.maintenance.length,
    durationMs: Math.round(report.durationMs * 100) / 100,
  };
}

/** 折线序列：各管段健康分（按分数升序，便于看最差段） */
export function buildHealthScoreSeries(report: HealthResult): { labels: string[]; values: number[] } {
  const sorted = [...report.scores].sort((a, b) => a.score.score - b.score.score);
  return {
    labels: sorted.map((s) => s.pipeId),
    values: sorted.map((s) => Math.round(s.score.score * 10) / 10),
  };
}
