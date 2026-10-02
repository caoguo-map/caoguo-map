import { describe, it, expect } from 'vitest';
import { pointInPolygon, pointInPolygonXY } from '../geometry';

/** 正方形（lng 114.29~114.31, lat 30.49~30.51） */
const square: [number, number][] = [
  [114.29, 30.49],
  [114.31, 30.49],
  [114.31, 30.51],
  [114.29, 30.51],
];

/** 凹多边形（L 形），用于验证射线法对非凸形状同样成立 */
const lShape: [number, number][] = [
  [0, 0],
  [2, 0],
  [2, 1],
  [1, 1],
  [1, 2],
  [0, 2],
];

describe('通用几何工具 geometry', () => {
  it('点在多边形内 / 外', () => {
    expect(pointInPolygon(114.3, 30.5, square)).toBe(true);
    expect(pointInPolygon(115.0, 31.0, square)).toBe(false);
  });

  it('点在外接矩形内但在凹形缺口处 → 判定为外', () => {
    // (1.5, 1.5) 落在 L 形的缺口内（外接矩形之内、多边形之外）
    expect(pointInPolygon(1.5, 1.5, lShape)).toBe(false);
    expect(pointInPolygon(0.5, 0.5, lShape)).toBe(true);
  });

  it('退化多边形（< 3 点）一律返回 false —— 统一守卫', () => {
    expect(pointInPolygon(0, 0, [])).toBe(false);
    expect(pointInPolygon(0, 0, [[0, 0]])).toBe(false);
    // 原 telecom / 水网 floodCore 缺此守卫，2 点「多边形」可能误判
    expect(pointInPolygon(0.5, 0.5, [[0, 0], [1, 1]])).toBe(false);
  });

  it('多边形无需预先闭合', () => {
    const open: [number, number][] = [[114.29, 30.49], [114.31, 30.49], [114.31, 30.51], [114.29, 30.51]];
    expect(pointInPolygon(114.3, 30.5, open)).toBe(true);
  });

  it('pointInPolygonXY 为数组点便捷重载，与三参版一致', () => {
    expect(pointInPolygonXY([114.3, 30.5], square)).toBe(pointInPolygon(114.3, 30.5, square));
    expect(pointInPolygonXY([115, 31], square)).toBe(false);
  });
});
