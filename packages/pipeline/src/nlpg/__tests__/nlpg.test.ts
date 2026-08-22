import { describe, it, expect } from 'vitest';
import { parsePipelineQuery } from '../pipelineNlp';
import { PipelineNlp } from '../pipelineNlpClass';
import type { PipelineTopologyDataset, PipelineNode, PipelinePipe } from '../../types';

/** 极简数据集：s(源)-A-v1(阀)-B-t1(表) */
function makeToy(): PipelineTopologyDataset {
  const nodes: PipelineNode[] = [
    { id: 's', kind: 'source', lng: 114.0, lat: 30.0 },
    { id: 'v1', kind: 'valve', lng: 114.01, lat: 30.0 },
    { id: 't1', kind: 'meter', lng: 114.02, lat: 30.0 },
  ];
  const pipes: PipelinePipe[] = [
    { id: 'A', fromNode: 's', toNode: 'v1', type: 'pipe' },
    { id: 'B', fromNode: 'v1', toNode: 't1', type: 'pipe' },
  ];
  return { nodes, pipes };
}

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

describe('nlpg/PipelineNlp 联动推演（修复 stub）', () => {
  it('爆管意图自动联动 BurstSimulator.simulate 并拿到结果', () => {
    const ds = makeToy();
    const calls: string[] = [];
    const mockSim = {
      simulate: (pipeId: string) => {
        calls.push(pipeId);
        return { pipeId, affectedNodes: [] };
      },
    };
    const nlp = new PipelineNlp({ burstSimulator: mockSim, dataset: ds });
    const res = nlp.query('朝阳门外大街发生燃气爆管');
    expect(res.intent).toBe('burst');
    // 未显式给出管段编号 → 回退到数据集首条管段 A
    expect(calls).toEqual(['A']);
    expect(nlp.getLastBurst()).toMatchObject({ pipeId: 'A' });
  });

  it('显式管段编号被解析并用于推演', () => {
    const ds = makeToy();
    const calls: string[] = [];
    const mockSim = { simulate: (pipeId: string) => { calls.push(pipeId); return { pipeId }; } };
    const nlp = new PipelineNlp({ burstSimulator: mockSim, dataset: ds });
    nlp.query('管段 B 发生爆管');
    expect(calls).toEqual(['B']);
  });

  it('非爆管意图不触发推演', () => {
    const ds = makeToy();
    let called = false;
    const mockSim = { simulate: () => { called = true; return {}; } };
    const nlp = new PipelineNlp({ burstSimulator: mockSim, dataset: ds });
    nlp.query('查一下所有超过 30 年的铸铁管');
    expect(called).toBe(false);
  });

  it('未关联推演器时不抛错', () => {
    const nlp = new PipelineNlp();
    const res = nlp.query('燃气爆管事故');
    expect(res.intent).toBe('burst');
    expect(nlp.getLastBurst()).toBeNull();
  });
});
