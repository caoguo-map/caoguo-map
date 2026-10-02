import { describe, it, expect } from 'vitest';
import { batchGeocode } from '../geocoder';
import { parseAddress } from '../addressParser';

/**
 * G-4 批量地理编码的边界覆盖（QA 审计 P0）。
 * 此前 batchGeocode 零测试；重点固化「已有坐标判定」与 failed 分支的 (0,0) 语义。
 */

describe('batchGeocode 边界（P0）', () => {
  it('空 rows → 空输出，不抛错', () => {
    expect(batchGeocode([], parseAddress)).toEqual([]);
  });

  it('已有经纬度优先：source=provided 且 confidence=1', () => {
    const [r] = batchGeocode([{ address: '任意', lng: 114.3, lat: 30.5 }], parseAddress);
    expect(r.source).toBe('provided');
    expect(r.confidence).toBe(1);
    expect(r.lng).toBe(114.3);
    expect(r.lat).toBe(30.5);
  });

  it('缺 lat（只有 lng）不走 provided，回落到地址解析', () => {
    const [r] = batchGeocode([{ address: '湖北省武汉市洪山区', lng: 114.3 }], parseAddress);
    expect(r.source).not.toBe('provided');
  });

  it('NaN 坐标不走 provided（守卫含 isNaN）', () => {
    const [r] = batchGeocode([{ address: '湖北省武汉市', lng: NaN, lat: NaN }], parseAddress);
    expect(r.source).not.toBe('provided');
  });

  it('(0, 0) 是合法数值坐标 → 判为 provided（0 不等于缺失）', () => {
    const [r] = batchGeocode([{ address: 'x', lng: 0, lat: 0 }], parseAddress);
    expect(r.source).toBe('provided');
    expect(r.lng).toBe(0);
    expect(r.lat).toBe(0);
  });

  it('编码失败 → {lng:0, lat:0, source:failed, confidence:0}', () => {
    // 固化契约：failed 分支返回 (0,0) —— 下游【必须】检查 source==='failed'，
    // 否则 (0,0)（几内亚湾）会被当作真实落点画到地图上。
    const [r] = batchGeocode([{ address: '!!!不存在的地址###' }], parseAddress);
    if (r.source === 'failed') {
      expect(r.lng).toBe(0);
      expect(r.lat).toBe(0);
      expect(r.confidence).toBe(0);
    } else {
      // 若本地库命中则必须是合法坐标
      expect(r.source).toBe('geocoded');
      expect(Number.isFinite(r.lng)).toBe(true);
    }
  });

  it('parse 抛异常时向上传播（当前契约：不吞错）', () => {
    const boom = () => {
      throw new Error('parse boom');
    };
    expect(() => batchGeocode([{ address: 'x' }], boom)).toThrow('parse boom');
  });
});
