/**
 * 气象数据接入（PRD phase-1-pipeline §4.3 L-5）
 *
 * 设计口径：
 * - 本包坚持「离线友好 / 算法纯函数」（见 `src/index.ts` 设计原则 3），
 *   **不内置 fetch / WebSocket**；传输层由调用方注入 `WeatherProvider`，
 *   可以是 REST、WebSocket、本地缓存或测试桩。
 * - 单位与坐标系统一在这里完成：对外用**气象习惯**（风向 = 来向、度、0=北、顺时针），
 *   对内转换成本包高斯烟羽所需的**数学弧度**（0=东、逆时针）。
 */

/** 取数位置 */
export interface WeatherLocation {
  lng: number;
  lat: number;
}

/** 归一化后的气象观测（对外口径：度 + m/s + 来向） */
export interface WeatherObservation {
  /** 风向（来向，度）：0=北，顺时针递增 */
  windDirectionDeg: number;
  /** 风速（m/s） */
  windSpeed: number;
  /** 观测时间（ISO 字符串或毫秒时间戳） */
  observedAt?: string | number;
  /** 数据来源标识（如 'rest' / 'ws' / 'mock' / 站点名） */
  source?: string;
}

/**
 * 原始气象报文：字段命名在不同数据商之间差异很大，
 * 这里只约定**可选**的常见别名，无法识别时按缺省处理。
 * 风向可为度数值或方位字符串（'NW' / '西北'）；
 * 风速可用 `windSpeed`(m/s)、`windSpeedKmh`(km/h) 或 `windLevel`(蒲福风级) 之一。
 */
export interface WeatherRaw {
  windDirection?: number | string;
  windDir?: number | string;
  /** 风速（m/s） */
  windSpeed?: number;
  /** 风速（km/h） */
  windSpeedKmh?: number;
  /** 蒲福风级 0~12 */
  windLevel?: number;
  observedAt?: string | number;
  source?: string;
}

/** 气象取数实现：由调用方注入（传输层不在本包内） */
export type WeatherProvider = (
  location: WeatherLocation,
  signal?: AbortSignal,
) => Promise<WeatherRaw | WeatherObservation>;

/** 蒲福风级 → 中心风速（m/s），索引即风级 */
const BEAUFORT_MS = [0, 0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];

/** 蒲福风级转 m/s；超出 0~12 按端点值外推为 0 / 最大档 */
export function beaufortToMs(level: number): number {
  if (!Number.isFinite(level)) return 0;
  const i = Math.round(level);
  if (i <= 0) return BEAUFORT_MS[0];
  if (i >= BEAUFORT_MS.length - 1) return BEAUFORT_MS[BEAUFORT_MS.length - 1];
  return BEAUFORT_MS[i];
}

/** 英文方位缩写 → 度 */
const COMPASS_EN: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/** 中文方位 → 度；**两字词必须排在单字前**，否则「东北」会先命中「东」 */
const COMPASS_ZH: Array<[string, number]> = [
  ['东北', 45],
  ['东南', 135],
  ['西南', 225],
  ['西北', 315],
  ['北', 0],
  ['东', 90],
  ['南', 180],
  ['西', 270],
];

/** 解析方位字符串（中英文）；无法识别返回 null */
export function parseCompassDirection(input: string): number | null {
  const s = input.trim().toUpperCase().replace(/\s+/g, '');
  if (s in COMPASS_EN) return COMPASS_EN[s];
  for (const [zh, deg] of COMPASS_ZH) {
    if (input.includes(zh)) return deg;
  }
  return null;
}

/**
 * 气象风向（来向，度，0=北顺时针）→ 高斯烟羽所需弧度（0=东，逆时针）。
 *
 * 推导：来向 θ 的下风向方位为 θ+180（罗盘度），罗盘方位 b 对应数学角 90-b（度）。
 * 故 α = 90 - (θ + 180) = -(90 + θ) 度。
 * 例：北风（θ=0）→ 烟羽向南 → -90°（本包 0=东、π/2=北，故南为 -π/2）。
 */
export function windDegToRadians(deg: number): number {
  return (-(90 + deg) * Math.PI) / 180;
}

/** 归一化角度到 (-π, π] */
function normalizeRadians(rad: number): number {
  const twoPi = Math.PI * 2;
  let r = rad % twoPi;
  if (r <= -Math.PI) r += twoPi;
  if (r > Math.PI) r -= twoPi;
  return r;
}

/** 归一化风向到 [0, 360) */
function normalizeDeg(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** 把任意原始气象报文归一化为统一口径的 WeatherObservation */
export function normalizeWeather(raw: WeatherRaw | WeatherObservation): WeatherObservation {
  const anyRaw = raw as WeatherRaw & WeatherObservation;

  // ── 风向 ──
  let deg: number | null = null;
  const dirRaw = anyRaw.windDirectionDeg ?? anyRaw.windDirection ?? anyRaw.windDir;
  if (typeof dirRaw === 'number' && Number.isFinite(dirRaw)) {
    deg = dirRaw;
  } else if (typeof dirRaw === 'string') {
    deg = parseCompassDirection(dirRaw);
  }
  if (deg === null) {
    const windDirNum = Number(anyRaw.windDir);
    if (Number.isFinite(windDirNum) && anyRaw.windDir !== undefined) deg = windDirNum;
  }
  const windDirectionDeg = normalizeDeg(deg ?? 0);

  // ── 风速：风级 > km/h > m/s ──
  let speed = 0;
  if (anyRaw.windLevel !== undefined && Number.isFinite(Number(anyRaw.windLevel))) {
    speed = beaufortToMs(Number(anyRaw.windLevel));
  } else if (anyRaw.windSpeedKmh !== undefined && Number.isFinite(Number(anyRaw.windSpeedKmh))) {
    speed = Number(anyRaw.windSpeedKmh) / 3.6;
  } else if (anyRaw.windSpeed !== undefined && Number.isFinite(Number(anyRaw.windSpeed))) {
    speed = Number(anyRaw.windSpeed);
  }
  const windSpeed = Math.max(0, speed);

  return {
    windDirectionDeg,
    windSpeed,
    observedAt: anyRaw.observedAt,
    source: anyRaw.source,
  };
}

/**
 * 气象观测 → 可直接并入 `GasLeakParams` 的风场字段。
 * 这是「对外气象口径」与「本包烟羽口径」的唯一转换出口。
 */
export function toWindParams(obs: WeatherObservation): { windDirection: number; windSpeed: number } {
  return {
    windDirection: normalizeRadians(windDegToRadians(obs.windDirectionDeg)),
    windSpeed: obs.windSpeed,
  };
}
