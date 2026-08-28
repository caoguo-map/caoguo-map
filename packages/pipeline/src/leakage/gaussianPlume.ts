/**
 * 高斯烟羽模型（Gaussian Plume）
 *
 * 用于燃气泄漏扩散模拟（PRD §4.3.2）：
 *   C(x, y, z) = Q / (2π · σy · σz · u) × exp(-y²/2σy²) ×
 *                [exp(-(z-H)²/2σz²) + exp(-(z+H)²/2σz²)]
 *
 * 输入：
 *   - sourceCoord（泄漏点）：lng/lat
 *   - Q：泄漏速率（kg/s）
 *   - u：风速（m/s）
 *   - windDirection：风向（弧度，0=东）
 *   - stability：大气稳定度 A-F
 *   - H：泄漏源高度（m）
 *   - threshold：警戒浓度（如 20%LEL）
 *
 * 输出：
 *   - 等浓度线多边形（不同浓度等级）
 *   - 下风向最大影响距离
 */

import type { DispersionCoefficients } from './pasquillGifford';
import { dispersionCoefficients, classifyStability } from './pasquillGifford';

export interface GasLeakParams {
  /** 风向（弧度，0=东，PI/2=北） */
  windDirection: number;
  /** 风速 m/s */
  windSpeed: number;
  /** 泄漏速率 kg/s */
  leakRate: number;
  /** 释放高度 m */
  releaseHeight: number;
  /** 大气稳定度（可选，不传则自动分类） */
  stability?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  /** 浓度阈值（kg/m³）列表 */
  thresholds?: number[];
  /** 网格步长（m）默认 50 */
  gridStep?: number;
  /** 计算范围（m）默认 5000 */
  range?: number;
}

export interface GasLeakResult {
  /** 泄漏点 */
  source: { lng: number; lat: number };
  /** 风向（弧度） */
  windDirection: number;
  /** 风速 m/s */
  windSpeed: number;
  /** 大气稳定度 */
  stability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  /** 等浓度线多边形（阈值对应） */
  contours: ConcentrationContour[];
  /** 下风向最大影响距离（m） */
  maxDownwindDistance: number;
}

export interface ConcentrationContour {
  /** 阈值 */
  threshold: number;
  /** 多边形（顺时针 GeoJSON-like） */
  polygon: [number, number][];
  /** 是否闭合 */
  closed: boolean;
}

/**
 * 计算泄漏源下风向的浓度分布，输出等浓度线多边形
 */
export function gaussianPlume(
  source: { lng: number; lat: number },
  params: GasLeakParams
): GasLeakResult {
  const stability = params.stability ?? 'D';
  const { sigmaY, sigmaZ } = dispersionCoefficients(stability);
  const thresholds = params.thresholds ?? [0.001, 0.005, 0.01];
  const step = params.gridStep ?? 50;
  const range = params.range ?? 5000;

  const contourList: ConcentrationContour[] = thresholds.map((t) => ({
    threshold: t,
    polygon: [],
    closed: false,
  }));

  // 采样网格：下风向 + 横向
  // 用极坐标（r, theta）→ 转笛卡尔 → lng/lat
  const Q = params.leakRate;
  const u = params.windSpeed;
  const H = params.releaseHeight;

  let maxDownwindDistance = 0;

  for (const c of contourList) {
    const points: [number, number][] = [];
    // 从近到远扫描 r，找满足 c(r) >= threshold 的最大 r
    for (let r = step; r <= range; r += step) {
      const sy = sigmaY(r);
      const sz = sigmaZ(r);
      if (sy <= 0 || sz <= 0) continue;
      const concCenter = Q / (2 * Math.PI * sy * sz * u);
      const zTerm = 2 * Math.exp(-(H * H) / (2 * sz * sz));
      const cMax = concCenter * zTerm;
      if (cMax >= c.threshold) {
        points.push([r, 0]);
        if (r > maxDownwindDistance) maxDownwindDistance = r;
      }
    }

    // 多边形 = 各 r 对应的横向扩展（在每个 r 处 y 范围由 σy 决定）
    const poly: [number, number][] = [];
    for (let r = step; r <= range; r += step) {
      const sy = sigmaY(r);
      if (sy <= 0) continue;
      const syy = Q / (2 * Math.PI * sy * sigmaZ(r) * u) * 2;
      if (syy < c.threshold) continue;
      // 横向浓度 = (Q / 2πσyσzu) × exp(-y²/2σy²) × 2
      // 解出 y：exp(-y²/2σy²) = c.threshold * 2πσyσzu / Q
      // y² = -2σy² ln(...)
      const ratio = (c.threshold * Math.PI * sy * sigmaZ(r) * u) / Q;
      if (ratio >= 1) continue; // 浓度太弱，不存在等值线
      const yMax = sy * Math.sqrt(-2 * Math.log(ratio));
      poly.push([r, yMax]);
      poly.unshift([r, -yMax]);
    }
    c.polygon = polyToLngLat(source, params.windDirection, poly);
    c.closed = poly.length >= 3;
  }

  return {
    source,
    windDirection: params.windDirection,
    windSpeed: params.windSpeed,
    stability,
    contours: contourList,
    maxDownwindDistance,
  };
}

