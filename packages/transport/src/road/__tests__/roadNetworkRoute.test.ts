import { describe, it, expect, vi } from 'vitest';
import { RoadNetwork } from '../RoadNetwork';
import type { RoadNetworkDataset } from '../../types';

/**
 * Mock map：RoadNetwork 通过 `(map as any).instance` 访问底层 maplibre 实例，
 * 并按约定调用顶层 `removeLayer`（见 MEMORY：渲染类 clear() 统一走 map.removeLayer）。
 */
function createMockMap() {
  const addedLayers: string[] = [];
  return {
    addedLayers,
    instance: {
      addSource: vi.fn(),
      addLayer: vi.fn((layer: { id: string }) => {
        addedLayers.push(layer.id);
      }),
      getSource: vi.fn(() => undefined),
      setPaintProperty: vi.fn(),
    },
    removeLayer: vi.fn(),
  } as any;
}

const dataset: RoadNetworkDataset = {
  nodes: [
    { id: 'a', kind: 'intersection', lng: 114.3, lat: 30.5 },
    { id: 'b', kind: 'intersection', lng: 114.31, lat: 30.5 },
    { id: 'c', kind: 'intersection', lng: 114.32, lat: 30.5 },
    { id: 't1', kind: 'toll', lng: 114.303, lat: 30.501, properties: { name: '府河收费站' } },
  ],
  edges: [
    { id: 'e1', fromNode: 'a', toNode: 'b', roadClass: 'urban', length: 1000 },
    { id: 'e2', fromNode: 'b', toNode: 'c', roadClass: 'urban', length: 1000 },
  ],
};

describe('RoadNetwork 路径规划（T-4）', () => {
  it('planRoute 返回 Dijkstra 结果（节点序列 + 距离）', () => {
    const road = new RoadNetwork({ map: createMockMap(), dataset });
    const r = road.planRoute('a', 'c');
    expect(r.found).toBe(true);
    expect(r.path).toEqual(['a', 'b', 'c']);
    expect(r.distance).toBe(2000);
  });

  it('planRouteAStar 与 Dijkstra 结果一致', () => {
    const road = new RoadNetwork({ map: createMockMap(), dataset });
    expect(road.planRouteAStar('a', 'c').path).toEqual(road.planRoute('a', 'c').path);
  });

  it('节点不存在时 found=false', () => {
    const road = new RoadNetwork({ map: createMockMap(), dataset });
    expect(road.planRoute('a', 'ghost').found).toBe(false);
  });

  it('renderRoute 渲染折线图层并可清除', () => {
    const map = createMockMap();
    const road = new RoadNetwork({ map, dataset });
    road.render();
    const poly = road.renderRoute(['a', 'b', 'c']);
    expect(poly.coordinates.length).toBe(3);
    expect(poly.lengthM).toBe(2000);
    expect(map.addedLayers).toContain('cg-road-route-line');

    road.clearRoute();
    expect(map.removeLayer).toHaveBeenCalledWith('cg-road-route-line');
  });

  it('renderRoute 路径不足两点时不渲染（返回空几何）', () => {
    const map = createMockMap();
    const road = new RoadNetwork({ map, dataset });
    road.render();
    expect(road.renderRoute(['a']).coordinates).toEqual([]);
    expect(map.addedLayers).not.toContain('cg-road-route-line');
  });
});

describe('RoadNetwork 缓冲查询（T-5）', () => {
  it('queryBuffer 按距离升序返回命中节点', () => {
    const road = new RoadNetwork({ map: createMockMap(), dataset });
    const hits = road.queryBuffer(114.3, 30.5, 3000);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe('a'); // 距离最近
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i].distance).toBeGreaterThanOrEqual(hits[i - 1].distance);
    }
  });

  it('半径外节点不返回', () => {
    const road = new RoadNetwork({ map: createMockMap(), dataset });
    expect(road.queryBuffer(114.3, 30.5, 10).map((h) => h.id)).toEqual(['a']);
  });

  it('renderBuffer 渲染范围圆 + 命中节点，并可清除', () => {
    const map = createMockMap();
    const road = new RoadNetwork({ map, dataset });
    road.render();
    road.renderBuffer(114.3, 30.5, 3000);
    expect(map.addedLayers).toContain('cg-road-buffer-fill');
    expect(map.addedLayers).toContain('cg-road-buffer-nodes');

    road.clearBuffer();
    expect(map.removeLayer).toHaveBeenCalledWith('cg-road-buffer-fill');
    expect(map.removeLayer).toHaveBeenCalledWith('cg-road-buffer-nodes');
  });

  it('showNodes=false 时只渲染范围圆', () => {
    const map = createMockMap();
    const road = new RoadNetwork({ map, dataset });
    road.render();
    road.renderBuffer(114.3, 30.5, 3000, { showNodes: false });
    expect(map.addedLayers).toContain('cg-road-buffer-fill');
    expect(map.addedLayers).not.toContain('cg-road-buffer-nodes');
  });
});

describe('RoadNetwork 设施标注（T-3）', () => {
  it('设施节点被渲染为独立图层（按类型着色）', () => {
    const map = createMockMap();
    const road = new RoadNetwork({ map, dataset });
    road.render();
    expect(map.addedLayers).toContain('cg-road-facility-pt');
  });

  it('无设施节点时不创建设施图层', () => {
    const map = createMockMap();
    const noFacility: RoadNetworkDataset = {
      nodes: dataset.nodes.filter((n) => n.kind === 'intersection'),
      edges: dataset.edges,
    };
    new RoadNetwork({ map, dataset: noFacility }).render();
    expect(map.addedLayers).not.toContain('cg-road-facility-pt');
  });
});
