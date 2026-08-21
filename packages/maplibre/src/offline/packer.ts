/**
 * 离线瓦片打包器（F-1.4）。
 *
 * 把本地瓦片导入离线存储：
 *  - 原始 {z}/{x}/{y}.pbf|png 目录结构
 *  - 单张 GeoJSON（按 z/x/y 网格切片为矢量瓦片缓冲，供 `caoguo-offline` 协议读取）
 *
 * 这里的「切片」为简化实现：GeoJSON 按瓦片网格空间包含关系分桶，
 * 仅把要素写入对应瓦片（不做 MVT 编码），存储为 UTF-8 JSON，
 * 由 protocol loader 以 `geojson` 格式返回，source type 用 geojson。
 * 生产级 MVT 编码（tippecanoe / @mapbox/vector-tile）可后续接入。
 */

import { tileKey, type StoredTile, type TileStoreBackend, type TileFormat } from './storage';

const MAX_ZOOM_DEFAULT = 14;

function lon2x(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}
function lat2y(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z)
  );
}

function tileBounds(z: number, x: number, y: number): [number, number, number, number] {
  const n = Math.pow(2, z);
  const lonWest = (x / n) * 360 - 180;
  const lonEast = ((x + 1) / n) * 360 - 180;
  const latNorth = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const latSouth = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return [lonWest, latSouth, lonEast, latNorth];
}

function coordInTile(lon: number, lat: number, z: number, x: number, y: number): boolean {
  const [w, s, e, n] = tileBounds(z, x, y);
  return lon >= w && lon <= e && lat >= s && lat <= n;
}

export interface PackGeoJSONOptions {
  sourceId: string;
  geojson: {
    type: 'FeatureCollection';
    features: Array<{
      geometry: { type: string; coordinates: unknown };
      properties: Record<string, unknown>;
    }>;
  };
  maxZoom?: number;
  /** 过期时间（ms 时间戳），0=永不过期 */
  expires?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * 将 GeoJSON 按瓦片网格分桶写入离线存储。
 * 返回写入的瓦片数量。
 */
export async function packGeoJSONToStore(
  store: TileStoreBackend,
  opts: PackGeoJSONOptions
): Promise<number> {
  const maxZoom = opts.maxZoom ?? MAX_ZOOM_DEFAULT;
  const expires = opts.expires ?? 0;
  const buckets = new Map<string, unknown[]>();

  for (const f of opts.geojson.features) {
    const g = f.geometry;
    const coords: number[][] = [];
    if (g.type === 'Point' || g.type === 'Circle') {
      coords.push(g.coordinates as number[]);
    } else if (g.type === 'LineString' || g.type === 'MultiPoint') {
      coords.push(...(g.coordinates as number[][]));
    } else if (g.type === 'Polygon' || g.type === 'MultiLineString') {
      for (const ring of g.coordinates as number[][][]) coords.push(...ring);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates as number[][][][]) {
        for (const ring of poly) coords.push(...ring);
      }
    }
    for (const [lon, lat] of coords) {
      // 在每个缩放层级把要素写入其命中的瓦片（父瓦片亦包含，保证任意层级请求命中）
      for (let z = 0; z <= maxZoom; z++) {
        const x = lon2x(lon, z);
        const y = lat2y(lat, z);
        if (coordInTile(lon, lat, z, x, y)) {
          const k = tileKey(opts.sourceId, z, x, y);
          if (!buckets.has(k)) buckets.set(k, []);
          (buckets.get(k) as unknown[]).push(f);
        }
      }
    }
  }

  const total = buckets.size;
  let done = 0;
  for (const [k, features] of buckets) {
    const fc = { type: 'FeatureCollection', features };
    const tile: StoredTile = {
      data: new TextEncoder().encode(JSON.stringify(fc)),
      format: 'geojson' as TileFormat,
      expires,
    };
    await store.put(k, tile);
    done++;
    opts.onProgress?.(done, total);
  }
  return total;
}

/**
 * 由离线存储构造一个 geojson 源（用于 MapLibre source.tiles）。
 * 注意：geojson 协议瓦片由 protocol loader 直接返回 FeatureCollection。
 */
export function offlineGeoJSONSource(
  sourceId: string
): { type: 'geojson'; data: never } & { tiles: string[]; _caoguoOffline: true; _sourceId: string } {
  return {
    type: 'geojson',
    data: undefined as never,
    tiles: [`caoguo-offline://${encodeURIComponent(sourceId)}/{z}/{x}/{y}`],
    _caoguoOffline: true,
    _sourceId: sourceId,
  } as never;
}