/**
 * 泄漏扩散的时间切片（PRD phase-1-pipeline §4.3.3 L-2 扩散动画的数据层）
 *
 * 简化模型：假设泄漏源持续稳定释放，烟羽前缘以风速向下风向推进
 *   front(t) = windSpeed × t
 * 在 t 时刻只有 `[0, front(t)]` 范围内的浓度场已经建立，
 * 因此把 `gaussianPlume` 的计算范围截断到 front(t)，得到该时刻的等值线快照。
 * 逐帧调用本函数即可组成扩散动画（渲染层见 `LeakagePlume.playGasAnimation`）。
 *
 * **适用边界**：本模型不表达「泄漏停止后的浓度衰减」，不做烟团抬升、地形与建筑物遮挡修正，
 * 仅用于演示级扩散过程可视化，**不可用于应急浓度评估**。
 *
 * @param elapsedSec 泄漏开始后经过的秒数（< 一个网格步长时返回空快照）
 */
export function plumeAtTime(
  source: { lng: number; lat: number },
  params: GasLeakParams,
  elapsedSec: number,
): GasLeakResult {
  const step = params.gridStep ?? 50;
  const range = params.range ?? 5000;
  const thresholds = params.thresholds ?? [0.001, 0.005, 0.01];
  const front = params.windSpeed * elapsedSec;

  // 前缘尚未推进到一个网格步长：视为扩散尚未开始（空快照）
  if (!Number.isFinite(front) || front < step) {
    return {
      source,
      windDirection: params.windDirection,
      windSpeed: params.windSpeed,
      stability: params.stability ?? 'D',
      contours: thresholds.map((t) => ({ threshold: t, polygon: [], closed: false })),
      maxDownwindDistance: 0,
    };
  }

  const effectiveRange = Math.min(range, front);
  const snapshot = gaussianPlume(source, { ...params, range: effectiveRange });
  return {
    ...snapshot,
    maxDownwindDistance: Math.min(snapshot.maxDownwindDistance, effectiveRange),
  };
}

/** 把 (r, y) 极坐标点转换为 (lng, lat) */
function polyToLngLat(
  source: { lng: number; lat: number },
  windDir: number,
  poly: [number, number][]
): [number, number][] {
  return poly.map(([r, y]) => {
    // 下风向 = windDir 方向；横向 = windDir - π/2（垂直右）
    // 设下风向单位向量 (cosθ, sinθ)，横向单位向量 (-sinθ, cosθ)
    // 笛卡尔：dx = r * cosθ + y * (-sinθ), dy = r * sinθ + y * cosθ
    const cosW = Math.cos(windDir);
    const sinW = Math.sin(windDir);
    const dx = r * cosW + y * -sinW;
    const dy = r * sinW + y * cosW;

    const dLat = dy / 110540;
    const dLng = dx / (111320 * Math.cos((source.lat * Math.PI) / 180));
    return [source.lng + dLng, source.lat + dLat];
  });
}

/** 根据气象数据自动确定稳定度类别（便利入口） */
export function classifyFromMeteo(opts: {
  windSpeed: number;
  isDaytime: boolean;
  daytimeInsolation?: 'strong' | 'moderate' | 'slight';
  nightCloudCover?: 'overcast' | 'partly' | 'clear';
}) {
  return classifyStability(opts);
}

export { dispersionCoefficients };
export type { DispersionCoefficients };
