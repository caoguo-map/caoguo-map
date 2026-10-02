import { describe, it, expect, vi } from 'vitest';
import { BurstSimulator } from '../burstClass';
import type { PipelineTopologyDataset } from '../../types';

/**
 * B-2 影响范围可视化（QA 审计 P2）：渲染薄壳此前只在历史测试里被顺带执行，
 * 零图层断言。本组对齐 F-4/F-5/L-4 四连标准（该实现无 data-driven 表达式、
 * 无 geometry filter——单类型 source，故固化 ①图层数恒定 ②paint 常量 ④幂等重渲染）。
 */

function makeMap() {
  const layers = new Set<string>();
  return {
    layers,
    removeLayer(id: string) {
      layers.delete(id);
    },
    instance: {
      addSource: vi.fn(),
      addLayer: vi.fn((l: { id: string }) => {
        layers.add(l.id);
      }),
      getSource: vi.fn(() => undefined),
    },
  } as any;
}

const dataset: PipelineTopologyDataset = {
  nodes: [
    { id: 'n1', kind: 'junction', lng: 114.3, lat: 30.5, pipelineType: 'gas' },
    { id: 'n2', kind: 'junction', lng: 114.31, lat: 30.51, pipelineType: 'gas' },
    { id: 'n3', kind: 'junction', lng: 114.32, lat: 30.52, pipelineType: 'gas' },
    { id: 'v1', kind: 'valve', lng: 114.305, lat: 30.505, pipelineType: 'gas', properties: { valveStatus: 'open' } },
  ],
  pipes: [
    { id: 'p1', fromNode: 'n1', toNode: 'n2', type: 'pipe', pipelineType: 'gas' },
    { id: 'p2', fromNode: 'n2', toNode: 'n3', type: 'pipe', pipelineType: 'gas' },
  ],
  users: [],
};

describe('B-2 影响范围渲染', () => {
  it('simulate 产出 hull-fill / pipes-line / nodes-pt 三层（默认前缀 cg-burst）', () => {
    const map = makeMap();
    const sim = new BurstSimulator({ map, dataset });
    const r = sim.simulate('p1');

    // 影响面（hull）仅在受影响节点 ≥3 时产出
    if (r.affectedNodes.length >= 3) {
      expect(map.layers.has('cg-burst-hull-fill')).toBe(true);
    }
    expect(map.layers.has('cg-burst-pipes-line')).toBe(true);
    expect(map.layers.has('cg-burst-nodes-pt')).toBe(true);
  });

  it('paint 常量固化：影响面半透明红 / 影响管红线 / 节点红点', () => {
    const map = makeMap();
    const sim = new BurstSimulator({ map, dataset });
    sim.simulate('p1');

    const calls = (map.instance.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as { id: string; type: string; paint: Record<string, unknown> },
    );
    const byId = Object.fromEntries(calls.map((l) => [l.id, l]));

    expect(byId['cg-burst-hull-fill']).toMatchObject({
      type: 'fill',
      paint: expect.objectContaining({ 'fill-color': '#ef4444', 'fill-opacity': 0.15 }),
    });
    expect(byId['cg-burst-pipes-line']).toMatchObject({
      type: 'line',
      paint: expect.objectContaining({ 'line-color': '#ef4444' }),
    });
    expect(byId['cg-burst-nodes-pt']).toMatchObject({
      type: 'circle',
      paint: expect.objectContaining({ 'circle-color': '#ef4444' }),
    });
  });

  it('幂等重渲染：重复 simulate 图层数不增长（try/catch 吞重复）', () => {
    const map = makeMap();
    const sim = new BurstSimulator({ map, dataset });
    sim.simulate('p1');
    const sizeAfterFirst = map.layers.size;
    expect(sizeAfterFirst).toBeGreaterThan(0);

    sim.simulate('p2');
    sim.restoreHistory(0);
    expect(map.layers.size).toBe(sizeAfterFirst); // 图层数恒定

    sim.clear();
    expect(map.layers.size).toBe(0);
  });
});
