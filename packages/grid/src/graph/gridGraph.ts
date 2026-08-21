/**
 * 电网图算法内核（纯函数）
 *
 * 把电网拓扑（设备 + 线路）转换为图论可用的邻接表，
 * 供停电分析（下游遍历）、供电路径追踪（反向 BFS）、连通性查询复用。
 */

import type { GridTopologyDataset, GridDevice } from '../types';

export interface GridAdjEdge {
  lineId: string;
  /** 邻居设备 id */
  to: string;
  /** 长度（m） */
  length: number;
}

export type GridAdjacencyList = Map<string, GridAdjEdge[]>;

/** Haversine 距离（m） */
export function haversine(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 从电网拓扑构建邻接表（双向） */
export function buildGridAdjacency(dataset: GridTopologyDataset): GridAdjacencyList {
  const adj: GridAdjacencyList = new Map();
  const deviceById = new Map(dataset.devices.map((d) => [d.id, d] as const));

  for (const d of dataset.devices) {
    if (!adj.has(d.id)) adj.set(d.id, []);
  }

  for (const line of dataset.lines) {
    const from = deviceById.get(line.fromDevice);
    const to = deviceById.get(line.toDevice);
    const len =
      line.length && line.length > 0
        ? line.length
        : from && to
          ? haversine(from.lng, from.lat, to.lng, to.lat)
          : 0;

    adj.get(line.fromDevice)?.push({ lineId: line.id, to: line.toDevice, length: len });
    adj.get(line.toDevice)?.push({ lineId: line.id, to: line.fromDevice, length: len });
  }

  return adj;
}

/**
 * BFS 遍历（支持方向控制）
 *
 * 停电分析沿"供电方向"（发电→用户）遍历下游；供电路径追踪反向 BFS。
 * 方向由 direction 参数控制：
 * - 'downstream'：仅沿 from→to 方向（能源流向）
 * - 'upstream'：仅沿 to→from 方向（反向追踪到电源）
 * - 'both'：双向
 */
export function gridBfs(
  adj: GridAdjacencyList,
  dataset: GridTopologyDataset,
  start: string,
  direction: 'downstream' | 'upstream' | 'both' = 'both',
  maxDepth = 1000
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: start, depth: 0 }];
  visited.add(start);

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    const edges = adj.get(id) ?? [];
    for (const e of edges) {
      if (visited.has(e.to)) continue;
      // 方向过滤
      const line = dataset.lines.find((l) => l.id === e.lineId);
      if (direction === 'downstream' && line && line.toDevice === id) continue; // 逆流跳过
      if (direction === 'upstream' && line && line.fromDevice === id) continue; // 顺流跳过
      visited.add(e.to);
      queue.push({ id: e.to, depth: depth + 1 });
    }
  }

  return visited;
}

/** 从设备 id 反查设备对象 */
export function deviceById(dataset: GridTopologyDataset, id: string): GridDevice | undefined {
  return dataset.devices.find((d) => d.id === id);
}
