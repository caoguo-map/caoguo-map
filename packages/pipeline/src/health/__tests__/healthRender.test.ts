import { describe, it, expect, vi } from 'vitest';
import { PipelineHealth } from '../PipelineHealth';
import type { PipelineTopologyDataset } from '../../types';

/**
 * H-2 风险热力图（QA 审计 P2）：PipelineHealth 类此前零实例化测试
 * （health.test.ts 只测纯函数）。固化：①图层数恒定 ②data-driven heatmap 表达式
 * ④空输入仍 upsert。实现为单 heatmap source，无 geometry filter。
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
  ],
  pipes: [
    { id: 'p1', fromNode: 'n1', toNode: 'n2', type: 'pipe', pipelineType: 'gas' },
    { id: 'p2', fromNode: 'n2', toNode: 'n3', type: 'pipe', pipelineType: 'gas' },
  ],
  users: [],
};

describe('H-2 风险热力图渲染', () => {
  it('evaluate 产出单个 heatmap 层 h-heat-point（自定义前缀）', () => {
    const map = makeMap();
    const health = new PipelineHealth({ map, dataset, layerPrefix: 'h' });
    const r = health.evaluate();

    expect(map.layers.has('h-heat-point')).toBe(true);
    expect(map.layers.size).toBe(1);
    expect(r.heatmap.length).toBeGreaterThan(0);
    expect(r.scores).toHaveLength(2);
  });

  it('data-driven paint：heatmap-weight 按要素 healthScore 反向映射（差管权重高）', () => {
    const map = makeMap();
    new PipelineHealth({ map, dataset, layerPrefix: 'h' }).evaluate();

    const layer = (map.instance.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      type: string;
      paint: Record<string, unknown>;
    };
    expect(layer.type).toBe('heatmap');

    const weight = layer.paint['heatmap-weight'] as unknown[];
    expect(weight[0]).toBe('interpolate');
    expect(weight[2]).toEqual(['get', 'healthScore']);
    // 健康分 0→权重 1，50→0.5，100→0（越不健康热力越强）
    expect(weight.slice(3).filter((v) => typeof v === 'number')).toEqual([0, 1, 50, 0.5, 100, 0]);

    const color = layer.paint['heatmap-color'] as unknown[];
    expect(color[0]).toBe('interpolate');
    expect(color[2]).toEqual(['heatmap-density']); // 密度驱动渐变
  });

  it('重复 evaluate 图层数恒定（先 clear 再重建）；clear 后为空', () => {
    const map = makeMap();
    const health = new PipelineHealth({ map, dataset, layerPrefix: 'h' });
    health.evaluate();
    expect(map.layers.size).toBe(1);
    health.evaluate();
    expect(map.layers.size).toBe(1);
    health.clear();
    expect(map.layers.size).toBe(0);
  });

  it('空管网：仍 upsert 空 heatmap 层（契约锁定，与 F-6 早退不同）', () => {
    const map = makeMap();
    const empty = { nodes: [], pipes: [], users: [] } as never;
    new PipelineHealth({ map, dataset: empty, layerPrefix: 'h' }).evaluate();
    expect(map.layers.size).toBe(1);
  });
});
