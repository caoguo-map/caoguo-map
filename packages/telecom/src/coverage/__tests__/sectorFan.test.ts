import { describe, it, expect } from 'vitest';
import {
  sectorFanPolygon,
  buildSectorFans,
} from '../coverageCore';
import type { BaseStation } from '../../types';

describe('CC-5 扇区扇形 polygon (sectorFanPolygon)', () => {
  it('生成以基站为顶点的闭合扇形环', () => {
    const center: [number, number] = [116.39, 39.9];
    const ring = sectorFanPolygon(center, 0, 60, 1000);
    // 首位都是中心点，构成闭合多边形
    expect(ring[0]).toEqual(center);
    // 至少有 [中心 + 25 段弧] 个点
    expect(ring.length).toBeGreaterThan(20);
    // 所有点 lng/lat 均为有限数
    for (const [lng, lat] of ring) {
      expect(Number.isFinite(lng)).toBe(true);
      expect(Number.isFinite(lat)).toBe(true);
    }
  });

  it('不同方位角生成不同顶点', () => {
    const c: [number, number] = [116.39, 39.9];
    const east = sectorFanPolygon(c, 90, 60, 1000);
    const north = sectorFanPolygon(c, 0, 60, 1000);
    expect(east[east.length - 1]).not.toEqual(north[north.length - 1]);
  });
});

describe('buildSectorFans', () => {
  const station: BaseStation = {
    id: 's1',
    type: 'macro',
    lng: 116.39,
    lat: 39.9,
    carrier: '中国移动',
    properties: { azimuth: [0, 120, 240] },
  };

  it('按方位角数组生成对应数量扇区', () => {
    const fans = buildSectorFans(station);
    expect(fans).toHaveLength(3);
    expect(fans[0].sectorId).toBe('s1-s0');
    expect(fans[0].azimuth).toBe(0);
    expect(fans[0].polygon[0]).toEqual([116.39, 39.9]);
  });

  it('无方位角时返回空数组', () => {
    const noAz: BaseStation = { ...station, properties: {} };
    expect(buildSectorFans(noAz)).toEqual([]);
  });
});
