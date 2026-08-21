/**
 * OutageAnalyzer 核心算法（纯函数）
 *
 * PRD phase-2-grid-water §3.2：
 * 选择故障设备（线路/变电站/配变）→ 后端拓扑分析：
 * 1. 识别故障设备所在供电区域
 * 2. 遍历下游所有受影响节点
 * 3. 统计受影响用户（居民/商业/工业/重要）
 * 4. 检查是否有备用供电路径
 *
 * 全部为纯函数，可在 Node/浏览器两侧运行。
 */

import type {
  GridTopologyDataset,
  GridDevice,
  GridLine,
  GridUser,
  GridUserKind,
} from '../types';
import { buildGridAdjacency, gridBfs, haversine } from '../graph/gridGraph';

/** 受影响用户统计 */
export interface AffectedUserStats {
  total: number;
  residential: number;
  commercial: number;
  industrial: number;
  important: GridUser[];
}

/** 恢复方案 */
export interface RestorationPlan {
  estimatedTime: string;
  /** 备用供电路径（线 id 序列） */
  alternativePaths: string[][];
  /** 恢复操作步骤 */
  steps: string[];
}

/** 停电分析结果 */
export interface OutageResult {
  /** 故障设备 */
  faultDevice: GridDevice | GridLine;
  /** 受影响设备 */
  affectedDevices: GridDevice[];
  /** 受影响线路 */
  affectedLines: GridLine[];
  /** 受影响用户统计 */
  affectedUsers: AffectedUserStats;
  /** 恢复方案 */
  restoration: RestorationPlan;
  /** 计算耗时（ms） */
  durationMs: number;
}

export interface OutageOptions {
  /** 最大遍历深度 */
  maxDepth?: number;
}

/**
 * 主入口：执行停电分析
 * @param dataset 电网拓扑
 * @param faultId 故障设备或线路 id
 */
export function analyzeOutage(
  dataset: GridTopologyDataset,
  faultId: string,
  opts: OutageOptions = {}
): OutageResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const maxDepth = opts.maxDepth ?? 1000;

  const device = dataset.devices.find((d) => d.id === faultId);
  const line = dataset.lines.find((l) => l.id === faultId);

  if (!device && !line) {
    throw new Error(`OutageAnalyzer: '${faultId}' not found in dataset`);
  }

  const faultDevice: GridDevice | GridLine = device ?? line!;

  // 1) 确定故障起点（线路的末端 = 供电下游方向）
  const adj = buildGridAdjacency(dataset);
  let startId = faultId;
  let direction: 'downstream' | 'both' = 'both';
  if (device) {
    startId = device.id;
    direction = 'downstream';
  } else if (line) {
    // 线路故障：下游从 toDevice 开始（能源流向 from→to）
    startId = line.toDevice;
    direction = 'downstream';
  }

  // 2) 下游遍历
  let affectedSet: Set<string>;
  if (device) {
    affectedSet = gridBfs(adj, dataset, startId, direction, maxDepth);
  } else {
    // 线路故障：起点两端都算受影响
    affectedSet = gridBfs(adj, dataset, startId, direction, maxDepth);
    affectedSet.add(line!.fromDevice);
  }

  const deviceByIdMap = new Map(dataset.devices.map((d) => [d.id, d] as const));
  const affectedDevices: GridDevice[] = [];
  for (const id of affectedSet) {
    const d = deviceByIdMap.get(id);
    if (d) affectedDevices.push(d);
  }

  const affectedLines: GridLine[] = dataset.lines.filter(
    (l) => affectedSet.has(l.fromDevice) || affectedSet.has(l.toDevice)
  );

  // 3) 统计受影响用户
  const users = dataset.users ?? [];
  const affectedUsersList = users.filter((u) => u.deviceId && affectedSet.has(u.deviceId));
  const affectedUsers: AffectedUserStats = {
    total: affectedUsersList.length,
    residential: affectedUsersList.filter((u) => u.kind === 'residential').length,
    commercial: affectedUsersList.filter((u) => u.kind === 'commercial').length,
    industrial: affectedUsersList.filter((u) => u.kind === 'industrial').length,
    important: affectedUsersList.filter((u) => u.kind === 'important'),
  };

  // 4) 备用供电路径（检测是否存在其他发电厂可达）
  const restoration = buildRestoration(dataset, adj, affectedSet, affectedUsers.total);

  const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  return {
    faultDevice,
    affectedDevices,
    affectedLines,
    affectedUsers,
    restoration,
    durationMs,
  };
}

/**
 * 构造恢复方案：
 * - 检查受影响区域是否有其它发电厂（source）可达 → 备用路径
 * - 按受影响用户数估算恢复时间
 */
function buildRestoration(
  dataset: GridTopologyDataset,
  adj: Map<string, { lineId: string; to: string; length: number }[]>,
  affectedSet: Set<string>,
  userCount: number
): RestorationPlan {
  const plants = dataset.devices.filter((d) => d.kind === 'plant');
  const alternativePaths: string[][] = [];

  // 找受影响区域内是否有其它电厂可达（备用电源）
  for (const plant of plants) {
    if (affectedSet.has(plant.id)) continue; // 故障电厂本身
    const reachable = gridBfs(adj, dataset, plant.id, 'both', 50);
    for (const affectedId of affectedSet) {
      if (reachable.has(affectedId)) {
        // 记录一条备用路径（简化：plant → affected）
        alternativePaths.push([plant.id, affectedId]);
        break;
      }
    }
    if (alternativePaths.length > 0) break;
  }

  const steps: string[] = [];
  steps.push('隔离故障设备');
  steps.push('启动备用电源切换');
  if (alternativePaths.length > 0) {
    steps.push('通过备用线路恢复供电');
  } else {
    steps.push('抢修故障设备后恢复');
  }

  const baseHours = userCount / 300;
  const hours = Math.max(0.5, Math.min(6, baseHours));
  const estimatedTime = hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}min`;

  return { estimatedTime, alternativePaths, steps };
}

/** 用户严重程度打分（用于优先通告） */
export function gridUserSeverity(kind: GridUserKind): number {
  const base: Record<GridUserKind, number> = {
    important: 100,
    industrial: 50,
    commercial: 20,
    residential: 1,
  };
  return base[kind] ?? 1;
}

/** 受影响区域凸包（Andrew's monotone chain） */
export function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return [...points];
  const pts = [...points];
  pts.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

  const cross = (o: [number, number], a: [number, number], b: [number, number]): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** 受影响区域中心（质心，用于地图定位） */
export function centroid(points: [number, number][]): [number, number] {
  if (points.length === 0) return [0, 0];
  const sum = points.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number],
    [0, 0] as [number, number]
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

export { haversine };
