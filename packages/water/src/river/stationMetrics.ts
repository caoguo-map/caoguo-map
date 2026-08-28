/**
 * 站点实时指标（PRD phase-2-grid-water §4.1 R-5 的数据层）
 *
 * 雨量站/水位站的实时数据叠加分两步：
 * 1. **接入**：传输层（WebSocket / MQTT / SSE）收到消息 → `parseWaterMessage()` 解析成 patch
 * 2. **应用**：`applyMetricPatch()` 把 patch 写回要素属性（纯函数，返回新对象）
 *
 * 与电网 `grid/realtime` 采用同样的"传输层可插拔"结构：本模块只负责解析与应用，
 * **不含任何传输实现**，调用方自行决定数据来源（轮询 / WS / 手动注入）。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { WaterFeature, WaterFeatureKind } from '../types';

/** 单条实时指标更新 */
export interface WaterMetricPatch {
  featureId: string;
  /** 当前水位（m） */
  waterLevel?: number;
  /** 时段降雨量（mm） */
  rainfall?: number;
  /** 流量（m³/s） */
  flowRate?: number;
  /** 时间戳（ms） */
  timestamp?: number;
}

/** 支持实时指标的站点类型 */
export const METRIC_STATION_KINDS: WaterFeatureKind[] = ['rainStation', 'waterStation', 'reservoir'];

/**
 * 解析实时消息（容错：非法 JSON 或缺少 featureId 时返回 null）
 *
 * 支持两种键名：
 * - 精简键：`{ f, wl, rf, fr, ts }`（f=要素 id / wl=水位 / rf=雨量 / fr=流量 / ts=时间戳）
 * - 完整键：`{ featureId, waterLevel, rainfall, flowRate, timestamp }`
 */
export function parseWaterMessage(raw: string | Record<string, unknown>): WaterMetricPatch | null {
  let obj: Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      obj = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (raw && typeof raw === 'object') {
    obj = raw;
  } else {
    return null;
  }

  const featureId = obj.f ?? obj.featureId;
  if (typeof featureId !== 'string' || featureId.length === 0) return null;

  const patch: WaterMetricPatch = { featureId };
  const wl = num(obj.wl) ?? num(obj.waterLevel);
  const rf = num(obj.rf) ?? num(obj.rainfall);
  const fr = num(obj.fr) ?? num(obj.flowRate);
  const ts = num(obj.ts) ?? num(obj.timestamp);
  if (wl !== undefined) patch.waterLevel = wl;
  if (rf !== undefined) patch.rainfall = rf;
  if (fr !== undefined) patch.flowRate = fr;
  if (ts !== undefined) patch.timestamp = ts;

  // 除 id 外没有任何有效指标 → 视为无效消息
  if (
    patch.waterLevel === undefined &&
    patch.rainfall === undefined &&
    patch.flowRate === undefined
  ) {
    return null;
  }
  return patch;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * 把 patch 应用到要素（纯函数，返回新对象，不修改入参）
 * @returns 要素不存在或无有效字段时返回 null
 */
export function applyMetricPatch(
  feature: WaterFeature,
  patch: WaterMetricPatch
): WaterFeature | null {
  if (feature.id !== patch.featureId) return null;

  const props = { ...(feature.properties ?? {}) };
  let changed = false;
  if (patch.waterLevel !== undefined) {
    props.waterLevel = patch.waterLevel;
    changed = true;
  }
  if (patch.rainfall !== undefined) {
    props.rainfall = patch.rainfall;
    changed = true;
  }
  if (patch.flowRate !== undefined) {
    props.flowRate = patch.flowRate;
    changed = true;
  }
  if (!changed) return null;

  return { ...feature, properties: props };
}

/** 是否超警戒（水位超过警戒水位） */
export function isOverWarning(feature: WaterFeature): boolean {
  const level = feature.properties?.waterLevel;
  const warning = feature.properties?.warningLevel;
  return level !== undefined && warning !== undefined && level > warning;
}

/** 降雨等级配色（渲染层与图例共用） */
export const RAINFALL_COLORS: Record<RainfallLevel | 'overWarning', string> = {
  none: '#94a3b8',
  light: '#7dd3fc',
  moderate: '#38bdf8',
  heavy: '#f59e0b',
  torrential: '#ef4444',
  /** 超警戒水位（优先于降雨等级） */
  overWarning: '#dc2626',
};

/** 降雨等级（mm，用于着色分级） */
export type RainfallLevel = 'none' | 'light' | 'moderate' | 'heavy' | 'torrential';

/** 降雨分级（依据中国气象降水量等级：24h 小雨<10 / 中雨10-25 / 大雨25-50 / 暴雨≥50） */
export function rainfallLevelOf(rainfall: number): RainfallLevel {
  if (!(rainfall > 0)) return 'none';
  if (rainfall < 10) return 'light';
  if (rainfall < 25) return 'moderate';
  if (rainfall < 50) return 'heavy';
  return 'torrential';
}

/** 站点实时指标汇总（防汛值守面板用） */
export interface StationSummary {
  /** 参与统计的站点数 */
  total: number;
  /** 超警戒站点数 */
  overWarning: number;
  /** 最大降雨量（mm） */
  maxRainfall: number;
  /** 最新数据时间（ms，无时间戳时 undefined） */
  latestTimestamp?: number;
}

/**
 * 汇总一批站点的实时状态
 * @param kinds 统计哪些类型（默认雨量站 + 水位站 + 水库）
 */
export function stationSummary(
  features: WaterFeature[],
  kinds: WaterFeatureKind[] = METRIC_STATION_KINDS
): StationSummary {
  const kindSet = new Set<WaterFeatureKind>(kinds);
  const list = features.filter((f) => kindSet.has(f.kind));
  let overWarning = 0;
  let maxRainfall = 0;
  let latest: number | undefined;

  for (const f of list) {
    if (isOverWarning(f)) overWarning += 1;
    const rf = f.properties?.rainfall;
    if (typeof rf === 'number' && rf > maxRainfall) maxRainfall = rf;
  }

  return {
    total: list.length,
    overWarning,
    maxRainfall,
    ...(latest !== undefined ? { latestTimestamp: latest } : {}),
  };
}
