import { describe, it, expect } from 'vitest';
import { parseAddress, isValidAddress } from '../addressParser';
import { detectHeaders } from '../headerDetector';
import { detectCRS, wgs84ToGcj02, gcj02ToWgs84, isInChina } from '../crsDetector';
import { geocode, hasLocalGeo } from '../geocoder';
import { importToGeoJSON } from '../dataImporter';

describe('GeoAI 地址解析', () => {
  it('解析完整地址', () => {
    const r = parseAddress('湖北省武汉市洪山区光谷大道 1 号');
    expect(r.province).toBe('湖北');
    expect(r.city).toBe('武汉');
    expect(r.district).toBe('洪山区');
    expect(r.number).toBe('1');
  });

  it('解析口语化地址（POI）', () => {
    const r = parseAddress('光谷那边');
    expect(r.poi).toBe('光谷');
    expect(isValidAddress(r)).toBe(true);
  });

  it('解析简称地址', () => {
    const r = parseAddress('武汉江汉区');
    expect(r.city).toBe('武汉');
    expect(r.district).toBe('江汉区');
  });

  it('空地址返回低置信度', () => {
    const r = parseAddress('');
    expect(r.confidence).toBe(0);
    expect(isValidAddress(r)).toBe(false);
  });
});

describe('GeoAI 表头识别', () => {
  it('识别标准表头', () => {
    const r = detectHeaders(['名称', '地址', '类型', '经度', '纬度']);
    expect(r.nameCol).toBe(0);
    expect(r.addressCol).toBe(1);
    expect(r.categoryCol).toBe(2);
    expect(r.lngCol).toBe(3);
    expect(r.latCol).toBe(4);
  });

  it('识别英文表头', () => {
    const r = detectHeaders(['name', 'address', 'lng', 'lat']);
    expect(r.nameCol).toBe(0);
    expect(r.addressCol).toBe(1);
    expect(r.lngCol).toBe(2);
    expect(r.latCol).toBe(3);
  });

  it('无匹配返回 -1', () => {
    const r = detectHeaders(['foo', 'bar']);
    expect(r.addressCol).toBe(-1);
    expect(r.lngCol).toBe(-1);
  });
});

describe('GeoAI 坐标系判断', () => {
  it('来源标注推断', () => {
    expect(detectCRS('高德')).toBe('gcj02');
    expect(detectCRS('天地图')).toBe('cgcs2000');
    expect(detectCRS('GPS')).toBe('wgs84');
  });

  it('境内坐标判断', () => {
    expect(isInChina(114.305, 30.593)).toBe(true);
    expect(isInChina(-122.4, 37.7)).toBe(false);
  });

  it('GCJ-02 ↔ WGS84 往返误差小', () => {
    const [lng, lat] = [114.305, 30.593];
    const gcj = wgs84ToGcj02(lng, lat);
    const back = gcj02ToWgs84(gcj[0], gcj[1]);
    expect(Math.abs(back[0] - lng)).toBeLessThan(0.0001);
    expect(Math.abs(back[1] - lat)).toBeLessThan(0.0001);
  });

  it('境外坐标不加密', () => {
    const [lng, lat] = [-122.4, 37.7];
    const gcj = wgs84ToGcj02(lng, lat);
    expect(gcj[0]).toBe(lng);
    expect(gcj[1]).toBe(lat);
  });
});

describe('GeoAI 地理编码', () => {
  it('POI 编码', () => {
    const r = geocode(parseAddress('光谷'));
    expect(r).not.toBeNull();
    expect(r!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('区编码', () => {
    const r = geocode(parseAddress('武汉洪山区'));
    expect(r).not.toBeNull();
    expect(r!.matched).toBe('洪山区');
  });

  it('未知地址返回 null', () => {
    expect(geocode(parseAddress('某某某某某'))).toBeNull();
  });

  it('本地库包含武汉', () => {
    expect(hasLocalGeo('武汉')).toBe(true);
  });
});

describe('GeoAI 数据导入端到端', () => {
  it('导入含地址列的数据', () => {
    const headers = ['名称', '地址', '类型'];
    const rows = [
      ['网点A', '武汉光谷', '商业'],
      ['网点B', '武汉江汉区', '政务'],
      ['网点C', '不存在的地址', '未知'],
    ];
    const r = importToGeoJSON(headers, rows);
    expect(r.type).toBe('FeatureCollection');
    expect(r.features.length).toBe(3);
    expect(r.stats.success).toBe(2);
    expect(r.stats.failed).toBe(1);
    expect(r.stats.successRate).toBeCloseTo(2 / 3);
  });

  it('导入含经纬度列的数据（跳过编码）', () => {
    const headers = ['名称', '经度', '纬度'];
    const rows = [
      ['点1', 114.305, 30.593],
      ['点2', 116.407, 39.904],
    ];
    const r = importToGeoJSON(headers, rows);
    expect(r.stats.success).toBe(2);
    expect(r.features[0].geometry.coordinates).toEqual([114.305, 30.593]);
  });

  it('GCJ-02 来源自动纠偏', () => {
    const headers = ['名称', '经度', '纬度'];
    const rows = [['点1', 114.305, 30.593]];
    const r = importToGeoJSON(headers, rows, { source: '高德' });
    // 纠偏后坐标应略偏离原始 GCJ-02 坐标
    expect(r.features[0].geometry.coordinates[0]).not.toBe(114.305);
  });
});
