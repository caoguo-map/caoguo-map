/**
 * 水库/闸站卡片数据层（PRD phase-2-grid-water §4.1 R-2）
 *
 * 与电网 `GridTopology.getDeviceDetail()`、管网 `getNodeDetail()` 对齐：
 * 纯数据层，补全上下游关联、蓄水/过流状态、超警戒判定与卡片展示字段，
 * 供上层 UI 直接渲染，不依赖任何框架、不依赖地图实例。
 *
 * 图片与维护记录为**可选扩展**：从 `properties.extra` 读取，不改动既有数据模型。
 */

import { readImages, readMaintenance } from '@caoguo/maplibre';
import type {
  WaterFeature,
  WaterFeatureProperties,
  WaterFeatureKind,
  ReservoirStatus,
  GateStatus,
  GateType,
  WaterDataset,
} from '../types';

/**
 * 运维/检修记录（可选扩展，从 `properties.extra.maintenance` 读取）。
 * 定义来自 `@caoguo/maplibre`（三张网统一口径），此处 re-export 保持本包 API 稳定。
 */
import type { MaintenanceRecord } from '@caoguo/maplibre';
export type { MaintenanceRecord };

/** 蓄水率分档（用于配色与文案） */
export type StorageLevel = 'low' | 'normal' | 'high' | 'full';

/** 水库卡片展示字段 */
export interface ReservoirCardInfo {
  title: string;
  subtitle: string;
  kindLabel: string;
  /** 蓄泄状态文案 */
  statusLabel: string;
  /** 蓄水率文案（如「68%」） */
  storageLabel?: string;
  /** 库容文案（如「12,000 万 m³」） */
  capacityLabel?: string;
  /** 水位文案（如「水位 168.5 m（警戒 170.0 m）」） */
  levelLabel?: string;
  /** 是否超警戒水位 */
  overWarning: boolean;
  images: string[];
  maintenance: MaintenanceRecord[];
}

/** 水库详情 */
export interface ReservoirDetail extends WaterFeature {
  /** 蓄水率分档 */
  storageLevel: StorageLevel;
  /** 上游直接汇入的要素数（parentId 指向本水库） */
  upstreamCount: number;
  /** 下游直接受影响的要素 id 列表（parentId === 本水库 id） */
  downstreamIds: string[];
  /** 同一上级下的同级水库数（不含自身，用于「联合调度」场景） */
  siblingCount: number;
  cardInfo: ReservoirCardInfo;
}

const KIND_LABEL: Record<WaterFeatureKind, string> = {
  basin: '流域',
  mainstream: '干流',
  tributary: '支流',
  reach: '河段',
  reservoir: '水库',
  gate: '闸站',
  dike: '堤防',
  rainStation: '雨量站',
  waterStation: '水位站',
};

const RESERVOIR_STATUS_LABEL: Record<ReservoirStatus, string> = {
  storing: '蓄水中',
  discharging: '泄洪中',
  balanced: '进出平衡',
};

const GATE_STATUS_LABEL: Record<GateStatus, string> = {
  open: '开启',
  partial: '半开',
  closed: '关闭',
};

const GATE_TYPE_LABEL: Record<GateType, string> = {
  sluice: '节制闸',
  floodgate: '防洪闸',
  pumping: '泵站',
};

const STORAGE_LEVEL_LABEL: Record<StorageLevel, string> = {
  low: '低水位',
  normal: '正常',
  high: '偏高',
  full: '接近满库',
};

/** 蓄水率分档（阈值与 PRD §4.3.4 蓄泄状态判定保持一致） */
export function storageLevelOf(storageRate: number): StorageLevel {
  if (storageRate >= 0.9) return 'full';
  if (storageRate >= 0.7) return 'high';
  if (storageRate <= 0.3) return 'low';
  return 'normal';
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * 构建水库/闸站详情与卡片字段（R-2 数据层）
 *
 * @param featureId 要素 id（水库或闸站；其他类型也会返回，只是相关字段为空）
 * @returns 要素不存在时返回 undefined
 */
export function getReservoirDetail(
  dataset: WaterDataset,
  featureId: string
): ReservoirDetail | undefined {
  const feature = (dataset.features ?? []).find((f) => f.id === featureId);
  if (!feature) return undefined;

  const features = dataset.features ?? [];
  const p: WaterFeatureProperties = feature.properties ?? {};

  const upstreamCount = features.filter((f) => f.parentId === featureId).length;
  const downstreamIds = features
    .filter((f) => f.id !== featureId && f.parentId && f.parentId === feature.parentId)
    .map((f) => f.id);
  // 同级 = 同一 parentId 下同类型要素（不含自身）
  const siblingCount = features.filter(
    (f) => f.id !== featureId && f.kind === feature.kind && f.parentId === feature.parentId
  ).length;

  const storageRate = num(p.storageRate);
  const storageLevel: StorageLevel | undefined =
    storageRate !== undefined ? storageLevelOf(storageRate) : undefined;
  const level = num(p.waterLevel);
  const warning = num(p.warningLevel);
  const overWarning = level !== undefined && warning !== undefined && level > warning;

  // 状态：水库取蓄泄状态（缺失时由蓄水率推断），闸站取启闭状态
  let statusLabel: string;
  if (feature.kind === 'gate') {
    statusLabel = p.gateStatus ? GATE_STATUS_LABEL[p.gateStatus] : '未知';
  } else if (p.reservoirStatus) {
    statusLabel = RESERVOIR_STATUS_LABEL[p.reservoirStatus];
  } else if (storageLevel) {
    statusLabel = STORAGE_LEVEL_LABEL[storageLevel];
  } else {
    statusLabel = '未知';
  }

  const capacity = num(p.capacity);
  const subtitleParts = [KIND_LABEL[feature.kind]];
  if (feature.kind === 'gate' && p.gateType) subtitleParts.push(GATE_TYPE_LABEL[p.gateType]);
  subtitleParts.push(p.code ?? feature.id);

  return {
    ...feature,
    storageLevel: storageLevel ?? 'normal',
    upstreamCount,
    downstreamIds,
    siblingCount,
    cardInfo: {
      title: feature.name ?? p.code ?? feature.id,
      subtitle: subtitleParts.join(' · '),
      kindLabel: KIND_LABEL[feature.kind],
      statusLabel,
      ...(storageRate !== undefined
        ? { storageLabel: `${(storageRate * 100).toFixed(0)}%` }
        : {}),
      ...(capacity !== undefined
        ? { capacityLabel: `${capacity.toLocaleString('zh-CN')} 万 m³` }
        : {}),
      ...(level !== undefined
        ? {
            levelLabel: warning !== undefined
              ? `水位 ${level} m（警戒 ${warning} m）`
              : `水位 ${level} m`,
          }
        : {}),
      overWarning,
      images: readImages(p.extra),
      maintenance: readMaintenance(p.extra),
    },
  };
}

/**
 * 批量构建（多水库联合调度场景，PRD §4.3 DO-1）
 * @param kinds 需要提取的要素类型（默认 `['reservoir', 'gate']`）
 */
export function getReservoirDetails(
  dataset: WaterDataset,
  kinds: WaterFeatureKind[] = ['reservoir', 'gate']
): ReservoirDetail[] {
  const kindSet = new Set<WaterFeatureKind>(kinds);
  return (dataset.features ?? [])
    .filter((f) => kindSet.has(f.kind))
    .flatMap((f) => {
      const d = getReservoirDetail(dataset, f.id);
      return d ? [d] : [];
    });
}
