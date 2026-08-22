/**
 * 算力网 NLPG 查询执行层（PRD §6.2）
 *
 * 把 `parseComputeQuery` 识别出的意图 + 过滤条件真正落地为数据结果：
 *  - low_utilization → 过滤 dataset.nodes，返回利用率低于阈值的 GPU 节点
 *  - fiber_routes    → 调 buildComputeAdjacency + findRoutes，返回起终点间光缆路径
 *  - predict_gap     → 调 predictSupplyDemand，返回各区域算力缺口预测
 *
 * 纯函数 + 数据桥接，不依赖地图渲染。对齐 packages/transport/src/nlpg/execute.ts 模式。
 */

import type { ComputeTopologyDataset, ComputeNode } from '../types';
import { buildComputeAdjacency, findRoutes } from '../graph';
import { predictSupplyDemand } from '../predict';
import type {
  ComputeNlpFilters,
  ComputeNlpIntent,
} from './computeNlp';
import { parseComputeQuery } from './computeNlp';

/** 查询结果上下文（执行时由调用方注入的数据源） */
export interface ComputeQueryContext {
  /** 算力网数据集（含 nodes / links） */
  dataset: ComputeTopologyDataset;
  /**
   * 城市 → 节点 ID 映射（fiber_routes 用）。未提供时尝试按节点 name 匹配城市，
   * 若仍无法解析则给出结构占位（与 transport compare 缺数据占位一致）。
   */
  cityToNodeId?: Record<string, string>;
  /** predict_gap：预测天数（默认随 filters.timeWindow，回退 7） */
  daysAhead?: number;
  /** predict_gap：每日增长率（默认 0.05） */
  growthRate?: number;
}

export interface LowUtilNode {
  id: string;
  name?: string;
  gpuUtilization: number;
  region?: string;
}

export interface ComputeFiberRoute {
  /** 路径节点 id 序列 */
  path: string[];
  /** 起终点城市（回显） */
  from: string;
  to: string;
}

export interface GapForecast {
  region: string;
  predictedUtilization: number;
  isGap: boolean;
  gapLevel: 'none' | 'low' | 'medium' | 'high';
}

export type ComputeQueryData =
  | { type: 'low_utilization'; nodes: LowUtilNode[]; total: number }
  | { type: 'fiber_routes'; routes: ComputeFiberRoute[] }
  | { type: 'predict_gap'; forecasts: GapForecast[] }
  | { type: 'unknown'; message: string };

export interface ComputeQueryExecution {
  intent: ComputeNlpIntent;
  filters: ComputeNlpFilters;
  data: ComputeQueryData;
  summary: string;
}

/**
 * 执行算力自然语言查询：识别 → 取数 → 返回结构化结果。
 */
export function executeComputeQuery(
  query: string,
  ctx: ComputeQueryContext,
  parsed?: { intent: ComputeNlpIntent; filters: ComputeNlpFilters }
): ComputeQueryExecution {
  const { intent, filters } = parsed ?? parseComputeQuery(query);

  switch (intent) {
    case 'low_utilization':
      return {
        intent,
        filters,
        data: executeLowUtil(ctx.dataset.nodes, filters),
        summary: buildSummaryLowUtil(ctx.dataset.nodes, filters),
      };
    case 'fiber_routes':
      return {
        intent,
        filters,
        data: executeRoutes(ctx, filters),
        summary: buildSummaryRoutes(ctx, filters),
      };
    case 'predict_gap':
      return {
        intent,
        filters,
        data: executeGap(ctx, filters),
        summary: buildSummaryGap(ctx, filters),
      };
    default:
      return {
        intent: 'unknown',
        filters,
        data: { type: 'unknown', message: '无法识别的算力查询' },
        summary: '无法识别的算力查询',
      };
  }
}

function resolveNodeForCity(
  city: string | undefined,
  dataset: ComputeTopologyDataset,
  cityToNodeId?: Record<string, string>
): string | undefined {
  if (!city) return undefined;
  if (cityToNodeId?.[city]) return cityToNodeId[city];
  // 退而求其次：按节点 name 包含城市名匹配
  const hit = dataset.nodes.find((n) => n.name?.includes(city));
  return hit?.id;
}

function executeLowUtil(
  nodes: ComputeNode[],
  f: ComputeNlpFilters
): ComputeQueryData {
  const max = f.maxUtilization ?? 0.3;
  const low = nodes
    .filter((n) => (n.properties?.gpuUtilization ?? 0) < max)
    .map<LowUtilNode>((n) => ({
      id: n.id,
      name: n.name,
      gpuUtilization: n.properties?.gpuUtilization ?? 0,
      region: n.properties?.region,
    }))
    .sort((a, b) => a.gpuUtilization - b.gpuUtilization);
  return { type: 'low_utilization', nodes: low, total: low.length };
}

function executeRoutes(
  ctx: ComputeQueryContext,
  f: ComputeNlpFilters
): ComputeQueryData {
  const fromId = resolveNodeForCity(f.from, ctx.dataset, ctx.cityToNodeId);
  const toId = resolveNodeForCity(f.to, ctx.dataset, ctx.cityToNodeId);
  if (!fromId || !toId) {
    return { type: 'fiber_routes', routes: [] };
  }
  const adj = buildComputeAdjacency(ctx.dataset);
  const paths = findRoutes(adj, fromId, toId, { maxRoutes: 3, maxDepth: 20 });
  const routes: ComputeFiberRoute[] = paths.map((p) => ({
    path: p,
    from: f.from ?? fromId,
    to: f.to ?? toId,
  }));
  return { type: 'fiber_routes', routes };
}

function executeGap(
  ctx: ComputeQueryContext,
  f: ComputeNlpFilters
): ComputeQueryData {
  const daysAhead =
    ctx.daysAhead ?? (f.timeWindow === '30d' ? 30 : f.timeWindow === '7d' ? 7 : 7);
  const gaps = predictSupplyDemand(ctx.dataset, {
    daysAhead,
    growthRate: ctx.growthRate,
  });
  // 若指定区域，则只保留该区域
  const filtered = f.region ? gaps.filter((g) => g.region === f.region) : gaps;
  const forecasts: GapForecast[] = filtered.map((g) => ({
    region: g.region,
    predictedUtilization: g.predictedUtilization,
    isGap: g.isGap,
    gapLevel: g.gapLevel,
  }));
  return { type: 'predict_gap', forecasts };
}

function buildSummaryLowUtil(nodes: ComputeNode[], f: ComputeNlpFilters): string {
  const max = f.maxUtilization ?? 0.3;
  const count = nodes.filter((n) => (n.properties?.gpuUtilization ?? 0) < max).length;
  return `利用率低于 ${(max * 100).toFixed(0)}% 的 GPU 节点共 ${count} 个`;
}

function buildSummaryRoutes(ctx: ComputeQueryContext, f: ComputeNlpFilters): string {
  const fromId = resolveNodeForCity(f.from, ctx.dataset, ctx.cityToNodeId);
  const toId = resolveNodeForCity(f.to, ctx.dataset, ctx.cityToNodeId);
  if (!fromId || !toId) {
    return `未能解析路由端点（from=${f.from ?? '?'} to=${f.to ?? '?'}），请补充城市到节点的映射`;
  }
  return `${f.from ?? fromId} 到 ${f.to ?? toId} 的光缆路由`;
}

function buildSummaryGap(_ctx: ComputeQueryContext, f: ComputeNlpFilters): string {
  const region = f.region ?? '全网';
  const days = f.timeWindow === '30d' ? 30 : 7;
  return `${region} 未来 ${days} 天算力缺口预测`;
}
