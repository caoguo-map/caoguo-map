import { describe, it, expect, vi } from 'vitest';
import { BurstSimulator } from '../burstClass';
import type { PipelineTopologyDataset } from '../../types';

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
    { id: 'n1', kind: 'junction', lng: 114.30, lat: 30.50, pipelineType: 'gas' },
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

describe('B-7 推演历史', () => {
  it('simulate 自动记录历史（旧→新）', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    sim.simulate('p1');
    sim.simulate('p2');
    const entries = sim.historyEntries();
    expect(entries.length).toBe(2);
    expect(entries.map((e) => e.pipeId)).toEqual(['p1', 'p2']);
    expect(entries[0].index).toBe(0);
    expect(entries[1].at).toBeGreaterThanOrEqual(entries[0].at);
  });

  it('restoreHistory 重放指定条目并触发订阅回调', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    const seen: string[] = [];
    sim.onResult((r) => seen.push(r.affectedNodes.length >= 0 ? 'event' : ''));
    sim.simulate('p1');
    sim.simulate('p2');
    seen.length = 0;
    const restored = sim.restoreHistory(0)!;
    expect(restored).toBeDefined();
    expect(seen.length).toBe(1); // 重放触发监听
  });

  it('restoreHistory 越界返回 undefined', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    sim.simulate('p1');
    expect(sim.restoreHistory(5)).toBeUndefined();
    expect(sim.restoreHistory(-1)).toBeUndefined();
  });

  it('历史栈上限：超出淘汰最旧', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    sim.setHistoryLimit(2);
    sim.simulate('p1');
    sim.simulate('p1');
    sim.simulate('p2');
    expect(sim.historyEntries().map((e) => e.pipeId)).toEqual(['p1', 'p2']);
  });

  it('clearHistory 清空但不影响当前地图图层', () => {
    const map = makeMap();
    const sim = new BurstSimulator({ map, dataset });
    sim.simulate('p1');
    sim.clearHistory();
    expect(sim.historyEntries()).toEqual([]);
    expect(map.layers.size).toBeGreaterThan(0); // 图层保留
  });

  it('destroy 清空历史', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    sim.simulate('p1');
    sim.destroy();
    expect(sim.historyEntries()).toEqual([]);
  });
});

describe('B-7 历史持久化（exportHistory / importHistory）', () => {
  it('导出-导入往返还原完整历史', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    sim.simulate('p1');
    sim.simulate('p2');
    const json = sim.exportHistory();

    const sim2 = new BurstSimulator({ map: makeMap(), dataset });
    const n = sim2.importHistory(json);
    expect(n).toBe(2);
    expect(sim2.historyEntries().map((e) => e.pipeId)).toEqual(['p1', 'p2']);
    // 还原后仍可重放
    expect(sim2.restoreHistory(1)).toBeDefined();
  });

  it('非法 JSON / 非数组时抛错', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    expect(() => sim.importHistory('not-json')).toThrow();
    expect(() => sim.importHistory('{"a":1}')).toThrow(/期望数组/);
  });

  it('含非法条目的数组被过滤（不整批拒绝）', () => {
    const sim = new BurstSimulator({ map: makeMap(), dataset });
    const n = sim.importHistory('[{"pipeId":"p1","at":123,"result":{"affectedNodes":[]}}, "bad", null]');
    expect(n).toBe(1);
  });
});
