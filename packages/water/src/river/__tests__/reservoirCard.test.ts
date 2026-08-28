import { describe, it, expect } from 'vitest';
import type { WaterDataset } from '../../types';
import { getReservoirDetail, getReservoirDetails, storageLevelOf } from '../reservoirCard';

const dataset: WaterDataset = {
  features: [
    {
      id: 'basin-1',
      kind: 'basin',
      name: '长江中游',
      lng: 114.3,
      lat: 30.5,
    },
    {
      id: 'res-1',
      kind: 'reservoir',
      name: '夏家寺水库',
      parentId: 'basin-1',
      lng: 114.32,
      lat: 30.52,
      properties: {
        code: 'XJS',
        storageRate: 0.68,
        capacity: 12000,
        waterLevel: 168.5,
        warningLevel: 170,
        reservoirStatus: 'storing',
        inflow: 120,
        outflow: 80,
        extra: {
          images: ['https://example.com/res-1.jpg'],
          maintenance: [
            { date: '2026-04-02', type: '除险加固', operator: '李工', note: '坝体防渗' },
            { date: 'bad' }, // 非法记录，应被过滤
          ],
        },
      },
    },
    {
      id: 'res-2',
      kind: 'reservoir',
      name: '梅店水库',
      parentId: 'basin-1',
      lng: 114.35,
      lat: 30.55,
      properties: { storageRate: 0.95, waterLevel: 172, warningLevel: 170 },
    },
    {
      id: 'gate-1',
      kind: 'gate',
      name: '府河闸',
      parentId: 'basin-1',
      lng: 114.31,
      lat: 30.51,
      properties: { gateType: 'floodgate', gateStatus: 'partial', dischargeCapacity: 500 },
    },
    {
      id: 'st-1',
      kind: 'waterStation',
      name: '汉口水位站',
      parentId: 'res-1',
      lng: 114.3,
      lat: 30.5,
      properties: { waterLevel: 27.5, warningLevel: 27.3 },
    },
  ],
};

describe('storageLevelOf（蓄水率分档）', () => {
  it('按阈值分档，与 PRD §4.3.4 蓄泄判定一致', () => {
    expect(storageLevelOf(0.2)).toBe('low');
    expect(storageLevelOf(0.3)).toBe('low');
    expect(storageLevelOf(0.5)).toBe('normal');
    expect(storageLevelOf(0.7)).toBe('high');
    expect(storageLevelOf(0.9)).toBe('full');
    expect(storageLevelOf(1)).toBe('full');
  });
});

describe('getReservoirDetail（R-2 水库卡片数据层）', () => {
  it('要素不存在时返回 undefined', () => {
    expect(getReservoirDetail(dataset, 'not-exist')).toBeUndefined();
  });

  it('卡片字段：标题/编号/类型/蓄泄状态', () => {
    const d = getReservoirDetail(dataset, 'res-1')!;
    expect(d.cardInfo.title).toBe('夏家寺水库');
    expect(d.cardInfo.subtitle).toBe('水库 · XJS');
    expect(d.cardInfo.kindLabel).toBe('水库');
    expect(d.cardInfo.statusLabel).toBe('蓄水中');
  });

  it('蓄水率/库容/水位文案', () => {
    const { cardInfo } = getReservoirDetail(dataset, 'res-1')!;
    expect(cardInfo.storageLabel).toBe('68%');
    expect(cardInfo.capacityLabel).toBe('12,000 万 m³');
    expect(cardInfo.levelLabel).toContain('168.5');
    expect(cardInfo.levelLabel).toContain('170');
  });

  it('未超警戒时 overWarning=false', () => {
    expect(getReservoirDetail(dataset, 'res-1')!.cardInfo.overWarning).toBe(false);
  });

  it('超警戒时 overWarning=true', () => {
    const d = getReservoirDetail(dataset, 'res-2')!;
    expect(d.cardInfo.overWarning).toBe(true);
    expect(d.storageLevel).toBe('full');
  });

  it('无 reservoirStatus 时由蓄水率推断状态文案', () => {
    expect(getReservoirDetail(dataset, 'res-2')!.cardInfo.statusLabel).toBe('接近满库');
  });

  it('闸站：状态取启闭状态，副标题含闸型', () => {
    const d = getReservoirDetail(dataset, 'gate-1')!;
    expect(d.cardInfo.statusLabel).toBe('半开');
    expect(d.cardInfo.subtitle).toContain('防洪闸');
  });

  it('统计上下游与同级数量', () => {
    const res1 = getReservoirDetail(dataset, 'res-1')!;
    expect(res1.upstreamCount).toBe(1); // st-1 的 parentId = res-1
    expect(res1.siblingCount).toBe(1); // 同级水库 res-2

    const basin = getReservoirDetail(dataset, 'basin-1')!;
    expect(basin.upstreamCount).toBe(3); // res-1/res-2/gate-1 的 parentId = basin-1
  });

  it('从 properties.extra 读取图片与维护记录，并过滤非法记录', () => {
    const { cardInfo } = getReservoirDetail(dataset, 'res-1')!;
    expect(cardInfo.images).toEqual(['https://example.com/res-1.jpg']);
    expect(cardInfo.maintenance.length).toBe(1);
    expect(cardInfo.maintenance[0]).toEqual({
      date: '2026-04-02',
      type: '除险加固',
      operator: '李工',
      note: '坝体防渗',
    });
  });

  it('无 extra 时图片与维护记录为空数组', () => {
    const { cardInfo } = getReservoirDetail(dataset, 'res-2')!;
    expect(cardInfo.images).toEqual([]);
    expect(cardInfo.maintenance).toEqual([]);
  });
});

describe('getReservoirDetails（批量）', () => {
  it('默认只提取水库与闸站', () => {
    const list = getReservoirDetails(dataset);
    expect(list.map((d) => d.id)).toEqual(['res-1', 'res-2', 'gate-1']);
  });

  it('可指定类型（含水位站的超警戒筛选场景）', () => {
    const stations = getReservoirDetails(dataset, ['waterStation']);
    expect(stations.length).toBe(1);
    expect(stations[0].cardInfo.overWarning).toBe(true);
  });

  it('空数据集返回空数组', () => {
    expect(getReservoirDetails({ features: [] })).toEqual([]);
  });
});
