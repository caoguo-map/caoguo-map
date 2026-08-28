import { describe, it, expect, vi } from 'vitest';
import { PipelineTopology, NODE_KIND_ICONS, NODE_KIND_COLORS } from '../PipelineTopology';
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
      on: vi.fn(),
      setPaintProperty: vi.fn(),
      flyTo: vi.fn(),
    },
  } as any;
}

const dataset: PipelineTopologyDataset = {
  nodes: [
    { id: 'n1', kind: 'valve', lng: 114.3, lat: 30.5, region: '江岸区', pipelineType: 'gas', properties: { code: 'V-001' } },
    { id: 'n2', kind: 'source', lng: 114.28, lat: 30.49, region: '江岸区', pipelineType: 'gas' },
  ],
  pipes: [
    { id: 'p1', fromNode: 'n2', toNode: 'n1', type: 'pipe', pipelineType: 'gas', region: '江岸区' },
  ],
  users: [],
};

describe('P-1 节点图标与类型着色', () => {
  it('render 创建 emoji 图标层', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset, layerPrefix: 't' });
    topo.render();
    expect(map.layers.has('t-nodes-icon')).toBe(true);
    expect(map.layers.has('t-nodes-pt')).toBe(true);
  });

  it('节点要素带 kindIcon（阀门 🚰 / 源头 🏭）', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset, layerPrefix: 't' });
    topo.render();
    const call = map.instance.addSource.mock.calls.find(([id]) => id === 't-nodes-src');
    const features = call?.[1]?.features ?? [];
    const icons = Object.fromEntries(features.map((f: any) => [f.properties.nodeId, f.properties.kindIcon]));
    expect(icons['n1']).toBe('🚰');
    expect(icons['n2']).toBe('🏭');
  });

  it('NODE_KIND_ICONS / NODE_KIND_COLORS 覆盖全部节点类型', () => {
    const kinds = ['junction', 'valve', 'pump', 'meter', 'source', 'tank', 'junction_box'];
    for (const k of kinds) {
      expect(NODE_KIND_ICONS[k]).toBeDefined();
      expect(NODE_KIND_COLORS[k]).toBeDefined();
    }
  });
});

describe('P-6 搜索并定位', () => {
  it('命中后调用 flyTo 并返回结果', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset, layerPrefix: 't' });
    const r = topo.locate('V-001')!;
    expect(r.nodes[0].id).toBe('n1');
    expect(map.instance.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [114.3, 30.5], zoom: 15 })
    );
  });

  it('无命中时不飞行、返回 undefined', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset, layerPrefix: 't' });
    expect(topo.locate('不存在的东西')).toBeUndefined();
    expect(map.instance.flyTo).not.toHaveBeenCalled();
  });
});
