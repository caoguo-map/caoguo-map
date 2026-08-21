/**
 * Pasquill-Gifford 大气稳定度参数（PRD §4.3.2）
 *
 * 根据风速 + 日射强度 + 夜间云量，对应稳定度类别 A-F
 * A: 极不稳定，B: 不稳定，C: 弱不稳定，D: 中性，E: 弱稳定，F: 稳定
 *
 * 用于高斯烟羽模型的扩散系数 σy/σz 估计。
 */

export type StabilityClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface PasquillGiffordParams {
  /** 风速 m/s */
  windSpeed: number;
  /** 日射强度（白天）：强/中等/弱 */
  daytimeInsolation?: 'strong' | 'moderate' | 'slight';
  /** 夜间云量（阴天/部分/晴朗） */
  nightCloudCover?: 'overcast' | 'partly' | 'clear';
  /** 是否白天 */
  isDaytime: boolean;
}

// 修正后的 Pasquill-Gifford 稳定度分类
// 参考 EPA 工业源空气污染（ISC）模型常用分类
const TABLE_DAY: Array<{ wind: number; cls: Record<string, StabilityClass> }> = [
  { wind: 2, cls: { strong: 'A', moderate: 'A', slight: 'B' } },
  { wind: 3, cls: { strong: 'A', moderate: 'B', slight: 'C' } },
  { wind: 5, cls: { strong: 'B', moderate: 'B', slight: 'C' } },
  { wind: 6, cls: { strong: 'C', moderate: 'C', slight: 'D' } },
  { wind: 7, cls: { strong: 'C', moderate: 'D', slight: 'D' } },
  { wind: 999, cls: { strong: 'D', moderate: 'D', slight: 'D' } },
];

const TABLE_NIGHT: Array<{ wind: number; cls: Record<string, StabilityClass> }> = [
  { wind: 2, cls: { overcast: 'F', partly: 'F', clear: 'F' } },
  { wind: 3, cls: { overcast: 'E', partly: 'F', clear: 'F' } },
  { wind: 5, cls: { overcast: 'D', partly: 'E', clear: 'F' } },
  { wind: 6, cls: { overcast: 'D', partly: 'D', clear: 'E' } },
  { wind: 999, cls: { overcast: 'D', partly: 'D', clear: 'D' } },
];

/**
 * 根据 Pasquill-Gifford 表格，确定稳定度类别
 */
export function classifyStability(params: PasquillGiffordParams): StabilityClass {
  const table = params.isDaytime ? TABLE_DAY : TABLE_NIGHT;
  const key = params.isDaytime
    ? (params.daytimeInsolation ?? 'moderate')
    : (params.nightCloudCover ?? 'partly');

  for (const row of table) {
    if (params.windSpeed < row.wind) return (row.cls as Record<string, StabilityClass>)[key] ?? 'D';
  }
  return 'D';
}

export interface DispersionCoefficients {
  /** σy（m），下风向距离 x 的函数 */
  sigmaY: (x: number) => number;
  /** σz（m），下风向距离 x 的函数 */
  sigmaZ: (x: number) => number;
}

/**
 * Pasquill-Gifford 扩散系数（Briggs 经验公式）
 *   σy, σz = a * x / √(1 + b*x)
 *
 * x 单位 km（外部调用时换算：x (m) / 1000）
 *
 * 表格源自 USEPA ISC3 模型常用设置（单位: m/km 与 1/km）
 */
export function dispersionCoefficients(stability: StabilityClass): DispersionCoefficients {
  // [σy 前系数, σy 分母修正系数, σz 前系数, σz 分母修正系数]
  const params: Record<StabilityClass, [number, number, number, number]> = {
    A: [0.22, 0.0001, 0.20, 0.000],
    B: [0.16, 0.0001, 0.12, 0.000],
    C: [0.11, 0.0001, 0.08, 0.0002],
    D: [0.08, 0.0001, 0.06, 0.0015],
    E: [0.06, 0.0001, 0.03, 0.0003],
    F: [0.04, 0.0001, 0.016, 0.0003],
  };
  const [a, b, c, d] = params[stability];
  return {
    sigmaY: (xMeters: number) => {
      const xKm = xMeters / 1000;
      return (a * xKm) / Math.sqrt(1 + b * xKm) * 1000;
    },
    sigmaZ: (xMeters: number) => {
      const xKm = xMeters / 1000;
      return (c * xKm) / Math.sqrt(1 + d * xKm) * 1000;
    },
  };
}
