/**
 * 层级钻取（PRD phase-1-pipeline §4.1.3 P-2）
 * 区域 → 街道 → 小区 → 楼栋，逐级钻取管网。
 *
 * 数据口径：`region` 支持**层级路径**写法（`/` 分隔），如 `江岸区/一元街道/滨江小区/3栋`。
 * - 单段值（如 `江岸区`）等价于此前的区域过滤行为，**向后兼容**；
 * - 多段值按前缀匹配归属：钻到 `江岸区` 时，其下所有街道/小区/楼栋的要素都可见。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import { pipeLengthFromGeometry } from '../graph';
import type { PipelineTopologyDataset } from '../types';

/** 层级路径分隔符 */
export const REGION_SEP = '/';

/** 层级名称（PRD：区域 → 街道 → 小区 → 楼栋） */
export const LEVEL_NAMES = ['区域', '街道', '小区', '楼栋'] as const;

/** 某层级路径下的聚合统计 */
export interface HierarchyStats {
  nodes: number;
  pipes: number;
  users: number;
  /** 管段总长（m） */
  lengthM: number;
}

export interface BreadcrumbItem {
  name: string;
  /** 从根到该级的完整路径 */
  path: string;
  /** 层级序号（0=区域） */
  level: number;
  levelName: string;
}

export interface HierarchyEntry extends BreadcrumbItem {
  stats: HierarchyStats;
  /** 直接子级个数 */
  childCount: number;
}

export interface HierarchyNode extends HierarchyEntry {
  children: HierarchyNode[];
}

/** 拆分层级路径；空值返回空数组 */
export function splitPath(region: string | undefined | null): string[] {
  if (!region) return [];
  return region
    .split(REGION_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinPath(parts: string[]): string {
  return parts.join(REGION_SEP);
}

/** 层级序号 → 层级名；超出预置 4 级时退化为「第 N 级」 */
export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? `第${level + 1}级`;
}

/**
 * `region` 是否归属在 `parent` 之下（前缀匹配，且必须是完整分段）。
 * `parent` 为空表示不过滤。
 */
export function isUnder(parent: string | null | undefined, region?: string): boolean {
  if (!parent) return true;
  if (!region) return false;
  if (region === parent) return true;
  return region.startsWith(parent + REGION_SEP);
}

/** 面包屑：从根到当前层级的逐级条目 */
export function breadcrumb(path: string | null): BreadcrumbItem[] {
  const parts = splitPath(path);
  const out: BreadcrumbItem[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    out.push({
      name: parts[i],
      path: joinPath(parts.slice(0, i + 1)),
      level: i,
      levelName: levelName(i),
    });
  }
  return out;
}

/** 上一级路径；已在顶层则返回 null */
export function parentPath(path: string | null): string | null {
  const parts = splitPath(path);
  if (parts.length <= 1) return null;
  return joinPath(parts.slice(0, parts.length - 1));
}

/** 聚合某路径（含其子级）下的要素统计 */
export function aggregateStats(
  dataset: PipelineTopologyDataset,
  path: string | null,
): HierarchyStats {
  const nodes = dataset.nodes ?? [];
  const pipes = dataset.pipes ?? [];
  const users = dataset.users ?? [];
  let pipeCount = 0;
  let lengthM = 0;
  for (const p of pipes) {
    if (!isUnder(path, p.region)) continue;
    pipeCount += 1;
    lengthM += p.length ?? pipeLengthFromGeometry(p, nodes);
  }
  return {
    nodes: nodes.filter((n) => isUnder(path, n.region)).length,
    pipes: pipeCount,
    users: users.filter((u) => isUnder(path, u.region)).length,
    lengthM: Math.round(lengthM * 100) / 100,
  };
}

/**
 * 收集某路径下「直接子级」的节点名（去重、排序）。
 * 排序按 **Unicode 码点**（结果稳定、不依赖 ICU 中文排序规则）；UI 若要拼音序请自行重排。
 */
function childNames(dataset: PipelineTopologyDataset, path: string | null): string[] {
  const depth = splitPath(path).length;
  const names = new Set<string>();
  const collect = (region?: string) => {
    if (!isUnder(path, region)) return;
    const parts = splitPath(region);
    if (parts.length > depth) names.add(parts[depth]);
  };
  for (const n of dataset.nodes ?? []) collect(n.region);
  for (const p of dataset.pipes ?? []) collect(p.region);
  for (const u of dataset.users ?? []) collect(u.region);
  return [...names].sort();
}

/** 列出某路径下的直接子级及其统计（下一层清单） */
export function listChildren(
  dataset: PipelineTopologyDataset,
  path: string | null,
): HierarchyEntry[] {
  const prefix = splitPath(path);
  const depth = prefix.length;
  return childNames(dataset, path).map((name) => {
    const childPath = joinPath([...prefix, name]);
    return {
      name,
      path: childPath,
      level: depth,
      levelName: levelName(depth),
      stats: aggregateStats(dataset, childPath),
      childCount: childNames(dataset, childPath).length,
    };
  });
}

/** 构建层级树（默认到楼栋，即 4 级） */
export function buildHierarchy(
  dataset: PipelineTopologyDataset,
  path: string | null = null,
  maxDepth: number = LEVEL_NAMES.length,
): HierarchyNode[] {
  const entries = listChildren(dataset, path);
  const depth = splitPath(path).length;
  if (depth + 1 >= maxDepth) return entries.map((e) => ({ ...e, children: [] }));
  return entries.map((e) => ({ ...e, children: buildHierarchy(dataset, e.path, maxDepth) }));
}
