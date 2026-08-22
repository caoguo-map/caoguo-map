/**
 * FloodInundation 核心算法（纯函数）
 *
 * PRD phase-2-grid-water §4.2：
 * 简化水文模型（浏览器端可运行）：
 * 1. 降雨→径流（SCS-CN 模型简化版）
 *    Q = (P - 0.2S)² / (P + 0.8S)
 *    S = 25400/CN - 254
 * 2. 洪峰流量（推理公式法）
 *    Qp = 0.278 × C × i × A / t
 * 3. 淹没范围提取（DEM 栅格 + 计算水位 → flood fill → 淹没多边形）
 */

import type { FloodInput, FloodResult, WaterDataset, WaterFeature } from '../types';

/** SCS-CN 径流量计算（PRD §4.2.1） */
export function scsRunoff(rainfallMm: number, curveNumber: number): number {
  if (rainfallMm <= 0) return 0;
  const S = 25400 / curveNumber - 254; // 潜在最大滞留量（mm）
  if (S <= 0) return rainfallMm;
  const Ia = 0.2 * S; // 初损
  if (rainfallMm <= Ia) return 0;
  const P = rainfallMm;
  const Q = ((P - Ia) * (P - Ia)) / (P + 0.8 * S);
  return Q;
}

/** 洪峰流量（推理公式法，PRD §4.2.1） */
export function peakFlowRational(input: {
  runoffCoefficient: number; // C 径流系数
  rainfallIntensity: number; // i 降雨强度（mm/h）
  catchmentArea: number;     // A 集雨面积（km²）
  concentrationTime: number; // t 汇流时间（h）
}): number {
  if (input.concentrationTime <= 0) return 0;
  return (0.278 * input.runoffCoefficient * input.rainfallIntensity * input.catchmentArea) / input.concentrationTime;
}

/** 径流系数由 CN 估算（简化：C ≈ CN/100 偏保守） */
export function runoffCoefficientFromCN(curveNumber: number): number {
  return Math.min(0.95, curveNumber / 100);
}

/**
 * 淹没范围提取（简化 flood fill）
 *
 * 给定 DEM 栅格（二维数组，单位 m 海拔）与水位，返回被淹没的网格坐标集合。
 * 从种子点（河段/泄漏点）出发，向四邻域扩散，凡海拔 < 水位 且可达者被淹没。
 */
export function inundateCells(
  dem: number[][],
  waterLevel: number,
  seed: [number, number]
): Set<string> {
  const rows = dem.length;
  if (rows === 0) return new Set();
  const cols = dem[0].length;

  const key = (r: number, c: number) => `${r},${c}`;
  const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

  const flooded = new Set<string>();
  const queue: [number, number][] = [seed];
  if (inBounds(seed[0], seed[1])) flooded.add(key(seed[0], seed[1]));

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc)) continue;
      if (flooded.has(key(nr, nc))) continue;
      if (dem[nr][nc] >= waterLevel) continue; // 高于水位不淹没
      flooded.add(key(nr, nc));
      queue.push([nr, nc]);
    }
  }
  return flooded;
}

/** 最大水深（水位 - 最低淹没格海拔） */
export function maxDepth(dem: number[][], flooded: Set<string>, waterLevel: number): number {
  let min = Infinity;
  for (const cell of flooded) {
    const [r, c] = cell.split(',').map(Number);
    if (dem[r][c] < min) min = dem[r][c];
  }
  return min === Infinity ? 0 : waterLevel - min;
}

/**
 * 主入口：洪水淹没模拟
 *
 * @param dataset 水网数据集（用于定位河段种子点）
 * @param dem DEM 栅格（简化，演示用小栅格）
 * @param input 输入参数
 * @param seedCell 种子网格坐标（默认 [0,0]）
 */
/**
 * simulateFlood 可选扩展参数
 * - affectedFeatures：需要统计"是否落在淹没范围内"的水系要素（建筑/泵站/河段等）。
 *   提供时需同时给出 demBounds（栅格对应的经纬度范围），用于把要素经纬度映射到栅格坐标判定。
 * - cellSizeM：单栅格边长（米），用于把"淹没格数"换算成真实面积（km²）。默认 30m。
 * - demBounds：DEM 栅格对应的地理范围 [[minLng,minLat],[maxLng,maxLat]]，用于要素坐标映射。
 */
export interface SimulateFloodOptions {
  affectedFeatures?: WaterFeature[];
  cellSizeM?: number;
  demBounds?: [[number, number], [number, number]];
}

