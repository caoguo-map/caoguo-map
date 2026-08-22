import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CellCoverage } from '../CellCoverage';
import { NetworkHealth } from '../../health/NetworkHealth';
import type { TelecomTopologyDataset } from '../../types';

const dataset: TelecomTopologyDataset = {
  baseStations: [
    {
      id: 's1',
      type: 'macro',
      lng: 116,
      lat: 39,
      carrier: '中国移动',
      properties: { status: 'fault' },
    },
    {
      id: 's2',
      type: 'macro',
      lng: 117,
      lat: 40,
      carrier: '中国联通',
      properties: { status: 'online' },
    },
  ],
  coverageAreas: [],
};

describe('CellCoverage.renderFaultAlerts (NH-2 告警闪烁标记)', () => {
  beforeEach(() => {
    // 用 no-op 桩避免测试期间真实动画循环
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
  });

  it('渲染故障基站为闪烁标记层', () => {
    const health = new NetworkHealth({ dataset });
    expect(health.faultAlerts().length).toBe(1);

    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
      setPaintProperty: vi.fn(),
      on: vi.fn(),
    };
    const map = { instance: mlMap, removeLayer: vi.fn() } as never;
    const cc = new CellCoverage({ map, dataset });

    cc.renderFaultAlerts(health);

    // 故障基站 source 被创建（upsertSource），且闪烁层被添加
    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();

    cc.destroy();
  });
});
