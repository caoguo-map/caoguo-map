/**
 * 草果地图算力网组件包 - 类型定义
 *
 * 算力网 MVP 数据模型（PRD phase-3 §4）：
 * - 节点（ComputeNode）：数据中心/边缘节点/区域云
 * - 链路（FiberLink）：光缆/微波/卫星
 *
 * 拓扑数据结构参见 PRD §4.1.1
 */

// ============================================================
// 一、节点类型
// ============================================================
/**
 * 节点类型
 * - datacenter：数据中心
 * - edge_node：边缘节点
 * - cloud_region：区域云
 */
export type ComputeNodeType = 'datacenter' | 'edge_node' | 'cloud_region';

export const COMPUTE_NODE_TYPES: readonly ComputeNodeType[] = [
  'datacenter',
  'edge_node',
  'cloud_region',
] as const;

/** 节点状态 */
export type ComputeNodeStatus = 'online' | 'offline' | 'maintenance';

// ============================================================
// 二、链路类型
// ============================================================
/**
 * 链路类型
 * - fiber：光缆
 * - microwave：微波
 * - satellite：卫星
 */
export type FiberLinkType = 'fiber' | 'microwave' | 'satellite';

// ============================================================
// 三、算力节点
// ============================================================
export interface ComputeNodeProperties {
  /** 总算力（TFLOPS 字符串，如 "1000 TFLOPS"） */
  totalCompute?: string;
  /** 已用算力（TFLOPS 字符串） */
  usedCompute?: string;
  /** GPU 数量 */
  gpuCount?: number;
  /** GPU 利用率 0-1 */
  gpuUtilization?: number;
  /** 存储（如 "10 PB"） */
  storage?: string;
  /** 网络带宽（如 "100 Gbps"） */
  networkBandwidth?: string;
  /** 状态 */
  status?: ComputeNodeStatus;
  /** 区域 */
  region?: string;
  /** 扩展 */
  extra?: Record<string, unknown>;
}

/**
 * 算力节点
 */
export interface ComputeNode {
  id: string;
  /** 节点类型 */
  type: ComputeNodeType;
  /** 经度（WGS84） */
  lng: number;
  /** 纬度（WGS84） */
  lat: number;
  /** 名称 */
  name?: string;
  /** 属性 */
  properties?: ComputeNodeProperties;
}

// ============================================================
// 四、光缆链路
// ============================================================
export interface FiberLinkProperties {
  /** 带宽（如 "100 Gbps"） */
  bandwidth?: string;
  /** 带宽数值（Gbps，用于线宽分级） */
  bandwidthGbps?: number;
  /** 延迟（ms） */
  latencyMs?: number;
  /** 利用率 0-1 */
  utilization?: number;
  /** 类型 */
  type?: FiberLinkType;
}

/**
 * 光缆链路
 */
export interface FiberLink {
  id: string;
  /** 起点节点 id */
  fromNode: string;
  /** 终点节点 id */
  toNode: string;
  /** 几何（可选） */
  geometry?: [number, number][];
  /** 属性 */
  properties?: FiberLinkProperties;
}

// ============================================================
// 五、完整算力拓扑
// ============================================================
export interface ComputeTopologyDataset {
  nodes: ComputeNode[];
  links: FiberLink[];
}

// ============================================================
// 六、延迟测量
// ============================================================
/** 延迟测量记录（LM-3 延迟趋势用） */
export interface LatencyRecord {
  /** 链路 id */
  linkId: string;
  /** 延迟（ms） */
  latencyMs: number;
  /** 时间戳 */
  timestamp?: number;
}

// ============================================================
// 七、着色模式
// ============================================================
/**
 * 节点着色模式
 * - type：按节点类型
 * - gpuUtil：按 GPU 利用率
 * - status：按状态
 */
export type ComputeNodeColorBy = 'type' | 'gpuUtil' | 'status';

/** 链路着色模式 */
export type LinkColorBy = 'utilization' | 'type';
