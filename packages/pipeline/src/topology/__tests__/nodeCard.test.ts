import { describe, it, expect } from 'vitest';
import type { PipelineTopologyDataset } from '../../types';
import { getNodeDetail, getPipeDetail, polylineLengthM } from '../nodeCard';

const dataset: PipelineTopologyDataset = {
  nodes: [
    {
      id: 'n1',
      kind: 'valve',
      lng: 114.3,
      lat: 30.5,
      pipelineType: 'gas',
      properties: {
        code: 'V-001',
        valveType: 'gate',
        valveStatus: 'open',
        capacity: 800,
        extra: {
          images: ['https://example.com/v-001.jpg'],
          maintenance: [
            { date: '2026-03-12', type: '例行巡检', operator: '张工', note: '密封正常' },
            { date: 'bad-record' }, // 非法记录，应被过滤
          ],
        },
      },
    },
    { id: 'n2', kind: 'junction', lng: 114.31, lat: 30.51, pipelineType: 'gas' },
    { id: 'n3', kind: 'junction', lng: 114.4, lat: 30.6, pipelineType: 'water' },
  ],
  pipes: [
    {
      id: 'p1',
      fromNode: 'n1',
      toNode: 'n2',
      type: 'pipe',
      pipelineType: 'gas',
      properties: { diameter: 300, material: 'steel', status: 'normal' },
    },
    {
      id: 'p2',
      fromNode: 'n2',
      toNode: 'n3',
      type: 'pipe',
      pipelineType: 'water',
      properties: { diameter: 100, material: 'pe', status: 'aging' },
    },
  ],
  users: [
    { id: 'u1', name: '市第一医院', kind: 'important', nodeId: 'n2', lng: 114.312, lat: 30.512 },
    { id: 'u2', name: '阳光小区', kind: 'residential', nodeId: 'n2', lng: 114.313, lat: 30.513 },
    { id: 'u3', name: '化工厂', kind: 'industrial', nodeId: 'n2', lng: 114.314, lat: 30.514 },
    { id: 'u4', name: '其他小区', kind: 'residential', nodeId: 'n3', lng: 114.41, lat: 30.61 },
  ],
};

describe('getNodeDetail（P-3 设备卡片数据层）', () => {
  it('节点不存在时返回 undefined', () => {
    expect(getNodeDetail(dataset, 'not-exist')).toBeUndefined();
  });

  it('统计相连管段与 id 列表', () => {
    const detail = getNodeDetail(dataset, 'n2')!;
    expect(detail.connectedPipes).toBe(2);
    expect(detail.connectedPipeIds.sort()).toEqual(['p1', 'p2']);
  });

  it('统计挂接用户数与分类（含重要用户数）', () => {
    const detail = getNodeDetail(dataset, 'n2')!;
    expect(detail.userCount).toBe(3);
    expect(detail.importantUserCount).toBe(1);
    expect(detail.userBreakdown).toEqual({
      residential: 1,
      commercial: 0,
      industrial: 1,
      important: 1,
    });
  });

  it('卡片字段：标题/类型/状态/容量', () => {
    const detail = getNodeDetail(dataset, 'n1')!;
    expect(detail.cardInfo.title).toBe('V-001');
    expect(detail.cardInfo.kindLabel).toBe('阀门');
    expect(detail.cardInfo.statusLabel).toBe('开启');
    expect(detail.cardInfo.capacityLabel).toBe('800 m³/h');
  });

  it('从 properties.extra 读取图片与维护记录，并过滤非法记录', () => {
    const { cardInfo } = getNodeDetail(dataset, 'n1')!;
    expect(cardInfo.images).toEqual(['https://example.com/v-001.jpg']);
    expect(cardInfo.maintenance.length).toBe(1);
    expect(cardInfo.maintenance[0]).toEqual({
      date: '2026-03-12',
      type: '例行巡检',
      operator: '张工',
      note: '密封正常',
    });
  });

  it('无 extra 时图片与维护记录为空数组', () => {
    const { cardInfo } = getNodeDetail(dataset, 'n2')!;
    expect(cardInfo.images).toEqual([]);
    expect(cardInfo.maintenance).toEqual([]);
  });
});

describe('getPipeDetail（P-3 设备卡片数据层）', () => {
  it('管段不存在时返回 undefined', () => {
    expect(getPipeDetail(dataset, 'not-exist')).toBeUndefined();
  });

  it('补全端点节点与卡片字段', () => {
    const detail = getPipeDetail(dataset, 'p1')!;
    expect(detail.fromNodeDetail?.id).toBe('n1');
    expect(detail.toNodeDetail?.id).toBe('n2');
    expect(detail.cardInfo.materialLabel).toBe('钢管');
    expect(detail.cardInfo.statusLabel).toBe('正常');
    expect(detail.cardInfo.specLabel).toContain('DN300');
  });

  it('无 geometry 时按端点直线距离估算长度', () => {
    const detail = getPipeDetail(dataset, 'p1')!;
    const straight = polylineLengthM([
      [114.3, 30.5],
      [114.31, 30.51],
    ]);
    expect(detail.lengthM).toBeGreaterThan(0);
    expect(detail.lengthM).toBeCloseTo(straight, 5);
  });

  it('有 geometry 时按折线累加长度（长于直线）', () => {
    const withGeometry: PipelineTopologyDataset = {
      ...dataset,
      pipes: dataset.pipes.map((p) =>
        p.id === 'p1'
          ? {
              ...p,
              geometry: [
                [114.3, 30.5],
                [114.305, 30.51],
                [114.31, 30.51],
              ] as [number, number][],
            }
          : p,
      ),
    };
    const straight = getPipeDetail(dataset, 'p1')!.lengthM;
    const bent = getPipeDetail(withGeometry, 'p1')!.lengthM;
    expect(bent).toBeGreaterThan(straight);
  });
});

describe('polylineLengthM', () => {
  it('少于两个点时返回 0', () => {
    expect(polylineLengthM(undefined)).toBe(0);
    expect(polylineLengthM([[114.3, 30.5]])).toBe(0);
  });
});
