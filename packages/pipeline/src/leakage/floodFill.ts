/**
 * 供水爆管淹没分析（基于地形的 flood fill）
 *
 * 输入：
 *   - DEM：高程网格（lng, lat → elevation）
 *   - source：爆管点
 *   - 网格分辨率
 *
 * 算法：
 *   - 从爆管点出发，flood fill 到相邻低洼地
 *   - 估算淹没范围
 */

export interface DemGrid {
  /** 西南角 lng/lat */
  west: number;
  south: number;
  /** 网格行列数 */
  cols: number;
  rows: number;
  /** 单元尺寸（度） */
  cellSize: number;
  /** 高程数组（row-major，rows × cols） */
  elevations: number[];
}

export interface FloodParams {
  sourceLng: number;
  sourceLat: number;
  /** 起始水位（m），默认 0 */
  initialWaterLevel?: number;
  /** 模拟时长（秒），默认 30min */
  duration?: number;
  /** 流量估算（m³/h），默认按中等爆管 50 */
  flowRate?: number;
}

export interface FloodResult {
  source: { lng: number; lat: number };
  /** 淹没面积（m²） */
  floodArea: number;
  /** 受影响网格（高程 < 水位） */
  affectedCells: Array<{ lng: number; lat: number; elevation: number; waterDepth: number }>;
  /** 凸包多边形 */
  hull: [number, number][];
  /** 最大水深 */
  maxDepth: number;
}

/**
 * 简单 flood fill 模拟（按等高线分布）
 */
export function simulateFlood(dem: DemGrid, params: FloodParams): FloodResult {
  const t0 = Date.now();
  const sourceIdx = lngLatToIndex(dem, params.sourceLng, params.sourceLat);
  if (sourceIdx.row < 0 || sourceIdx.row >= dem.rows || sourceIdx.col < 0 || sourceIdx.col >= dem.cols) {
    return {
      source: { lng: params.sourceLng, lat: params.sourceLat },
      floodArea: 0,
      affectedCells: [],
      hull: [],
      maxDepth: 0,
    };
  }

  const sourceElev = dem.elevations[sourceIdx.row * dem.cols + sourceIdx.col] ?? 0;
  const durationMin = (params.duration ?? 30 * 60) / 60; // s → min
  const flowM3h = params.flowRate ?? 50;
  const volumeM3 = flowM3h * (durationMin / 60); // m³
  const initialLevel = params.initialWaterLevel ?? sourceElev + 0.05;

  // 简化：假设水平摊开，直至水量耗尽或边界阻挡
  const visited = new Set<number>();
  const affected: FloodResult['affectedCells'] = [];
  const queue: Array<{ row: number; col: number; level: number }> = [];
  queue.push({ row: sourceIdx.row, col: sourceIdx.col, level: initialLevel });

  let maxDepth = 0;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const idx = cur.row * dem.cols + cur.col;
    if (visited.has(idx)) continue;
    visited.add(idx);

    if (cur.row < 0 || cur.row >= dem.rows) continue;
    if (cur.col < 0 || cur.col >= dem.cols) continue;

    const elev = dem.elevations[idx] ?? 0;
    const depth = cur.level - elev;
    if (depth <= 0) continue;
    if (depth > maxDepth) maxDepth = depth;

    const lng = dem.west + cur.col * dem.cellSize + dem.cellSize / 2;
    const lat = dem.south + cur.row * dem.cellSize + dem.cellSize / 2;
    affected.push({ lng, lat, elevation: elev, waterDepth: depth });

    // 4 邻居
    const nextLevel = cur.level - 0.01;
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as Array<[number, number]>) {
      queue.push({ row: cur.row + dr, col: cur.col + dc, level: nextLevel });
    }
  }

  const cellArea = (dem.cellSize * 111320) * (dem.cellSize * 110540);
  const floodArea = affected.length * cellArea;

  const hull: [number, number][] = convexHullLocal(affected.map((c) => [c.lng, c.lat]));

  return {
    source: { lng: params.sourceLng, lat: params.sourceLat },
    floodArea,
    affectedCells: affected,
    hull,
    maxDepth,
  };
}

function lngLatToIndex(dem: DemGrid, lng: number, lat: number): { row: number; col: number } {
  const col = Math.floor((lng - dem.west) / dem.cellSize);
  const row = Math.floor((lat - dem.south) / dem.cellSize);
  return { row, col };
}

function convexHullLocal(points: [number, number][]): [number, number][] {
  if (points.length < 3) return [...points];
  const pts = [...points].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number]
  ): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
