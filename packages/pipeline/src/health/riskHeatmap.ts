/**
 * 风险热力图（riskHeatmap）
 *
 * 把 scorePipeHealth 输出按地理网格聚合，输出每个网格的平均分/最高风险，
 * 用于地图热力图（heat-map layer）。
 *
 * 输入：管线数组 [{ lng, lat, healthScore }]
 * 输出：GeoJSON FeatureCollection<Point>（含 healthScore 属性）
 */

export interface HeatmapCell {
  lng: number;
  lat: number;
  healthScore: number;
  /** 网格内管段数 */
  pipeCount: number;
}

export interface PipeHealthPoint {
  lng: number;
  lat: number;
  healthScore: number;
}

export interface RiskHeatmapOptions {
  /** 网格尺寸（m），默认 500 */
  cellSize?: number;
  /** 聚合方式 */
  aggregation?: 'average' | 'min' | 'max';
}

export function aggregateHeatmap(
  points: PipeHealthPoint[],
  options: RiskHeatmapOptions = {}
): HeatmapCell[] {
  const cell = options.cellSize ?? 500;
  const agg = options.aggregation ?? 'average';

  // 经纬度 → 米近似（以第一个点为原点）
  if (points.length === 0) return [];

  const refLat = points[0].lat;
  const refLng = points[0].lng;
  const mPerDegLat = 110_540;
  const mPerDegLng = 111_320 * Math.cos((refLat * Math.PI) / 180);

  const grid = new Map<string, { acc: number; count: number; minS: number; maxS: number; lng: number; lat: number }>();
  for (const p of points) {
    const x = (p.lng - refLng) * mPerDegLng;
    const y = (p.lat - refLat) * mPerDegLat;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const key = `${cx}:${cy}`;
    const cur = grid.get(key);
    if (!cur) {
      grid.set(key, {
        acc: p.healthScore,
        count: 1,
        minS: p.healthScore,
        maxS: p.healthScore,
        lng: p.lng,
        lat: p.lat,
      });
    } else {
      cur.acc += p.healthScore;
      cur.count += 1;
      if (p.healthScore < cur.minS) cur.minS = p.healthScore;
      if (p.healthScore > cur.maxS) cur.maxS = p.healthScore;
      cur.lng = (cur.lng * (cur.count - 1) + p.lng) / cur.count;
      cur.lat = (cur.lat * (cur.count - 1) + p.lat) / cur.count;
    }
  }

  const cells: HeatmapCell[] = [];
  for (const v of grid.values()) {
    let score: number;
    if (agg === 'min') score = v.minS;
    else if (agg === 'max') score = v.maxS;
    else score = v.acc / v.count;
    cells.push({
      lng: v.lng,
      lat: v.lat,
      healthScore: Math.round(score),
      pipeCount: v.count,
    });
  }
  return cells;
}

export function heatmapToGeoJSON(cells: HeatmapCell[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: cells.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      properties: {
        healthScore: c.healthScore,
        pipeCount: c.pipeCount,
      },
    })),
  };
}

/** 优先维护建议列表（风险最高的 Top N 管线） */
export function prioritizeMaintenance(
  pipes: Array<{ id: string; healthScore: number; lng: number; lat: number; label?: string }>,
  topN = 10
) {
  return [...pipes].sort((a, b) => a.healthScore - b.healthScore).slice(0, topN);
}
