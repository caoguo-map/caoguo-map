/**
 * 算力任务分配（PRD phase-3 §4.1.2 C-4 的数据层）
 *
 * 原状态：只有 `filter({region, type})` 筛选，「分配」逻辑缺失。
 * 本模块补齐**任务 → 节点**的分配，策略可插拔：
 *
 * - `balanced`（默认）：优先分配给**剩余算力最充裕**的节点（贪心），
 *   使各节点利用率趋于均衡 —— 通用兜底策略，不假设任何业务优先级；
 * - `nearest`：优先分配给**距离任务坐标最近**的节点（延迟敏感场景）；
 * - `capacity`：优先分配给**总算力最大**的节点（大任务场景）。
 *
 * 通用过滤：`region`（同区优先或仅同区）/ `types` / `offline 剔除`。
 * 分配失败（无合格节点）时返回 `unassigned`，不抛错。
 *
 * **业务口径说明**：以上为演示级通用策略。计费、配额、租户隔离等真实业务规则
 * 应由上层业务系统实现（可通过 `filter` 传入自定义候选集接入）。
 * 纯函数，不依赖地图实例，可在 Node 单测。
 */

import type { ComputeNode } from '../types';
import { recommendBestNode } from '../graph';

/** 分配策略 */
export type AssignmentStrategy = 'balanced' | 'nearest' | 'capacity';

/** 待分配任务 */
export interface AssignmentTask {
  id: string;
  /** 需求算力（TFLOPS） */
  demandTflops: number;
  /** 任务坐标（仅 `nearest` 策略需要） */
  lng?: number;
  lat?: number;
  /** 限定区域（不传则不限） */
  region?: string;
  /** 限定节点类型 */
  types?: ComputeNode['type'][];
}

/** 分配结果 */
export interface AssignmentResult {
  taskId: string;
  /** 命中节点（未分配时 undefined） */
  nodeId?: string;
  nodeName?: string;
  strategy: AssignmentStrategy;
  /** 分配前该节点的 GPU 利用率 */
  utilizationBefore?: number;
  /** 分配后估算的 GPU 利用率（按剩余算力折算） */
  utilizationAfter?: number;
  /** 失败原因（未分配时给出） */
  reason?: 'no-candidate' | 'insufficient-capacity';
}

/** 解析 "1000 TFLOPS" 之类字符串为数值（TFLOPS） */
function parseTflops(v: string | undefined): number {
  if (!v) return 0;
  const m = /([\d.]+)/.exec(v);
  return m ? parseFloat(m[1]) : 0;
}

/** 节点总算力 / 已用算力（TFLOPS） */
export function nodeCapacity(node: ComputeNode): { total: number; used: number; free: number } {
  const total = parseTflops(node.properties?.totalCompute);
  const used = parseTflops(node.properties?.usedCompute);
  return { total, used, free: Math.max(0, total - used) };
}

/** 节点是否满足任务的硬性条件（容量 + 区域 + 类型 + 在线） */
function isCandidate(node: ComputeNode, task: AssignmentTask, strictRegion: boolean): boolean {
  if (node.properties?.status === 'offline') return false;
  if (task.types && !task.types.includes(node.type)) return false;
  if (task.region && node.properties?.region !== task.region && strictRegion) return false;
  return nodeCapacity(node).free >= task.demandTflops;
}

/** 单任务分配（不对数据集做写入） */
export function assignTask(
  datasetNodes: ComputeNode[],
  task: AssignmentTask,
  strategy: AssignmentStrategy = 'balanced',
  opts: { strictRegion?: boolean } = {}
): AssignmentResult {
  const strictRegion = opts.strictRegion ?? true;
  const candidates = datasetNodes.filter((n) => isCandidate(n, task, strictRegion));

  if (candidates.length === 0) {
    // 宽松重试：允许跨区域（nearest 策略下同区无节点时就近分配仍然合理）
    const relaxed = strictRegion
      ? datasetNodes.filter((n) => isCandidate(n, task, false))
      : [];
    if (relaxed.length === 0) {
      return {
        taskId: task.id,
        strategy,
        reason: datasetNodes.some((n) => nodeCapacity(n).free >= task.demandTflops)
          ? 'no-candidate'
          : 'insufficient-capacity',
      };
    }
    candidates.push(...relaxed);
  }

  let chosen: ComputeNode;
  switch (strategy) {
    case 'nearest': {
      if (task.lng === undefined || task.lat === undefined) {
        // 无坐标时退化为 balanced
        chosen = pickBalanced(candidates);
        break;
      }
      const ranked = recommendBestNode(
        candidates.map((n) => ({
          id: n.id,
          lng: n.lng,
          lat: n.lat,
          online: n.properties?.status !== 'offline',
        })),
        task.lng,
        task.lat
      );
      const bestId = ranked[0]?.id;
      chosen = candidates.find((n) => n.id === bestId) ?? pickBalanced(candidates);
      break;
    }
    case 'capacity': {
      chosen = [...candidates].sort(
        (a, b) => nodeCapacity(b).total - nodeCapacity(a).total
      )[0];
      break;
    }
    case 'balanced':
    default: {
      chosen = pickBalanced(candidates);
      break;
    }
  }

  const cap = nodeCapacity(chosen);
  const before = chosen.properties?.gpuUtilization;
  const after =
    cap.total > 0 ? Math.min(1, (cap.used + task.demandTflops) / cap.total) : undefined;

  return {
    taskId: task.id,
    nodeId: chosen.id,
    ...(chosen.name ? { nodeName: chosen.name } : {}),
    strategy,
    ...(before !== undefined ? { utilizationBefore: before } : {}),
    ...(after !== undefined ? { utilizationAfter: Math.round(after * 1000) / 1000 } : {}),
  };
}

/** balanced：剩余算力占比最大者优先（使利用率趋于均衡） */
function pickBalanced(candidates: ComputeNode[]): ComputeNode {
  return [...candidates].sort((a, b) => {
    const ra = nodeCapacity(a);
    const rb = nodeCapacity(b);
    const freeRatioA = ra.total > 0 ? ra.free / ra.total : 0;
    const freeRatioB = rb.total > 0 ? rb.free / rb.total : 0;
    return freeRatioB - freeRatioA;
  })[0];
}

/** 两点球面距离（km），供 nearest 策略估算"延迟" */
function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * 批量分配：按任务顺序贪心分配。
 * 注意：本函数**不回写数据集**（保持纯函数），前序任务的占用通过
 * `assignments` 的 `utilizationAfter` 体现；如需"占用感知"的连续分配，
 * 由调用方按结果更新节点属性后再次调用。
 */
export function assignTasks(
  datasetNodes: ComputeNode[],
  tasks: AssignmentTask[],
  strategy: AssignmentStrategy = 'balanced',
  opts: { strictRegion?: boolean } = {}
): AssignmentResult[] {
  return tasks.map((t) => assignTask(datasetNodes, t, strategy, opts));
}
