/**
 * 重要用户标注数据层（PRD phase-1-pipeline §4.2.3 B-5）
 *
 * 爆管推演已能算出 `BurstSimulateResult.importantUsers`（医院/学校/政府/消防等），
 * 但此前没有可供地图直接渲染的结构。本模块把它整理为标注点，
 * 渲染层见 `PipelineTopology.renderImportantUsers()`。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { PipelineUser, UserKind } from '../types';
import { userSeverity } from './burstCore';

/** 重要用户标注点（可直接渲染为 symbol/circle 图层） */
export interface ImportantUserMarker {
  userId: string;
  /** 用户名称（缺失时回退为 id） */
  name: string;
  lng: number;
  lat: number;
  kind: UserKind;
  /** 严重度权重（复用 `userSeverity`：important 权重最高） */
  severity: number;
  /** 规模（人口/用量），可选 */
  scale?: number;
  /** 展示标签，如「市第一医院 · 重要用户」 */
  label: string;
  /** 关联的供应节点 id */
  nodeId?: string;
  /** 备注 */
  note?: string;
}

/** 标注配色（按严重度分档，渲染层可直接取用） */
export const IMPORTANT_USER_COLORS = {
  /** severity >= 100：重要用户（医院/学校/政府/消防） */
  critical: '#ef4444',
  /** 50 <= severity < 100：工业用户 */
  high: '#f97316',
  /** 20 <= severity < 50：商业用户 */
  medium: '#f59e0b',
  /** severity < 20：居民用户 */
  low: '#38bdf8',
} as const;

/** 按严重度取配色 */
export function importantUserColor(severity: number): string {
  if (severity >= 100) return IMPORTANT_USER_COLORS.critical;
  if (severity >= 50) return IMPORTANT_USER_COLORS.high;
  if (severity >= 20) return IMPORTANT_USER_COLORS.medium;
  return IMPORTANT_USER_COLORS.low;
}

const KIND_LABEL: Record<UserKind, string> = {
  important: '重要用户',
  industrial: '工业',
  commercial: '商业',
  residential: '居民',
};

export interface ImportantUserMarkerOptions {
  /** 需要标注的用户类型（默认 `['important']`） */
  kinds?: UserKind[];
  /** 严重度下限（默认 0，即不过滤） */
  minSeverity?: number;
}

/**
 * 从用户列表中筛选并构建标注点
 * @param users 用户列表（通常来自 dataset.users 或 BurstSimulateResult.importantUsers）
 * @param opts.kinds 需要标注的类型（默认只标注 important）
 * @param opts.minSeverity 严重度下限
 * @returns 按严重度降序排列的标注点
 */
export function buildImportantUserMarkers(
  users: PipelineUser[] | undefined,
  opts: ImportantUserMarkerOptions = {},
): ImportantUserMarker[] {
  if (!users || users.length === 0) return [];
  const kinds = opts.kinds ?? ['important'];
  const minSeverity = opts.minSeverity ?? 0;
  const kindSet = new Set<UserKind>(kinds);

  return users
    .filter((u) => kindSet.has(u.kind))
    .map((u) => {
      const severity = userSeverity(u.kind, u.scale ?? 1);
      const name = u.name ?? u.id;
      const scaleText = u.scale != null ? ` · ${u.scale}` : '';
      return {
        userId: u.id,
        name,
        lng: u.lng,
        lat: u.lat,
        kind: u.kind,
        severity,
        ...(u.scale != null ? { scale: u.scale } : {}),
        label: `${name} · ${KIND_LABEL[u.kind]}${scaleText}`,
        ...(u.nodeId ? { nodeId: u.nodeId } : {}),
        ...(u.note ? { note: u.note } : {}),
      };
    })
    .filter((m) => m.severity >= minSeverity)
    .sort((a, b) => b.severity - a.severity);
}
