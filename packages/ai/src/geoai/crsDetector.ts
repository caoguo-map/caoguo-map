/**
 * GeoAI 坐标系判断（PRD phase-0 §5.6 G-3）
 *
 * 判断数据坐标所属坐标系：WGS84 / GCJ-02 / CGCS2000。
 *
 * 说明：单点无法 100% 判定坐标系（GCJ-02 偏移仅数百米），
 * 本模块采用「范围校验 + 数据来源推断 + 中国境外判定」的组合启发式，
 * 并提供 GCJ-02 ↔ WGS84 双向纠偏转换。
 */

export type DetectedCRS = 'wgs84' | 'gcj02' | 'cgcs2000' | 'unknown';

/** 中国经纬度范围（粗判） */
export const CHINA_BOUNDS = {
  lngMin: 73,
  lngMax: 135,
  latMin: 18,
  latMax: 54,
};

/** GCJ-02 → WGS84 纠偏常量 */
const A = 6378245.0;
const EE = 0.00669342162296594323;

function outOfChina(lng: number, lat: number): boolean {
  return lng < CHINA_BOUNDS.lngMin || lng > CHINA_BOUNDS.lngMax || lat < CHINA_BOUNDS.latMin || lat > CHINA_BOUNDS.latMax;
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

/** WGS84 → GCJ-02（加密偏移） */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [lng + dLng, lat + dLat];
}

/** GCJ-02 → WGS84（纠偏，迭代逼近） */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  let [wgsLng, wgsLat] = [lng, lat];
  for (let i = 0; i < 5; i++) {
    const [gLng, gLat] = wgs84ToGcj02(wgsLng, wgsLat);
    const dLng = gLng - lng;
    const dLat = gLat - lat;
    wgsLng -= dLng;
    wgsLat -= dLat;
  }
  return [wgsLng, wgsLat];
}

/** 坐标是否在中国境内 */
export function isInChina(lng: number, lat: number): boolean {
  return !outOfChina(lng, lat);
}

/**
 * 判断坐标系。
 * @param source 数据来源标注（如 '高德' / '腾讯' / '天地图' / 'GPS' / undefined）
 * @param sample 抽样坐标对
 */
export function detectCRS(
  source: string | undefined,
  sample: Array<[number, number]> = []
): DetectedCRS {
  // 1) 来源推断优先
  const s = (source ?? '').toLowerCase();
  if (/(高德|腾讯|amap|qqmap|gcj|火星)/.test(s)) return 'gcj02';
  if (/(天地图|tianditu|cgcs|2000)/.test(s)) return 'cgcs2000';
  if (/(gps|wgs84|84)/.test(s)) return 'wgs84';

  // 2) 坐标范围粗判
  if (sample.length > 0) {
    let inChinaCount = 0;
    let inChina = false;
    for (const [lng, lat] of sample) {
      if (isInChina(lng, lat)) {
        inChinaCount++;
        inChina = true;
      }
    }
    // 多数坐标在中国境外 → 判定为 WGS84（GCJ 只对境内加密）
    if (sample.length > 0 && inChinaCount / sample.length < 0.5) return 'wgs84';
    void inChina;
  }

  // 3) 无来源标注且无法判定 → 默认 WGS84（保守，避免二次纠偏）
  return 'wgs84';
}
