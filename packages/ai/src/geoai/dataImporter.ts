/**
 * GeoAI 数据入图主入口（PRD phase-0 §5.6）
 *
 * 完整管线：
 *   CSV/Excel 表头 → 表头识别 → 逐行地址解析 → 地理编码 / 坐标纠偏 → GeoJSON
 *
 * 用法：
 *   const result = importToGeoJSON(headers, rows);
 *   result.features  // GeoJSON FeatureCollection
 *   result.stats     // 命中率 / 编码耗时等
 */

import type { ParsedAddress } from './addressParser';
import { parseAddress } from './addressParser';
import { detectHeaders, type HeaderDetection } from './headerDetector';
import { batchGeocode } from './geocoder';
import { detectCRS, gcj02ToWgs84 } from './crsDetector';

export interface ImportedFeature {
  type: 'Feature';
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Point'; coordinates: [] };
  properties: Record<string, unknown>;
}

export interface ImportStats {
  /** 总记录数 */
  total: number;
  /** 成功编码数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 成功率 0-1 */
  successRate: number;
  /** 识别出的表头 */
  headers: HeaderDetection;
  /** 编码耗时（ms） */
  durationMs: number;
}

export interface ImportResult {
  type: 'FeatureCollection';
  features: ImportedFeature[];
  stats: ImportStats;
}

export interface ImportOptions {
  /** 数据来源标注（用于坐标系判断，如 '高德'/'GPS'） */
  source?: string;
  /** 自定义地址解析函数（默认内置 parseAddress） */
  parse?: (raw: string) => ParsedAddress;
}

/**
 * 表格式数据 → GeoJSON。
 * @param headers 表头数组
 * @param rows 数据行（二维数组，与 headers 对齐）
 */
export function importToGeoJSON(
  headers: string[],
  rows: Array<Array<string | number>>,
  opts: ImportOptions = {}
): ImportResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const parse = opts.parse ?? parseAddress;

  const det = detectHeaders(headers);
  const { addressCol, nameCol, categoryCol, lngCol, latCol } = det;

  // 抽样已有坐标，判断坐标系
  const samples: Array<[number, number]> = [];
  if (lngCol >= 0 && latCol >= 0) {
    for (const row of rows.slice(0, 50)) {
      const lng = Number(row[lngCol]);
      const lat = Number(row[latCol]);
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) samples.push([lng, lat]);
    }
  }
  const crs = detectCRS(opts.source, samples);

  // 批量编码
  const geocodeInput = rows.map((row) => ({
    address: String(row[addressCol] ?? ''),
    lng: lngCol >= 0 ? Number(row[lngCol]) : undefined,
    lat: latCol >= 0 ? Number(row[latCol]) : undefined,
  }));
  const coded = batchGeocode(geocodeInput, parse);

  // 组装 GeoJSON
  const features: ImportedFeature[] = rows.map((row, i) => {
    const c = coded[i];
    let lng = c.lng;
    let lat = c.lat;
    // 坐标系纠偏：GCJ-02 → WGS84
    if (c.source !== 'failed' && crs === 'gcj02') {
      [lng, lat] = gcj02ToWgs84(lng, lat);
    }

    const properties: Record<string, unknown> = {};
    if (nameCol >= 0) properties.name = row[nameCol];
    if (categoryCol >= 0) properties.category = row[categoryCol];
    // 保留原始地址与匹配信息
    if (addressCol >= 0) properties.address = row[addressCol];
    if (c.matched) properties.matchedPlace = c.matched;

    const geometry: ImportedFeature['geometry'] =
      c.source !== 'failed'
        ? { type: 'Point', coordinates: [lng, lat] }
        : { type: 'Point', coordinates: [] };

    return { type: 'Feature', geometry, properties };
  });

  const success = coded.filter((c) => c.source !== 'failed').length;
  const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;

  return {
    type: 'FeatureCollection',
    features,
    stats: {
      total: rows.length,
      success,
      failed: rows.length - success,
      successRate: rows.length > 0 ? success / rows.length : 0,
      headers: det,
      durationMs,
    },
  };
}
