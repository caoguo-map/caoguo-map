import { describe, it, expect, vi } from 'vitest';
import { TrafficFlow } from '../TrafficFlow';
import type { RoadNetworkDataset } from '../../types';

const dataset: RoadNetworkDataset = {
  nodes: [
    { id: 'a', lng: 116, lat: 39 },
    { id: 'b', lng: 117, lat: 40 },
    { id: 'c', lng: 118, lat: 41 },
  ],
  edges: [
    { id: 'e1', fromNode: 'a', toNode: 'b', roadClass: 'highway' },
    { id: 'e2', fromNode: 'b', toNode: 'c', roadClass: 'highway' },
  ],
  speeds: [
    { edgeId: 'e1', speed: 30 },
    { edgeId: 'e2', speed: 30 },
  ],
};

describe('TrafficFlow.renderCongestionSpread (TF-2 拥堵传播动画)', () => {
  it('从种子路段沿拓扑扩散并返回受影响路段，渲染高亮层', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
      on: vi.fn(),
    };
    const map = { instance: mlMap } as never;
    const tf = new TrafficFlow({ map, dataset });

    const affected = tf.renderCongestionSpread('e1', 3);

    // e1 自身 + 相邻且相对拥堵的 e2 都应被标记
    expect(affected).toContain('e1');
    expect(affected).toContain('e2');
    // 渲染层被创建（source 通过 upsertSource 写入）
    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();
  });

  it('未知种子返回空', () => {
    const tf = new TrafficFlow({ map: { instance: {} } as never, dataset });
    expect(tf.renderCongestionSpread('x')).toEqual([]);
  });
});
