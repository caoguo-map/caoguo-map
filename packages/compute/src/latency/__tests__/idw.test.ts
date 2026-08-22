import { describe, it, expect } from 'vitest';
import {
  idwGrid,
  latencyIsoFeatureCollection,
  levelOfLatency,
  anchorBounds,
  LATENCY_LEVEL_THRESHOLDS,
  type IdwAnchor,
} from '../idw';

describe('idw T7（LM-1 延迟等值线支撑）', () => {
  it('levelOfLatency 按阈值分级（10/30/60）', () => {
    expect(levelOfLatency(5)).toBe('excellent');
    expect(levelOfLatency(10)).toBe('excellent');
    expect(levelOfLatency(20)).toBe('good');
    expect(levelOfLatency(30)).toBe('good');
    expect(levelOfLatency(50)).toBe('fair');
    expect(levelOfLatency(60)).toBe('fair');
    expect(levelOfLatency(100)).toBe('poor');
  });

  it('anchorBounds 外扩包围盒（含原点）', () => {
    const b = anchorBounds(
      [
        { lng: 114.3, lat: 30.5, value: 10 },
        { lng: 114.4, lat: 30.6, value: 30 },
      ],
      { lng: 114.35, lat: 30.55 }
    );
    expect(b.minLng).toBeLessThan(114.3);
    expect(b.maxLng).toBeGreaterThan(114.4);
    expect(b.minLat).toBeLessThan(30.5);
    expect(b.maxLat).toBeGreaterThan(30.6);
  });

  it('IDW 在锚点正上方返回该锚点值（epsilon 防除零）', () => {
    const anchors: IdwAnchor[] = [
      { lng: 114.3, lat: 30.5, value: 12 },
      { lng: 114.4, lat: 30.6, value: 40 },
      { lng: 114.2, lat: 30.7, value: 80 },
    ];
    const grid = idwGrid(anchors, { cols: 11, rows: 11 });
    expect(grid.values.length).toBe(11 * 11);
    // 取第一个锚点所在网格（最接近 114.3,30.5）的值应接近 12
    const colAt = Math.round(((114.3 - grid.minLng) / (grid.maxLng - grid.minLng)) * (grid.cols - 1));
    const rowAt = Math.round(((30.5 - grid.minLat) / (grid.maxLat - grid.minLat)) * (grid.rows - 1));
    const idx = rowAt * grid.cols + colAt;
    expect(grid.values[idx]).toBeCloseTo(12, 0);
  });

  it('IDW 单锚点时全场等于该值', () => {
    const grid = idwGrid([{ lng: 114.3, lat: 30.5, value: 25 }], { cols: 5, rows: 5 });
    expect(grid.values.every((v) => Math.abs(v - 25) < 1e-6)).toBe(true);
  });

  it('latencyIsoFeatureCollection 生成 (cols-1)*(rows-1) 个分级多边形，属性含 level', () => {
    const anchors: IdwAnchor[] = [
      { lng: 114.3, lat: 30.5, value: 8 },
      { lng: 114.4, lat: 30.6, value: 55 },
    ];
    const grid = idwGrid(anchors, { cols: 8, rows: 8 });
    const fc = latencyIsoFeatureCollection(grid);
    expect(fc.features.length).toBe((8 - 1) * (8 - 1));
    for (const f of fc.features) {
      expect(['excellent', 'good', 'fair', 'poor']).toContain(f.properties?.level);
      expect(typeof f.properties?.latencyMs).toBe('number');
      // 多边形为闭合 5 点环
      expect((f.geometry.coordinates[0] as number[][]).length).toBe(5);
    }
  });

  it('延迟阈值常量与 levelOfLatency 一致', () => {
    expect(LATENCY_LEVEL_THRESHOLDS).toEqual([10, 30, 60]);
  });
});
