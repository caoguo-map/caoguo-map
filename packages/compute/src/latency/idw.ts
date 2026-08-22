/**
 * IDW 反距离加权插值 + 延迟等值带生成（LM-1 延迟等值线支撑）
 *
 * 以若干「锚点」（算力节点 + 其到用户端的估计延迟）为基准，
 * 在矩形网格上反距离加权插值出连续延迟场，再按延迟等级阈值
 * 离散化为分级面（GeoJSON 多边形），实现「延迟等级区域」。
 */

import type { LatencyLevel } from './LatencyMap';

export interface IdwAnchor {
  lng: number;
  lat: number;
  /** 该锚点的延迟值（ms） */
  value: number;
}

/** 延迟等级阈值（与 LatencyMap 着色一致）：excellent≤10, good≤30, fair≤60, poor>60 */
export const LATENCY_LEVEL_THRESHOLDS = [10, 30, 60] as const;

/** 各延迟等级对应的面填充色（与线着色同一套语义） */
export const LATENCY_LEVEL_FILL: Record<LatencyLevel, string> = {
  excellent: '#22d3ee',
  good: '#4ade80',
  fair: '#fbbf24',
  poor: '#ef4444',
};

export function levelOfLatency(ms: number): LatencyLevel {
  if (ms <= LATENCY_LEVEL_THRESHOLDS[0]) return 'excellent';
  if (ms <= LATENCY_LEVEL_THRESHOLDS[1]) return 'good';
  if (ms <= LATENCY_LEVEL_THRESHOLDS[2]) return 'fair';
  return 'poor';
}

export interface IdwGridOptions {
  /** 网格列数（经度方向） */
  cols?: number;
  /** 网格行数（纬度方向） */
  rows?: number;
  /** 幂次，越大越「近者优先」 */
  power?: number;
  /** 平滑系数：距离小于该值（度）视为锚点本身，避免除零 */
  epsilon?: number;
}

export interface IdwGrid {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  cols: number;
  rows: number;
  /** 行优先（row * cols + col）的延迟值矩阵（ms） */
  values: number[];
}

const DEFAULT_BOUNDS_PAD = 0.15; // 锚点包围盒外扩比例，避免面贴边

/**
 * 计算锚点经纬度包围盒（含用户端原点），外扩后作为插值范围。
 */
export function anchorBounds(anchors: IdwAnchor[], origin?: { lng: number; lat: number }) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const consider = (lng: number, lat: number) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  };
  for (const a of anchors) consider(a.lng, a.lat);
  if (origin) consider(origin.lng, origin.lat);
  const padLng = (maxLng - minLng) * DEFAULT_BOUNDS_PAD || 0.1;
  const padLat = (maxLat - minLat) * DEFAULT_BOUNDS_PAD || 0.1;
  return {
    minLng: minLng - padLng,
    minLat: minLat - padLat,
    maxLng: maxLng + padLng,
    maxLat: maxLat + padLat,
  };
}

/**
 * IDW 反距离加权插值，输出规则网格的延迟场。
 * - 锚点距网格点极近时直接取锚点值（epsilon 防除零）。
 * - 所有锚点权重之和接近 0 时（不应发生），回退为锚点均值。
 */
export function idwGrid(anchors: IdwAnchor[], opts: IdwGridOptions = {}): IdwGrid {
  const cols = opts.cols ?? 24;
  const rows = opts.rows ?? 24;
  const power = opts.power ?? 2;
  const eps = opts.epsilon ?? 1e-6;
  const { minLng, minLat, maxLng, maxLat } = anchorBounds(anchors);

  const values = new Array<number>(cols * rows);
  const dLng = (maxLng - minLng) / (cols - 1 || 1);
  const dLat = (maxLat - minLat) / (rows - 1 || 1);
  const mean = anchors.reduce((s, a) => s + a.value, 0) / (anchors.length || 1);

  for (let r = 0; r < rows; r++) {
    const lat = minLat + r * dLat;
    for (let c = 0; c < cols; c++) {
      const lng = minLng + c * dLng;
      let wsum = 0;
      let vsum = 0;
      for (const a of anchors) {
        const dx = lng - a.lng;
        const dy = lat - a.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < eps) {
          wsum = 1;
          vsum = a.value;
          break;
        }
        const w = 1 / Math.pow(dist, power);
        wsum += w;
        vsum += w * a.value;
      }
      values[r * cols + c] = wsum > 0 ? vsum / wsum : mean;
    }
  }

  return { minLng, minLat, maxLng, maxLat, cols, rows, values };
}

/**
 * 把延迟场网格转为分级 GeoJSON 多边形（LM-1 延迟等级区域）。
 * 每个网格 cell 生成一个正方形 polygon，按 level 着色；
 * 返回按等级分组的 FeatureCollection（便于分图层渲染不同色）。
 */
export function latencyIsoFeatureCollection(grid: IdwGrid): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const { minLng, minLat, cols, rows, values } = grid;
  const dLng = (grid.maxLng - minLng) / (cols - 1 || 1);
  const dLat = (grid.maxLat - minLat) / (rows - 1 || 1);
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      // 单元格四角的延迟均值作为该 cell 等级，平滑边界。
      const v00 = values[r * cols + c];
      const v10 = values[r * cols + c + 1];
      const v01 = values[(r + 1) * cols + c];
      const v11 = values[(r + 1) * cols + c + 1];
      const avg = (v00 + v10 + v01 + v11) / 4;
      const level = levelOfLatency(avg);
      const lng0 = minLng + c * dLng;
      const lng1 = lng0 + dLng;
      const lat0 = minLat + r * dLat;
      const lat1 = lat0 + dLat;
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[lng0, lat0], [lng1, lat0], [lng1, lat1], [lng0, lat1], [lng0, lat0]]],
        },
        properties: { level, latencyMs: Math.round(avg * 10) / 10 },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}
