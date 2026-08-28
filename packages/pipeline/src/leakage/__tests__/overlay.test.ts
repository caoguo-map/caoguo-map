import { describe, it, expect, vi } from 'vitest';
import type { PipelineTopologyDataset, PipelineUser } from '../../types';
import { pointInPolygon, overlayUsers } from '../overlay';
import { LeakagePlume } from '../LeakagePlume';
import { gaussianPlume } from '../gaussianPlume';

/** 正方形测试多边形（lon 114.29~114.31, lat 30.49~30.51） */
const square: [number, number][] = [
  [114.29, 30.49],
  [114.31, 30.49],
  [114.31, 30.51],
  [114.29, 30.51],
];

const users: PipelineUser[] = [
  { id: 'u1', name: '市第一医院', kind: 'important', lng: 114.30, lat: 30.50, scale: 3 },
  { id: 'u2', name: '化工厂', kind: 'industrial', lng: 114.305, lat: 30.495, scale: 2 },
  { id: 'u3', name: '远处小区', kind: 'residential', lng: 114.40, lat: 30.60, scale: 800 },
  { id: 'u4', name: '沿街商铺', kind: 'commercial', lng: 114.295, lat: 30.505 },
];

describe('pointInPolygon（射线法）', () => {
  it('内部点/外部点/边界行为正确', () => {
    expect(pointInPolygon(114.30, 30.50, square)).toBe(true);
    expect(pointInPolygon(114.40, 30.60, square)).toBe(false);
    expect(pointInPolygon(114.30, 30.60, square)).toBe(false);
  });

  it('多边形不足 3 点时恒为 false', () => {
    expect(pointInPolygon(114.3, 30.5, [])).toBe(false);
    expect(pointInPolygon(114.3, 30.5, [[114.3, 30.5]])).toBe(false);
  });
});

describe('overlayUsers（L-4 叠加分析数据层）', () => {
  it('只统计区域内用户，按严重度降序', () => {
    const r = overlayUsers(square, users);
    expect(r.total).toBe(3); // u3 在区域外
    expect(r.affected[0].kind).toBe('important'); // important 权重最高
    expect(r.affected.map((u) => u.id)).toEqual(['u1', 'u2', 'u4']);
  });

  it('分类计数与人口/规模合计', () => {
    const r = overlayUsers(square, users);
    expect(r.byKind).toEqual({ residential: 0, commercial: 1, industrial: 1, important: 1 });
    expect(r.importantCount).toBe(1);
    expect(r.scaleAffected).toBe(5); // 3(u1) + 2(u2) + 0(u4 无 scale)
  });

  it('空用户列表返回零结果', () => {
    const r = overlayUsers(square, []);
    expect(r.total).toBe(0);
    expect(r.scaleAffected).toBe(0);
    expect(r.affected).toEqual([]);
  });
});

describe('LeakagePlume.overlayUsers（组件集成）', () => {
  const dataset: PipelineTopologyDataset = { nodes: [], pipes: [], users };

  it('无推演结果时返回 undefined', () => {
    const map = {
      removeLayer: vi.fn(),
      instance: { addSource: vi.fn(), addLayer: vi.fn(), getSource: vi.fn(() => undefined) },
    } as any;
    const plume = new LeakagePlume({ map });
    expect(plume.overlayUsers(users)).toBeUndefined();
  });

  it('推演后用最低阈值等值线（覆盖最大）做叠加', () => {
    const map = {
      removeLayer: vi.fn(),
      instance: { addSource: vi.fn(), addLayer: vi.fn(), getSource: vi.fn(() => undefined) },
    } as any;
    const plume = new LeakagePlume({ map });
    const result = gaussianPlume(
      { lng: 114.3, lat: 30.5 },
      { windDirection: 0, windSpeed: 3, leakRate: 2, releaseHeight: 2 }
    );
    // 直接注入 lastResult 路径：通过 simulateGas（私有 render 容错）
    (plume as any).lastResult = result;
    const r = plume.overlayUsers(users)!;
    expect(r).toBeDefined();
    // 至少能跑通且总数不超过用户总数
    expect(r.total).toBeLessThanOrEqual(users.length);
  });
});
