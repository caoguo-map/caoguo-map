import { describe, it, expect, vi } from 'vitest';
import { FiberRoute } from '../FiberRoute';
import type { ComputeTopologyDataset } from '../../types';

const dataset: ComputeTopologyDataset = {
  nodes: [
    { id: 'a', type: 'datacenter', lng: 116, lat: 39 },
    { id: 'b', type: 'edge', lng: 117, lat: 40 },
  ],
  links: [
    {
      id: 'l1',
      fromNode: 'a',
      toNode: 'b',
      properties: { type: 'fiber', utilization: 0.6, bandwidthGbps: 100 },
    },
  ],
};

describe('FiberRoute (C-3 光缆路由可视化)', () => {
  it('渲染链路为线层，支持点击选中', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      setData: vi.fn(),
      addLayer: vi.fn(),
      on: (_t: string, _l: string, h: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void) =>
        h({ features: [{ properties: { linkId: 'l1' } }] }),
    };
    const map = { instance: mlMap, removeLayer: vi.fn() } as never;
    let selected: string | null = null;
    const route = new FiberRoute({
      map,
      dataset,
      onLinkSelect: (l) => {
        selected = l.id;
      },
    });

    route.render();
    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();
    expect(selected).toBe('l1');

    route.clear();
  });

  it('无几何时回退到节点坐标连线', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      setData: vi.fn(),
      addLayer: vi.fn(),
      on: vi.fn(),
    };
    const map = { instance: mlMap, removeLayer: vi.fn() } as never;
    const route = new FiberRoute({ map, dataset });
    route.render();
    // source 注入的 features 应包含一条 LineString（节点 a→b 坐标）
    const injected = (mlMap.addSource as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      features: Array<{ geometry: { type: string; coordinates: [number, number][] } }>;
    };
    expect(injected.features[0].geometry.type).toBe('LineString');
    expect(injected.features[0].geometry.coordinates).toEqual([
      [116, 39],
      [117, 40],
    ]);
  });
});
