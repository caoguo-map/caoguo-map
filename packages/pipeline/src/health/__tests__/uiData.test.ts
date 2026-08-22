import { describe, it, expect } from 'vitest';
import { buildHealthCard, buildHealthScoreSeries } from '../uiData';
import type { HealthResult } from '../PipelineHealth';

const dim = { score: 0, weight: 0, reason: '' };
const mkScore = (score: number) => ({
  score,
  level: 'good' as const,
  dimensions: { age: dim, material: dim, soil: dim, history: dim, pressure: dim, protection: dim },
});

const report: HealthResult = {
  scores: [
    { pipeId: 'p1', score: mkScore(90) },
    { pipeId: 'p2', score: mkScore(55) },
    { pipeId: 'p3', score: mkScore(70) },
  ],
  heatmap: [],
  maintenance: [
    { id: 'p2', healthScore: 55, lng: 0, lat: 0 },
  ],
  durationMs: 12.345,
};

describe('P2-c pipeline 健康卡片/折线数据层', () => {
  it('buildHealthCard 生成平均分/等级/最差段', () => {
    const card = buildHealthCard(report);
    expect(card.avgScore).toBeCloseTo(71.7, 1);
    expect(card.grade).toBe('良');
    expect(card.worstCount).toBe(1); // p2 < 60
    expect(card.maintenanceCount).toBe(1);
    expect(card.durationMs).toBe(12.35);
  });

  it('buildHealthScoreSeries 按分数升序', () => {
    const s = buildHealthScoreSeries(report);
    expect(s.labels).toEqual(['p2', 'p3', 'p1']);
    expect(s.values).toEqual([55, 70, 90]);
  });
});
