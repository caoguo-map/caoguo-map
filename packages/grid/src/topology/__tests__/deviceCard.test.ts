import { describe, it, expect } from 'vitest';
import { GridTopology } from '../GridTopology';
import type { GridTopologyDataset } from '../../types';

/** 最小 mock map（getDeviceDetail 为纯数据层，不触发渲染） */
function makeMap() {
  const instance = {
    addSource() {},
    getSource() {
      return undefined;
    },
    addLayer() {},
    removeLayer() {},
    setPaintProperty() {},
  };
  return { removeLayer() {}, setPaintProperty() {}, instance } as never;
}

const dataset: GridTopologyDataset = {
  devices: [
    {
      id: 'd1',
      kind: 'substation',
      lng: 114.31,
      lat: 30.51,
      name: '关山变电站',
      properties: {
        voltage: '500',
        code: 'SS-001',
        capacity: 750,
        status: 'running',
        extra: {
          images: ['https://example.com/ss-001.jpg'],
          maintenance: [
            { date: '2026-03-12', type: '例行巡检', operator: '张工', note: '设备正常' },
            { date: 'bad-record' }, // 非法记录，应被过滤
          ],
        },
      },
    },
    {
      id: 'd2',
      kind: 'transformer',
      lng: 114.32,
      lat: 30.52,
      name: '配变 A01',
      properties: { voltage: '10', code: 'TT-009', capacity: 20 },
    },
  ],
  lines: [
    { id: 'l1', fromDevice: 'd1', toDevice: 'd2', lineType: 'distribution', properties: {} },
  ],
};

describe('getDeviceDetail 卡片附加字段（G-2 图片与维护记录）', () => {
  it('从 properties.extra 读取图片与维护记录，并过滤非法记录', () => {
    const topo = new GridTopology({ map: makeMap(), dataset, layerPrefix: 'g' });
    const d = topo.getDeviceDetail('d1')!;
    expect(d.cardInfo.images).toEqual(['https://example.com/ss-001.jpg']);
    expect(d.cardInfo.maintenance.length).toBe(1);
    expect(d.cardInfo.maintenance[0]).toEqual({
      date: '2026-03-12',
      type: '例行巡检',
      operator: '张工',
      note: '设备正常',
    });
  });

  it('无 extra 时返回空数组（不报错）', () => {
    const topo = new GridTopology({ map: makeMap(), dataset, layerPrefix: 'g' });
    const d = topo.getDeviceDetail('d2')!;
    expect(d.cardInfo.images).toEqual([]);
    expect(d.cardInfo.maintenance).toEqual([]);
  });

  it('基础卡片字段不受影响', () => {
    const topo = new GridTopology({ map: makeMap(), dataset, layerPrefix: 'g' });
    const d = topo.getDeviceDetail('d1')!;
    expect(d.cardInfo.title).toBe('关山变电站');
    expect(d.cardInfo.subtitle).toContain('SS-001');
    expect(d.cardInfo.statusLabel).toBe('运行中');
    expect(d.cardInfo.capacityLabel).toContain('MVA');
  });

  it('设备不存在时返回 undefined', () => {
    const topo = new GridTopology({ map: makeMap(), dataset, layerPrefix: 'g' });
    expect(topo.getDeviceDetail('not-exist')).toBeUndefined();
  });
});
