import { describe, it, expect, vi } from 'vitest';
import { CapacityHeatmap } from '../CapacityHeatmap';
import { capacityAlerts } from '../capacityCore';
import type { BaseStation, TelecomTopologyDataset } from '../../types';

const dataset: TelecomTopologyDataset = {
  baseStations: [
    { id: 's1', type: 'macro', lng: 116, lat: 39, carrier: '中国移动', properties: { capacityMbps: 1000, throughputMbps: 960 } },
    { id: 's2', type: 'macro', lng: 117, lat: 40, carrier: '中国联通', properties: { capacityMbps: 1000, throughputMbps: 500 } },
  ],
  coverageAreas: [],
};

function makeMap() {
  const mlMap = {
    addSource: vi.fn(),
    getSource: vi.fn(() => null),
    addLayer: vi.fn(),
    setPaintProperty: vi.fn(),
    on: vi.fn(),
  };
  return { map: { instance: mlMap, removeLayer: vi.fn() } as never, mlMap };
}

describe('CapacityHeatmap.renderAlerts (CH-3 地图高亮)', () => {
  it('利用率超阈值时渲染预警点层', () => {
    const alerts = capacityAlerts(dataset.baseStations, 0.8);
    expect(alerts.length).toBeGreaterThan(0);

    const { map, mlMap } = makeMap();
    const ch = new CapacityHeatmap({ map, dataset });
    ch.render('utilization');
    ch.renderAlerts(0.8);

    const added = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { id: string }).id
    );
    expect(added).toContain('cg-capacity-alert-pt');
    ch.destroy();
  });

  it('无预警时不渲染预警层', () => {
    const { map, mlMap } = makeMap();
    const ch = new CapacityHeatmap({ map, dataset });
    ch.render('utilization');
    ch.renderAlerts(0.99); // 阈值极高、无预警

    const added = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { id: string }).id
    );
    expect(added).not.toContain('cg-capacity-alert-pt');
    ch.destroy();
  });
});
