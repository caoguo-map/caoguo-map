import { describe, it, expect, vi } from 'vitest';
import { PipelineTopology } from '../PipelineTopology';
import type { PipelineTopologyDataset } from '../../types';

/**
 * B-5 重要用户标注（QA 审计 P2）：渲染薄壳此前零覆盖。
 * 固化四连中适用的三条：①图层数恒定 ②data-driven 表达式（severity 半径 interpolate
 * + 颜色 case 四档）④幂等重渲染/空输入仍 upsert。实现为单 Point source，无 geometry filter。
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
      on: vi.fn(),
      setPaintProperty: vi.fn(),
      flyTo: vi.fn(),
    },
  } as any;
}

const dataset: PipelineTopologyDataset = {
  nodes: [{ id: 'n1', kind: 'junction', lng: 114.3, lat: 30.5, pipelineType: 'gas' }],
  pipes: [],
  users: [],
};

const users = [
  { id: 'hosp1', kind: 'important', name: '市中心医院', lng: 114.3, lat: 30.5, severity: 100 },
  { id: 'sch1', kind: 'important', name: '实验小学', lng: 114.31, lat: 30.51, severity: 20 },
] as never;

describe('B-5 重要用户标注渲染', () => {
  it('产出单个 circle 层 t-important-pt，要素属性齐全且与返回值一致', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset, layerPrefix: 't' });
    const markers = topo.renderImportantUsers(users);

    expect(map.layers.has('t-important-pt')).toBe(true);
    expect(markers.length).toBe(2);

    const [, data] = (map.instance.addSource as ReturnType<typeof vi.fn>).mock.calls.find(
      ([id]) => id === 't-important-src',
    ) as [string, { features: Array<{ properties: Record<string, unknown> }> }];
    expect(data.features).toHaveLength(markers.length);
    expect(data.features.map((f) => f.properties.userId)).toEqual(markers.map((m) => m.userId));
    expect(data.features[0].properties.severity).toBeDefined();
  });

  it('data-driven paint：半径按 severity interpolate（1→5 … 100→9），颜色 case 四档', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset, layerPrefix: 't' });
    topo.renderImportantUsers(users);

    const layer = (map.instance.addLayer as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => (c[0] as { id: string }).id === 't-important-pt',
    )![0] as { type: string; paint: Record<string, unknown> };

    expect(layer.type).toBe('circle');
    const radius = layer.paint['circle-radius'] as unknown[];
    expect(radius[0]).toBe('interpolate');
    expect(radius[2]).toEqual(['get', 'severity']);
    expect(radius.slice(3).filter((v) => typeof v === 'number')).toEqual([1, 5, 20, 6, 50, 7, 100, 9]);

    const color = layer.paint['circle-color'] as unknown[];
    expect(color[0]).toBe('case');
    // 分支条件（>=100 / >=50 / >=20）+ 兜底 = 4 档
    const thresholds = color.filter(
      (b) => Array.isArray(b) && (b as unknown[])[0] === '>=',
    ) as unknown[][];
    expect(thresholds).toHaveLength(3);
  });

  it('幂等：重复渲染图层数不增长；空列表仍 upsert（契约锁定）', () => {
    const map = makeMap();
    const topo = new PipelineTopology({ map, dataset, layerPrefix: 't' });
    topo.renderImportantUsers(users);
    expect(map.layers.size).toBe(1);
    topo.renderImportantUsers(users);
    expect(map.layers.size).toBe(1); // try/catch 吞重复

    const map2 = makeMap();
    new PipelineTopology({ map: map2, dataset, layerPrefix: 't' }).renderImportantUsers([]);
    expect(map2.layers.size).toBe(1); // 空输入不早退，仍加层
  });
});
