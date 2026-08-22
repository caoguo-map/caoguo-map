import { describe, it, expect, vi } from 'vitest';
import { DamRender, getGateDetail, paintGateByStatus } from '../DamRender';
import type { WaterDataset, WaterFeature } from '../../types';

const gates: WaterFeature[] = [
  {
    id: 'g1',
    kind: 'gate',
    name: '一号闸',
    lng: 116,
    lat: 39,
    properties: { gateType: 'sluice', gateStatus: 'open', dischargeCapacity: 120 },
  },
  {
    id: 'g2',
    kind: 'gate',
    lng: 117,
    lat: 40,
    properties: { gateStatus: 'closed' },
  },
];

const dataset: WaterDataset = {
  features: [
    ...gates,
    { id: 'r1', kind: 'reservoir', lng: 118, lat: 41 },
  ],
};

describe('DamRender (R-3 闸站控制面板)', () => {
  it('只渲染闸站点层，按启闭状态着色，点击触发选中', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      setData: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      on: (_t: string, _l: string, h: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void) =>
        h({ features: [{ properties: { gateId: 'g1' } }] }),
    };
    const map = { instance: mlMap, removeLayer: mlMap.removeLayer } as never;
    let selected: string | null = null;
    const dam = new DamRender({
      map,
      dataset,
      onGateSelect: (f) => {
        selected = f.id;
      },
    });

    dam.render();
    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();
    // 仅 2 个闸站被渲染（reservoir 被过滤）
    const injected = (mlMap.addSource as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      features: unknown[];
    };
    expect(injected.features.length).toBe(2);
    expect(selected).toBe('g1');

    dam.clear();
    expect(mlMap.removeLayer).toHaveBeenCalled();
  });

  it('getGateDetail 提取闸站详情', () => {
    expect(getGateDetail(gates[0])).toEqual({
      id: 'g1',
      name: '一号闸',
      type: 'sluice',
      status: 'open',
      dischargeCapacity: 120,
    });
  });

  it('paintGateByStatus 对三种状态返回对应颜色', () => {
    const rule = paintGateByStatus() as unknown[];
    expect(rule).toContain('open');
    expect(rule).toContain('closed');
    expect(rule).toContain('partial');
  });
});
