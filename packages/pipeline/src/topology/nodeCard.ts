/**
 * 管网设备卡片数据层（PRD phase-1-pipeline §4.1.3 P-3）
 *
 * 与电网包的 `GridTopology.getDeviceDetail()`（PRD G-2）对齐：
 * 纯数据层，补全关联管段数、挂接用户数、卡片展示字段（标题/类型/状态/容量），
 * 供上层 UI 直接渲染，不依赖任何框架、不依赖地图实例。
 *
 * 图片与维护记录为**可选扩展**：从 `properties.extra` 读取，不改动既有数据模型。
 * ```ts
 * node.properties.extra = {
 *   images: ['https://…/valve-01.jpg'],
 *   maintenance: [{ date: '2026-03-12', type: '例行巡检', operator: '张工', note: '密封正常' }],
 * }
 * ```
 */

import { readImages, readMaintenance } from '@caoguo/maplibre';
import type {
  NodeKind,
  PipeMaterial,
  PipeStatus,
  PipelineNode,
  PipelinePipe,
  PipelineTopologyDataset,
  PipelineUser,
  UserKind,
  ValveStatus,
} from '../types';

/**
 * 运维/检修记录（可选扩展，从 `properties.extra.maintenance` 读取）。
 * 定义来自 `@caoguo/maplibre`（三张网统一口径），此处 re-export 保持本包 API 稳定。
 */
import type { MaintenanceRecord } from '@caoguo/maplibre';
export type { MaintenanceRecord };

/** 卡片展示字段（供 UI 直接渲染） */
export interface NodeCardInfo {
  title: string;
  subtitle: string;
  kindLabel: string;
  statusLabel: string;
  capacityLabel?: string;
  images: string[];
  maintenance: MaintenanceRecord[];
}

export interface PipeCardInfo {
  title: string;
  subtitle: string;
  materialLabel: string;
  statusLabel: string;
  specLabel?: string;
  images: string[];
  maintenance: MaintenanceRecord[];
}

/** 节点详情：节点本体 + 关联统计 + 卡片字段 */
export interface PipelineNodeDetail extends PipelineNode {
  /** 与该节点相连的管段数 */
  connectedPipes: number;
  /** 相连的管段 id 列表 */
  connectedPipeIds: string[];
  /** 直接挂接在该节点上的用户数（`user.nodeId === nodeId`） */
  userCount: number;
  /** 其中重要用户（医院/学校/政府/消防）数 */
  importantUserCount: number;
  /** 挂接用户分类计数 */
  userBreakdown: Record<UserKind, number>;
  cardInfo: NodeCardInfo;
}

/** 管段详情：管段本体 + 端点 + 卡片字段 */
export interface PipelinePipeDetail extends PipelinePipe {
  /**
   * 起点节点详情（缺失时 undefined）。
   * 注意：`fromNode` 本身是**节点 id 字符串**（继承自 `PipelinePipe`），
   * 这里用 `fromNodeDetail` 承载节点对象，避免字段语义冲突。
   */
  fromNodeDetail?: PipelineNode;
  /** 终点节点详情（同上） */
  toNodeDetail?: PipelineNode;
  /** 长度（m）：优先取 `length`，否则由 geometry 累加，再退化为起终点直线距离 */
  lengthM: number;
  cardInfo: PipeCardInfo;
}

const NODE_KIND_LABEL: Record<NodeKind, string> = {
  junction: '连接点',
  valve: '阀门',
  pump: '泵站',
  meter: '计量表',
  source: '源头',
  tank: '储罐',
  junction_box: '接线井',
};

const VALVE_STATUS_LABEL: Record<ValveStatus, string> = {
  open: '开启',
  partial: '半开',
  closed: '关闭',
};

const PIPE_STATUS_LABEL: Record<PipeStatus, string> = {
  normal: '正常',
  aging: '老化',
  damaged: '损坏',
  under_repair: '维修中',
  abandoned: '废弃',
  unknown: '未知',
};

const PIPE_MATERIAL_LABEL: Record<PipeMaterial, string> = {
  cast_iron: '铸铁',
  ductile_iron: '球墨铸铁',
  steel: '钢管',
  pe: 'PE',
  pvc: 'PVC',
  concrete: '混凝土',
  hdpe: 'HDPE',
  copper: '铜管',
  unknown: '未知',
};

// 一度 ≈ 111.32 km；用于直线距离退化估算
const DEG_TO_M = 111_320;
const DEFAULT_USER_BREAKDOWN: Record<UserKind, number> = {
  residential: 0,
  commercial: 0,
  industrial: 0,
  important: 0,
};

