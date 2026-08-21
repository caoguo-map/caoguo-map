import { describe, it, expect } from 'vitest';
import { parsePipelineQuery } from '../pipelineNlp';

describe('nlpg/pipelineNlp', () => {
  it('识别爆管意图', () => {
    const r = parsePipelineQuery('刚才朝阳门外大街发生燃气爆管');
    expect(r.intent).toBe('burst');
    expect(r.confidence).toBeGreaterThan(0.8);
    expect(r.filters.pipelineType).toBe('gas');
  });

  it('识别阀门关闭影响', () => {
    const r = parsePipelineQuery('如果关闭海淀区的燃气阀门，会影响多大范围？');
    expect(r.intent).toBe('valve');
    expect(r.filters.pipelineType).toBe('gas');
    expect(r.filters.region).toBe('海淀区');
  });

  it('识别材质+年限筛选', () => {
    const r = parsePipelineQuery('查一下所有超过 30 年的铸铁管');
    expect(r.intent).toBe('material_age');
    expect(r.filters.material).toBe('cast_iron');
    expect(r.filters.minAgeYears).toBe(30);
  });

  it('识别压力阈值查询', () => {
    const r = parsePipelineQuery('找出压力低于 0.2MPa 的管段');
    expect(r.intent).toBe('pressure');
    expect(r.filters.maxPressure).toBe(0.2);
    expect(r.filters.pipelineType).toBeUndefined();
  });

  it('识别附近查询（POI + 距离）', () => {
    const r = parsePipelineQuery('管线 200 米内有哪些学校？');
    expect(r.intent).toBe('nearby');
    expect(r.filters.radius).toBe(200);
  });

  it('识别报警聚类', () => {
    const r = parsePipelineQuery('过去一周的报警聚集在哪里？');
    expect(r.intent).toBe('alarm_cluster');
    expect(r.filters.timeWindow).toBe('7d');
  });

  it('未匹配意图 → unknown 信心值低', () => {
    const r = parsePipelineQuery('今天天气不错');
    expect(r.intent).toBe('unknown');
    expect(r.confidence).toBe(0);
  });

  it('城市区域识别（武汉行政区）', () => {
    const r = parsePipelineQuery('武昌区今天燃气泄漏情况');
    expect(r.filters.region).toBe('武昌区');
    expect(r.intent).toBe('burst');
  });

  it('description 字段组合自然语言', () => {
    const r = parsePipelineQuery('查一下朝阳区超过 30 年的铸铁管');
    expect(r.description).toContain('筛选');
    expect(r.description).toContain('铸铁');
    expect(r.description).toContain('30');
  });

  it('距离单位 km 转换为 m', () => {
    const r = parsePipelineQuery('1 公里内的医院');
    expect(r.filters.radius).toBe(1000);
  });
});
