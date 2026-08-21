import { describe, it, expect, vi } from 'vitest';
import { PipelineTopology } from '../PipelineTopology';
import type { PipelineTopologyDataset } from '../../types';

/** 构造 mock map 实例（渲染层薄壳，仅需 addSource/addLayer/on） */
function createMockMap(): any {
  return {
    instance: {
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(() => undefined),
      on: vi.fn(),
      setPaintProperty: vi.fn(),
    },
    removeLayer: vi.fn(),
  };
}

const dataset: PipelineTopologyDataset = {
  nodes: [
    { id: 'n1', kind: 'valve', lng: 114.3, lat: 30.5, region: '江岸区', pipelineType: 'gas', properties: { code: 'V-001' } },
    { id: 'n2', kind: 'junction', lng: 114.31, lat: 30.51, region: '江岸区', pipelineType: 'gas' },
    { id: 'n3', kind: 'junction', lng: 114.4, lat: 30.6, region: '武昌区', pipelineType: 'water' },
  ],
  pipes: [
    { id: 'p1', fromNode: 'n1', toNode: 'n2', type: 'pipe', pipelineType: 'gas', region: '江岸区', properties: { diameter: 300, material: 'steel', status: 'normal', installDate: '2000-01-01' } },
    { id: 'p2', fromNode: 'n2', toNode: 'n3', type: 'pipe', pipelineType: 'water', region: '武昌区', properties: { diameter: 100, material: 'pe', status: 'aging' } },
  ],
  users: [],
};

describe('PipelineTopology 搜索定位', () => {
  it('按设备编号搜索', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const r = topo.search('V-001');
    expect(r.nodes.length).toBe(1);
    expect(r.nodes[0].id).toBe('n1');
  });

  it('按区域搜索', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const r = topo.search('江岸区');
    expect(r.nodes.length).toBe(2);
    expect(r.pipes.length).toBe(1);
    expect(r.pipes[0].id).toBe('p1');
  });

  it('按材质搜索', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const r = topo.search('steel');
    expect(r.pipes.length).toBe(1);
    expect(r.pipes[0].id).toBe('p1');
  });

  it('空查询返回空结果', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const r = topo.search('');
    expect(r.nodes).toEqual([]);
    expect(r.pipes).toEqual([]);
  });
});

describe('PipelineTopology 层级钻取', () => {
  it('drillDown 触发事件', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const events: Array<{ from: string | null; to: string }> = [];
    topo.onDrillDown((e) => events.push({ from: e.from, to: e.to }));

    topo.drillDown('江岸区');
    expect(events.length).toBe(1);
    expect(events[0].to).toBe('江岸区');
    expect(events[0].from).toBeNull();

    topo.drillUp();
    expect(events.length).toBe(2);
    expect(events[1].to).toBe('');
    expect(events[1].from).toBe('江岸区');
  });
});

describe('PipelineTopology 分层控制', () => {
  it('setLayerFilter / clearLayerFilter 不抛错', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    expect(() => topo.setLayerFilter({ minDiameter: 200 })).not.toThrow();
    expect(() => topo.setLayerFilter({ material: 'steel', status: 'normal' })).not.toThrow();
    expect(() => topo.clearLayerFilter()).not.toThrow();
  });
});

describe('PipelineTopology 连通性高亮', () => {
  it('highlightConnectivity 返回连通节点集', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const visited = topo.highlightConnectivity('n1');
    // n1-p1-n2-p2-n3 全连通
    expect(visited.has('n1')).toBe(true);
    expect(visited.has('n2')).toBe(true);
    expect(visited.has('n3')).toBe(true);
  });
});
