import { describe, it, expect } from 'vitest';
import { extractWaterNames, matchWaterNames } from '../nlpCore';
import type { WaterFeature } from '../../types';

describe('extractWaterNames', () => {
  it('抽取出河道名（江/河）', () => {
    const cands = extractWaterNames('长江流域今日水位上涨');
    expect(cands.length).toBeGreaterThanOrEqual(1);
    expect(cands.find((c) => c.name === '长江' && c.kind === 'river')).toBeDefined();
  });

  it('抽取出水库/水电站名', () => {
    const cands = extractWaterNames('三峡水库今日入库流量 12000m³/s');
    const res = cands.find((c) => c.name === '三峡水库');
    expect(res).toBeDefined();
    expect(res?.kind).toBe('reservoir');
    expect(res?.confidence).toBe(0.95);
  });

  it('抽取出闸/坝名', () => {
    const cands = extractWaterNames('三峡大坝开始泄洪');
    const res = cands.find((c) => c.name === '三峡大坝');
    expect(res).toBeDefined();
    expect(res?.kind).toBe('gate');
  });

  it('抽取出堤防名', () => {
    const cands = extractWaterNames('荆江大堤出现管涌');
    const res = cands.find((c) => c.name === '荆江大堤');
    expect(res).toBeDefined();
    expect(res?.kind).toBe('dike');
  });

  it('抽取出监测站名', () => {
    const cands = extractWaterNames('汉口水文站水位 25.6m');
    const res = cands.find((c) => c.name === '汉口水文站');
    expect(res).toBeDefined();
    expect(res?.kind).toBe('station');
  });

  it('空文本返回空数组', () => {
    expect(extractWaterNames('')).toEqual([]);
  });

  it('span 起点按升序返回', () => {
    const cands = extractWaterNames('三峡水库和三峡大坝今日联合调度');
    for (let i = 1; i < cands.length; i++) {
      expect(cands[i].span[0]).toBeGreaterThanOrEqual(cands[i - 1].span[0]);
    }
  });

  it('多种规则同时命中时保留置信度更高的', () => {
    // "三峡水库" 同时匹配 reservoir(0.95) 和 gate(0.85)（"库" 不会触发 gate 规则，但应保留主语义）
    const cands = extractWaterNames('三峡水库调度');
    const res = cands.find((c) => c.name === '三峡水库');
    expect(res?.kind).toBe('reservoir');
  });
});

describe('matchWaterNames', () => {
  const dataset: WaterFeature[] = [
    {
      id: 'f1',
      kind: 'mainstream',
      name: '长江',
      lng: 110,
      lat: 30,
      properties: { aliases: ['扬子江'] },
    },
    {
      id: 'f2',
      kind: 'reservoir',
      name: '三峡水库',
      lng: 111,
      lat: 30,
    },
    {
      id: 'f3',
      kind: 'gate',
      name: '葛洲坝',
      lng: 111.1,
      lat: 30.6,
    },
  ];

  it('exact 匹配', () => {
    const cands = extractWaterNames('长江流域情况');
    const matches = matchWaterNames(cands, dataset);
    const res = matches.find((m) => m.candidate.name === '长江');
    expect(res?.featureId).toBe('f1');
    expect(res?.matchType).toBe('exact');
  });

  it('alias 匹配', () => {
    const cands = extractWaterNames('扬子江水位');
    // 扬子江 没有江/河后缀，不会被抽取到 → 改为直接构造候选
    const fakeCand = { kind: 'river' as const, name: '扬子江', span: [0, 3], confidence: 0.9 };
    const matches = matchWaterNames([fakeCand], dataset);
    expect(matches[0].matchType).toBe('alias');
    expect(matches[0].featureId).toBe('f1');
  });

  it('fuzzy 匹配（错字容错）', () => {
    const fakeCand = { kind: 'reservoir' as const, name: '三峡水厍', span: [0, 4], confidence: 0.9 };
    const matches = matchWaterNames([fakeCand], dataset);
    expect(matches[0].matchType).toBe('fuzzy');
    expect(matches[0].featureId).toBe('f2');
    expect(matches[0].similarity).toBeGreaterThanOrEqual(0.7);
  });

  it('未匹配返回 null', () => {
    const fakeCand = { kind: 'river' as const, name: '黄河', span: [0, 2], confidence: 0.9 };
    const matches = matchWaterNames([fakeCand], dataset);
    expect(matches[0].matchType).toBeNull();
    expect(matches[0].featureId).toBeNull();
  });

  it('fuzzy 阈值生效', () => {
    // 名称完全不同 → 不应模糊匹配
    const fakeCand = { kind: 'reservoir' as const, name: '完全无关名称', span: [0, 6], confidence: 0.9 };
    const matches = matchWaterNames([fakeCand], dataset, { threshold: 0.7 });
    expect(matches[0].matchType).toBeNull();
  });
});