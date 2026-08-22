import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RoadNetworkDataset } from '../../types';

// 拦截 upsertSource，捕获 RoadNetwork 传入的渲染数据
const upsertSource = vi.fn();
vi.mock('@caoguo/maplibre', () => ({
  upsertSource: (...args: unknown[]) => upsertSource(...args),
}));

import { RoadNetwork } from '../RoadNetwork';

function makeMap() {
  const setDataMock = vi.fn();
  const mlMap = {
    addSource: vi.fn(),
    getSource: vi.fn(() => ({ setData: setDataMock })),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  };
  return { mlMap, setDataMock };
}

const dataset: RoadNetworkDataset = {
  nodes: [
    { id: 'n1', lng: 0, lat: 0, kind: 'junction' },
    { id: 'n2', lng: 1, lat: 1, kind: 'junction' },
  ],
  edges: [{ id: 'e1', fromNode: 'n1', toNode: 'n2', roadClass: 'highway' }],
  speeds: [{ edgeId: 'e1', speed: 42 }],
};

const edgeFeatures = (data: unknown) => (data as { features: Array<{ properties: { speed: number } }> }).features;

describe('RoadNetwork 路况速度接入 dataset.speeds (TF-1/TF-3)', () => {
  beforeEach(() => upsertSource.mockClear());

  it('render 时 edge 的 speed 读取 dataset.speeds', () => {
    const { mlMap } = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const rn = new RoadNetwork({ map, dataset });
    rn.render();

    const call = upsertSource.mock.calls.find((c) => c[1] === 'cg-road-edges-src');
    expect(call).toBeTruthy();
    expect(edgeFeatures(call![2])[0].properties.speed).toBe(42);
  });

  it('setSpeeds 优先用注入速度，fallback 到 dataset.speeds', () => {
    const { mlMap, setDataMock } = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const rn = new RoadNetwork({ map, dataset });
    rn.render();

    rn.setSpeeds([{ edgeId: 'e1', speed: 15 }]);
    expect(edgeFeatures(setDataMock.mock.calls[0][0])[0].properties.speed).toBe(15);

    rn.setSpeeds([]);
    expect(edgeFeatures(setDataMock.mock.calls[1][0])[0].properties.speed).toBe(42);
  });

  it('dataset 无 speeds 时 render 回退默认 60', () => {
    const { mlMap } = makeMap();
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    const ds: RoadNetworkDataset = { nodes: dataset.nodes, edges: dataset.edges };
    const rn = new RoadNetwork({ map, dataset: ds });
    rn.render();

    const call = upsertSource.mock.calls.find((c) => c[1] === 'cg-road-edges-src');
    expect(edgeFeatures(call![2])[0].properties.speed).toBe(60);
  });
});
