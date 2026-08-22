import { describe, it, expect, vi } from 'vitest';
import { CellCoverage } from '../CellCoverage';
import { detectCoverageGaps } from '../coverageCore';
import type { TelecomTopologyDataset } from '../../types';

const dataset: TelecomTopologyDataset = {
  baseStations: [
    {
      id: 's1',
      type: 'macro',
      lng: 116,
      lat: 39,
      carrier: '中国移动',
      properties: { azimuth: [0, 120, 240], capacityMbps: 1000, throughputMbps: 950 },
    },
    {
      id: 's2',
      type: 'macro',
      lng: 117,
      lat: 40,
      carrier: '中国联通',
      properties: { azimuth: [60], status: 'online' },
    },
  ],
  coverageAreas: [
    {
      stationId: 's1',
      geom: [
        [115.9, 38.9],
        [116.1, 38.9],
        [116.1, 39.1],
        [115.9, 39.1],
        [115.9, 38.9],
      ],
      signalLevel: 'good',
    },
  ],
  // 路测采样：s2 远处一点（116.5,39.5）无覆盖 → 盲区
  signalSamples: [
    { lng: 116.05, lat: 39.05, rsrp: -80 },
    { lng: 116.5, lat: 39.5, rsrp: -110 },
  ],
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

describe('CellCoverage.render (CC-5 扇区可视化)', () => {
  it('基站含方位角时渲染扇区 fill + line 层', () => {
    const { map, mlMap } = makeMap();
    const cc = new CellCoverage({ map, dataset });
    cc.render();

    const added = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { id: string }).id
    );
    expect(added).toContain('cg-cell-sector-fill');
    expect(added).toContain('cg-cell-sector-line');
    // 扇区 source 基于方位角扇区生成
    expect(mlMap.addSource).toHaveBeenCalled();
    cc.destroy();
  });
});

describe('CellCoverage.renderCoverageGaps (CC-4 盲区识别)', () => {
  it('存在盲区时渲染盲区点层', () => {
    const gaps = detectCoverageGaps(dataset.signalSamples ?? [], dataset.coverageAreas);
    // 数据集覆盖有限，必有盲区（none 或 weak）
    expect(gaps.length).toBeGreaterThan(0);

    const { map, mlMap } = makeMap();
    const cc = new CellCoverage({ map, dataset });
    cc.render();
    cc.renderCoverageGaps(gaps);

    const added = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { id: string }).id
    );
    expect(added).toContain('cg-cell-gap-pt');
    cc.destroy();
  });

  it('无盲区时不渲染', () => {
    const { map, mlMap } = makeMap();
    const cc = new CellCoverage({ map, dataset });
    cc.render();
    // 传入空盲区列表
    cc.renderCoverageGaps([]);
    const added = (mlMap.addLayer as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { id: string }).id
    );
    expect(added).not.toContain('cg-cell-gap-pt');
    cc.destroy();
  });
});