export function simulateFlood(
  dataset: WaterDataset,
  dem: number[][],
  input: FloodInput,
  seedCell: [number, number] = [0, 0],
  options: SimulateFloodOptions = {}
): FloodResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const rainfall = input.rainfall ?? 0;
  const inflow = input.inflow ?? 0;
  const cn = input.curveNumber ?? 75;

  // 1) SCS-CN 径流
  const runoff = scsRunoff(rainfall, cn);

  // 2) 洪峰流量
  const c = runoffCoefficientFromCN(cn);
  const peakFlow = peakFlowRational({
    runoffCoefficient: c,
    rainfallIntensity: input.rainfallIntensity ?? rainfall,
    catchmentArea: input.catchmentArea ?? 1,
    concentrationTime: input.concentrationTime ?? 1,
  });

  // 3) 水位估算（简化：径流 + 来水 → 水位）
  // 以径流量（mm）映射为水位（m）：径流 10mm ≈ 1m（演示简化）
  const waterLevel = runoff / 10 + (inflow > 0 ? inflow / 500 : 0);

  // 4) 淹没范围
  const flooded = inundateCells(dem, waterLevel, seedCell);
  const depth = maxDepth(dem, flooded, waterLevel);

  // 5) 淹没多边形（取淹没格的中心点集合 → 凸包近似，栅格坐标 [col,row]）
  const cells: [number, number][] = [];
  for (const cell of flooded) {
    const [r, c] = cell.split(',').map(Number);
    cells.push([c, r]);
  }
  const inundationPolygon = convexHull(cells);

  // 6) 真实淹没面积：淹没格数 × 单格面积（km²）
  const cellSizeM = options.cellSizeM ?? 30;
  const cellAreaKm2 = (cellSizeM * cellSizeM) / 1e6;
  const inundatedArea = flooded.size * cellAreaKm2;

  // 7) 受影响要素：当提供要素 + 栅格地理范围时，按"要素任一顶点落入淹没凸包"统计
  const affectedFeatures: WaterFeature[] =
    options.affectedFeatures && options.demBounds
      ? options.affectedFeatures.filter((f) =>
          featureInFlood(f, options.demBounds!, dem, inundationPolygon),
        )
      : [];

  const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  return {
    peakFlow,
    runoff,
    inundationPolygon,
    maxDepth: depth,
    inundatedArea,
    affectedFeatures,
    durationMs,
  };
}

/**
 * 判断水系要素是否落在淹没范围内：
 * 把要素几何坐标（经纬度）按 demBounds 线性映射到栅格坐标，再判定是否落入淹没凸包。
 */
function featureInFlood(
  f: WaterFeature,
  demBounds: [[number, number], [number, number]],
  dem: number[][],
  hull: [number, number][],
): boolean {
  const rows = dem.length;
  const cols = rows > 0 ? dem[0].length : 0;
  if (rows === 0 || cols === 0 || hull.length < 3) return false;

  const [[minX, minY], [maxX, maxY]] = demBounds;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const lngLatToCell = (lng: number, lat: number): [number, number] => {
    const col = ((lng - minX) / spanX) * (cols - 1);
    const row = ((maxY - lat) / spanY) * (rows - 1); // 纬度向上增大
    return [col, row];
  };

  const coords: [number, number][] = [];
  if (f.geometry && f.geometry.length >= 2) {
    for (const [lng, lat] of f.geometry) coords.push([lng, lat]);
  } else {
    coords.push([f.lng, f.lat]);
  }

  return coords.some(([lng, lat]) => {
    const [col, row] = lngLatToCell(lng, lat);
    return pointInPolygon([col, row], hull);
  });
}

/** 射线法判定点是否在多边形内（polygon 为 [x,y][]） */
function pointInPolygon(p: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > p[1] !== yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 凸包（Andrew's monotone chain） */
export function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return [...points];
  const pts = [...points];
  pts.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const cross = (o: [number, number], a: [number, number], b: [number, number]): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
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

/** 淹没水深分级着色 */
export function depthColor(depth: number): string {
  if (depth >= 3) return '#7f1d1d'; // 深红
  if (depth >= 2) return '#ef4444'; // 红
  if (depth >= 1) return '#f97316'; // 橙
  if (depth >= 0.5) return '#3b82f6'; // 蓝
  return '#93c5fd'; // 浅蓝
}
