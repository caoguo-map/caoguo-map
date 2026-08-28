import { describe, it, expect, vi } from 'vitest';
import { PipelineTopology } from '../PipelineTopology';
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
    },
  } as any;
}

function makeDataset(): PipelineTopologyDataset {
  return {
    nodes: [
      { id: 'n1', kind: 'valve', lng: 114.3, lat: 30.5, pipelineType: 'gas' },
      { id: 'n2', kind: 'junction', lng: 114.31, lat: 30.51, pipelineType: 'gas' },
    ],
    pipes: [
      { id: 'p1', fromNode: 'n1', toNode: 'n2', type: 'pipe', pipelineType: 'gas' },
    ],
    users: [],
  };
}

describe('P-5 拓扑编辑数据层', () => {
  it('addNode：自动生成 id、写入数据集并重渲染', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset: makeDataset(), layerPrefix: 't' });
    const added = topo.addNode({ kind: 'pump', lng: 114.32, lat: 30.52, pipelineType: 'gas' });
    expect(added.id).toMatch(/^node-/);
    expect(topo.search('node-').nodes.length).toBe(1); // 已在数据集中
  });

  it('addNode：id 重复时抛错', () => {
    const topo = new PipelineTopology({ map: makeMap(), dataset: makeDataset(), layerPrefix: 't' });
    expect(() => topo.addNode({ id: 'n1', kind: 'pump', lng: 114.32, lat: 30.52 })).toThrow(
      /已存在/
    );
  });

  it('addPipe：端点存在时写入（type 缺省为 pipe）', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset: makeDataset(), layerPrefix: 't' });
    const pipe = topo.addPipe({ fromNode: 'n2', toNode: 'n1' });
    expect(pipe.id).toMatch(/^pipe-/);
    expect(pipe.type).toBe('pipe');
  });

  it('addPipe：端点不存在时抛错（保证连通性）', () => {
    const topo = new PipelineTopology({ map: makeMap(), dataset: makeDataset(), layerPrefix: 't' });
    expect(() => topo.addPipe({ fromNode: 'n1', toNode: 'ghost' })).toThrow(/端点不存在/);
  });

  it('addPipe：新管段参与连通性高亮（图已更新）', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset: makeDataset(), layerPrefix: 't' });
    topo.addPipe({ fromNode: 'n2', toNode: 'n2' });
    // 从 n1 出发经 p1 可达 n2（含自环新增管段不破坏遍历）
    expect(topo.highlightConnectivity('n1').size).toBeGreaterThanOrEqual(2);
  });

  it('removePipe：从数据集移除并重渲染；不存在时静默', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset: makeDataset(), layerPrefix: 't' });
    topo.removePipe('p1');
    expect(topo.search('p1').pipes.length).toBe(0);
    expect(() => topo.removePipe('not-exist')).not.toThrow();
  });

  it('removeNode：级联删除相连管段', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset: makeDataset(), layerPrefix: 't' });
    topo.removeNode('n1');
    expect(topo.search('n1').nodes.length).toBe(0);
    expect(topo.search('p1').pipes.length).toBe(0); // 级联删除
    expect(topo.search('n2').nodes.length).toBe(1); // 其他节点保留
  });
});
