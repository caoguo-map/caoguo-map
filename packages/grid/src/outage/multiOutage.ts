/**
 * 多故障叠加分析（PRD phase-2-grid-water §3.2 O-7 的数据层）
 *
 * 台风等极端场景下多个设备同时故障：对每个故障点分别跑 `analyzeOutage()`，
 * 合并为去重后的**总影响面**，并识别"被多个故障叠加影响"的设备/用户
 * （叠加区往往是抢修优先级最高、恢复最复杂的地方）。
 *
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { GridDevice, GridLine, GridTopologyDataset } from '../types';
import { analyzeOutage, type OutageResult } from './outageCore';

/** 叠加受影响计数（设备/线路/用户在多少个故障的影响范围内） */
export interface OverlapCount {
  id: string;
  count: number;
}

/** 多故障叠加结果 */
export interface MultiOutageResult {
  /** 参与叠加的故障数 */
  faultCount: number;
  /** 单故障结果（顺序与输入一致） */
  results: OutageResult[];
  /** 合并后的受影响设备（去重，附叠加计数） */
  affectedDevices: Array<OverlapCount & { device: GridDevice }>;
  /** 合并后的受影响线路（去重，附叠加计数） */
  affectedLines: Array<OverlapCount & { line: GridLine }>;
  /** 合并后的受影响用户统计（用户数为各故障统计之和；叠加用户另见 overlappedUserIds） */
  totalAffectedUsers: number;
  /** 被 ≥2 个故障同时波及的用户 id（恢复最复杂的区域） */
  overlappedUserIds: string[];
  /** 被叠加影响的设备 id（≥2 个故障），按 count 降序 —— 抢修优先级参考 */
  criticalDeviceIds: string[];
  /** 总耗时（ms，各故障推演之和） */
  durationMs: number;
}

/**
 * 多故障叠加分析（O-7 数据层）
 * @param faultIds 故障设备 id 列表
 * @param opts.userIdsPerFault 调用方可选注入：每个故障的受影响用户 id 列表
 *        （`analyzeOutage` 的用户统计为汇总数字；若需要精确的用户级叠加，
 *        请从数据集 users 按 topology 下游关系自行展开后传入）
 */
export function analyzeMultiOutage(
  dataset: GridTopologyDataset,
  faultIds: string[],
  opts: { userIdsPerFault?: string[][] } = {}
): MultiOutageResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const results = faultIds.map((id) => analyzeOutage(dataset, id));

  // 设备叠加计数
  const deviceCount = new Map<string, { count: number; device: GridDevice }>();
  for (const r of results) {
    for (const d of r.affectedDevices) {
      const cur = deviceCount.get(d.id);
      if (cur) cur.count += 1;
      else deviceCount.set(d.id, { count: 1, device: d });
    }
  }

  // 线路叠加计数
  const lineCount = new Map<string, { count: number; line: GridLine }>();
  for (const r of results) {
    for (const l of r.affectedLines) {
      const cur = lineCount.get(l.id);
      if (cur) cur.count += 1;
      else lineCount.set(l.id, { count: 1, line: l });
    }
  }

  // 用户叠加（可选注入精确用户 id；否则退化为故障数 × 平均）
  const userCount = new Map<string, number>();
  const userIdsPerFault = opts.userIdsPerFault;
  if (userIdsPerFault) {
    for (const ids of userIdsPerFault) {
      for (const id of ids) userCount.set(id, (userCount.get(id) ?? 0) + 1);
    }
  }
  const totalAffectedUsers = userIdsPerFault
    ? userCount.size
    : results.reduce((sum, r) => sum + r.affectedUsers.total, 0);

  const affectedDevices = [...deviceCount.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ count, device }) => ({ id: device.id, count, device }));
  const affectedLines = [...lineCount.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ count, line }) => ({ id: line.id, count, line }));

  return {
    faultCount: faultIds.length,
    results,
    affectedDevices,
    affectedLines,
    totalAffectedUsers,
    overlappedUserIds: [...userCount.entries()]
      .filter(([, c]) => c >= 2)
      .map(([id]) => id),
    criticalDeviceIds: affectedDevices
      .filter((d) => d.count >= 2)
      .map((d) => d.id),
    durationMs: results.reduce((s, r) => s + r.durationMs, 0),
  };
}
