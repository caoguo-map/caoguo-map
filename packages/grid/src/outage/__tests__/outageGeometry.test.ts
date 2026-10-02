import { describe, it, expect } from 'vitest';
import { convexHull, centroid, gridUserSeverity } from '../outageCore';

/**
 * O-2 受影响区域几何 + O-4 重要用户严重度（QA 审计 P0）。
 * 此前三者零测试：convexHull/centroid 是「受影响区域多边形」的唯一实现，
 * gridUserSeverity 是 PRD「重要用户识别 100%」验收的实现载体。
 */

describe('convexHull（O-2 受影响区域凸包）', () => {
  it('退化输入：空 / 单点 / 两点 / 全共线', () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([[1, 1]])).toEqual([[1, 1]]);
    expect(convexHull([[0, 0], [2, 2]])).toEqual([[0, 0], [2, 2]]);
    // 三点共线 → 凸包退化为线段端点
    const colinear = convexHull([[0, 0], [1, 1], [2, 2]]);
    expect(colinear.length).toBeLessThanOrEqual(2);
  });

  it('正方形 + 内部点：内部点不在凸包上', () => {
    const pts: Array<[number, number]> = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [2, 2], // 内部点
    ];
    const hull = convexHull(pts);
    expect(hull).not.toContainEqual([2, 2]);
    // 凸包覆盖四个角点
    for (const corner of [[0, 0], [4, 0], [4, 4], [0, 4]]) {
      expect(hull).toContainEqual(corner);
    }
  });

  it('输入数组不被修改（纯函数）', () => {
    const pts: Array<[number, number]> = [[3, 1], [1, 3], [2, 2], [0, 0]];
    const snapshot = JSON.stringify(pts);
    convexHull(pts);
    expect(JSON.stringify(pts)).toBe(snapshot);
  });
});

describe('centroid（O-2 质心定位）', () => {
  it('空点集 → (0,0)，不抛错', () => {
    expect(centroid([])).toEqual([0, 0]);
  });

  it('多点取算术平均', () => {
    expect(centroid([[0, 0], [2, 0], [2, 2], [0, 2]])).toEqual([1, 1]);
  });

  it('单点 → 自身', () => {
    expect(centroid([[114.3, 30.5]])).toEqual([114.3, 30.5]);
  });
});

describe('gridUserSeverity（O-4 重要用户优先级）', () => {
  it('四类用户分值严格递减：important > industrial > commercial > residential', () => {
    const important = gridUserSeverity('important');
    const industrial = gridUserSeverity('industrial');
    const commercial = gridUserSeverity('commercial');
    const residential = gridUserSeverity('residential');
    expect(important).toBeGreaterThan(industrial);
    expect(industrial).toBeGreaterThan(commercial);
    expect(commercial).toBeGreaterThan(residential);
    // PRD：医院/学校（important）必须排在最前
    expect(important).toBe(100);
  });

  it('排序场景：按分值降序后 important 居首', () => {
    const users = [
      { id: 'r', kind: 'residential' as const },
      { id: 'i', kind: 'important' as const },
      { id: 'c', kind: 'commercial' as const },
    ];
    const sorted = [...users].sort((a, b) => gridUserSeverity(b.kind) - gridUserSeverity(a.kind));
    expect(sorted[0].id).toBe('i');
  });
});
