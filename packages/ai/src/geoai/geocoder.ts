/**
 * GeoAI 批量地理编码（PRD phase-0 §5.6 G-4）
 *
 * 将解析后的中文地址编码为坐标 [lng, lat]。
 * v1 使用「本地坐标库 + 模糊匹配」（离线、不依赖天地图/高德 API），
 * 命中率目标：标准地址 ≥ 90%，口语化地址 ≥ 60%。
 */

import type { ParsedAddress } from './addressParser';

/** 本地地理坐标库：地名 → [lng, lat]（WGS84） */
export const LOCAL_GEO_DB: Record<string, [number, number]> = {
  // 主要城市
  武汉: [114.305, 30.593],
  北京: [116.407, 39.904],
  上海: [121.474, 31.23],
  广州: [113.264, 23.129],
  深圳: [114.058, 22.543],
  成都: [104.067, 30.573],
  杭州: [120.155, 30.274],
  南京: [118.796, 32.06],
  重庆: [106.551, 29.563],
  西安: [108.94, 34.341],
  天津: [117.2, 39.084],

  // 武汉各区
  江岸区: [114.31, 30.6],
  江汉区: [114.27, 30.6],
  硚口区: [114.21, 30.58],
  汉阳区: [114.22, 30.55],
  武昌区: [114.32, 30.55],
  青山区: [114.39, 30.63],
  洪山区: [114.34, 30.5],
  东西湖区: [114.14, 30.62],
  汉南区: [114.08, 30.31],
  蔡甸区: [114.03, 30.58],
  江夏区: [114.32, 30.35],
  黄陂区: [114.38, 30.88],
  新洲区: [114.8, 30.85],

  // 常见 POI（口语化地址兜底）
  光谷: [114.428, 30.507],
  光谷广场: [114.4, 30.507],
  汉口火车站: [114.255, 30.618],
  武昌火车站: [114.317, 30.531],
  武汉站: [114.424, 30.607],
  天河机场: [114.208, 30.774],
  武汉大学: [114.362, 30.541],
  华中科技大学: [114.418, 30.513],
  黄鹤楼: [114.302, 30.544],
  东湖: [114.4, 30.55],
  长江大桥: [114.294, 30.55],
  江汉路: [114.278, 30.581],
  楚河汉街: [114.337, 30.561],
  街道口: [114.351, 30.531],
  中南路: [114.331, 30.539],
  徐东: [114.348, 30.583],
  王家湾: [114.204, 30.557],
  钟家村: [114.246, 30.549],
  汉正街: [114.272, 30.573],
  软件园: [114.4, 30.47],
  金融港: [114.42, 30.47],
  生物城: [114.48, 30.49],
  未来科技城: [114.47, 30.44],
};

export interface GeocodeResult {
  lng: number;
  lat: number;
  /** 匹配到的地名 */
  matched: string;
  /** 置信度 0-1 */
  confidence: number;
}

/**
 * 地理编码：地址 → 坐标。
 *
 * 匹配优先级：
 *  1. POI（最精确）
 *  2. 区/县
 *  3. 城市
 *  4. 省（降级）
 *
 * 无法匹配返回 null。
 */
export function geocode(parsed: ParsedAddress): GeocodeResult | null {
  // 1) POI
  if (parsed.poi && LOCAL_GEO_DB[parsed.poi]) {
    const c = LOCAL_GEO_DB[parsed.poi];
    return { lng: c[0], lat: c[1], matched: parsed.poi, confidence: 0.95 };
  }

  // 2) 区/县
  if (parsed.district && LOCAL_GEO_DB[parsed.district]) {
    const c = LOCAL_GEO_DB[parsed.district];
    return { lng: c[0], lat: c[1], matched: parsed.district, confidence: 0.8 };
  }

  // 3) 城市
  if (parsed.city && LOCAL_GEO_DB[parsed.city]) {
    const c = LOCAL_GEO_DB[parsed.city];
    return { lng: c[0], lat: c[1], matched: parsed.city, confidence: 0.6 };
  }

  // 4) 省（直辖市/省会）
  if (parsed.province && LOCAL_GEO_DB[parsed.province]) {
    const c = LOCAL_GEO_DB[parsed.province];
    return { lng: c[0], lat: c[1], matched: parsed.province, confidence: 0.4 };
  }

  return null;
}

/** 查询本地库是否存在某地名 */
export function hasLocalGeo(name: string): boolean {
  return name in LOCAL_GEO_DB;
}

export interface BatchGeocodeInput {
  /** 原始地址字符串 */
  address: string;
  /** 已有经度（可选，优先级最高） */
  lng?: number;
  /** 已有纬度（可选） */
  lat?: number;
}

export interface BatchGeocodeOutput {
  lng: number;
  lat: number;
  /** 坐标来源：'provided' | 'geocoded' | 'failed' */
  source: 'provided' | 'geocoded' | 'failed';
  matched?: string;
  confidence: number;
}

/**
 * 批量地理编码：对一批记录并行编码。
 *
 * 优先级：已有经纬度 > 地址解析 + 本地库编码。
 */
export function batchGeocode(
  rows: BatchGeocodeInput[],
  parse: (raw: string) => ParsedAddress
): BatchGeocodeOutput[] {
  return rows.map((row) => {
    // 已有经纬度直接使用
    if (typeof row.lng === 'number' && typeof row.lat === 'number' && !Number.isNaN(row.lng) && !Number.isNaN(row.lat)) {
      return { lng: row.lng, lat: row.lat, source: 'provided', confidence: 1 };
    }
    // 地址解析 + 编码
    const parsed = parse(row.address);
    const geo = geocode(parsed);
    if (geo) {
      return { lng: geo.lng, lat: geo.lat, source: 'geocoded', matched: geo.matched, confidence: geo.confidence };
    }
    return { lng: 0, lat: 0, source: 'failed', confidence: 0 };
  });
}