/**
 * 构建节点详情（P-3 设备卡片数据层）
 * @returns 节点不存在时返回 undefined
 */
export function getNodeDetail(
  dataset: PipelineTopologyDataset,
  nodeId: string,
): PipelineNodeDetail | undefined {
  const node = (dataset.nodes ?? []).find((n) => n.id === nodeId);
  if (!node) return undefined;

  const connected = (dataset.pipes ?? []).filter(
    (p) => p.fromNode === nodeId || p.toNode === nodeId,
  );

  const users: PipelineUser[] = (dataset.users ?? []).filter((u) => u.nodeId === nodeId);
  const userBreakdown = { ...DEFAULT_USER_BREAKDOWN };
  for (const u of users) userBreakdown[u.kind] = (userBreakdown[u.kind] ?? 0) + 1;

  const statusLabel =
    node.kind === 'valve' && node.properties?.valveStatus
      ? VALVE_STATUS_LABEL[node.properties.valveStatus]
      : node.properties?.valveStatus
        ? VALVE_STATUS_LABEL[node.properties.valveStatus]
        : '未知';
  const capacity = node.properties?.capacity;
  const capacityLabel = capacity != null ? `${capacity} m³/h` : undefined;

  return {
    ...node,
    connectedPipes: connected.length,
    connectedPipeIds: connected.map((p) => p.id),
    userCount: users.length,
    importantUserCount: userBreakdown.important,
    userBreakdown,
    cardInfo: {
      title: node.properties?.code ?? node.id,
      subtitle: `${NODE_KIND_LABEL[node.kind]} · ${node.id}`,
      kindLabel: NODE_KIND_LABEL[node.kind],
      statusLabel,
      ...(capacityLabel ? { capacityLabel } : {}),
      images: readImages(node.properties?.extra),
      maintenance: readMaintenance(node.properties?.extra),
    },
  };
}

/** 两点球面简化距离（m）：经度按纬度收敛修正 */
function straightDistanceM(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const latRad = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lng - a.lng) * DEG_TO_M * Math.cos(latRad);
  const dy = (b.lat - a.lat) * DEG_TO_M;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 由折线几何累加长度（m）；不足两个点返回 0 */
export function polylineLengthM(geometry: [number, number][] | undefined): number {
  if (!geometry || geometry.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < geometry.length; i += 1) {
    total += straightDistanceM(
      { lng: geometry[i - 1][0], lat: geometry[i - 1][1] },
      { lng: geometry[i][0], lat: geometry[i][1] },
    );
  }
  return total;
}

/**
 * 构建管段详情（P-3 设备卡片数据层）
 * @returns 管段不存在时返回 undefined
 */
export function getPipeDetail(
  dataset: PipelineTopologyDataset,
  pipeId: string,
): PipelinePipeDetail | undefined {
  const pipe = (dataset.pipes ?? []).find((p) => p.id === pipeId);
  if (!pipe) return undefined;

  const nodes = dataset.nodes ?? [];
  const fromNode = nodes.find((n) => n.id === pipe.fromNode);
  const toNode = nodes.find((n) => n.id === pipe.toNode);

  // 注意：polylineLengthM 在无几何时返回 0 而非 undefined，不能用 ?? 串联
  let lengthM: number;
  if (pipe.length != null) {
    lengthM = pipe.length;
  } else {
    const geoLength = polylineLengthM(pipe.geometry);
    lengthM = geoLength > 0 ? geoLength : fromNode && toNode ? straightDistanceM(fromNode, toNode) : 0;
  }

  const material = pipe.properties?.material ?? 'unknown';
  const status = pipe.properties?.status ?? 'unknown';
  const diameter = pipe.properties?.diameter;

  return {
    ...pipe,
    ...(fromNode ? { fromNodeDetail: fromNode } : {}),
    ...(toNode ? { toNodeDetail: toNode } : {}),
    lengthM,
    cardInfo: {
      title: pipe.properties?.owner
        ? `${pipe.properties.owner} · ${pipe.id}`
        : pipe.id,
      subtitle: `${diameter != null ? `DN${diameter}` : '管径未知'} · ${fromNode?.properties?.code ?? pipe.fromNode} → ${toNode?.properties?.code ?? pipe.toNode}`,
      materialLabel: PIPE_MATERIAL_LABEL[material],
      statusLabel: PIPE_STATUS_LABEL[status],
      specLabel:
        diameter != null ? `DN${diameter} · ${lengthM.toFixed(0)} m` : `${lengthM.toFixed(0)} m`,
      images: readImages(pipe.properties?.extra),
      maintenance: readMaintenance(pipe.properties?.extra),
    },
  };
}
