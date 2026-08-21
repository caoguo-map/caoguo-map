/**
 * 草果地图交通网组件包 - 类型定义
 *
 * 交通网 MVP 数据模型（PRD phase-3-transport-compute-telecom §3）：
 * - 路网节点（Node）：交叉口/收费站/服务区/停车场
 * - 路段（Road Edge）：高速/国道/省道/城市道路
 * - 事件（Incident）：事故/施工/管制/天气
 * - 流量（Traffic）：路段实时速度/流量
 *
 * 拓扑数据结构参见 PRD §3.1.1
 */

// ============================================================
// 一、道路等级
// ============================================================
/**
 * 道路等级
 * - highway：高速
 * - national：国道
 * - provincial：省道
 * - urban：城市道路
 */
export type RoadClass = 'highway' | 'national' | 'provincial' | 'urban';

export const ROAD_CLASSES: readonly RoadClass[] = [
  'highway',
  'national',
  'provincial',
  'urban',
] as const;

// ============================================================
// 二、节点类型
// ============================================================
/**
 * 路网节点类型
 * - intersection：交叉口
 * - toll：收费站
 * - rest_area：服务区
 * - service_area：服务区（同 rest_area，PRD 同时列出）
 * - parking：停车场
 * - camera：摄像头（事件响应用）
 * - rescue：救援站
 * - hospital：医院
 */
export type RoadNodeKind =
  | 'intersection'
  | 'toll'
  | 'rest_area'
  | 'service_area'
  | 'parking'
  | 'camera'
  | 'rescue'
  | 'hospital';

// ============================================================
// 三、路段状态
// ============================================================
/** 路段状态 */
export type RoadStatus = 'open' | 'closed' | 'construction' | 'controlled';

// ============================================================
// 四、事件类型
// ============================================================
/**
 * 事件类型
 * - accident：事故
 * - construction：施工
 * - control：管制
 * - weather：天气
 */
export type IncidentType = 'accident' | 'construction' | 'control' | 'weather';

/** 事件严重程度 */
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

/** 事件状态（事件时间线） */
export type IncidentStatus = 'occurred' | 'dispatched' | 'handling' | 'resolved';

// ============================================================
// 五、路网节点
// ============================================================
export interface RoadNodeProperties {
  /** 名称（如"汉口站"、"某服务区"） */
  name?: string;
  /** 车道数 */
  lanes?: number;
  /** 免费扩展 */
  extra?: Record<string, unknown>;
}

/**
 * 路网节点
 */
export interface RoadNode {
  id: string;
  /** 节点类型 */
  kind: RoadNodeKind;
  /** 经度（WGS84） */
  lng: number;
  /** 纬度（WGS84） */
  lat: number;
  /** 所属区域（用于 LOD 按需加载） */
  region?: string;
  /** 自定义属性 */
  properties?: RoadNodeProperties;
}

// ============================================================
// 六、路段（Edge）
// ============================================================
export interface RoadEdgeProperties {
  /** 道路名称 */
  roadName?: string;
  /** 车道数 */
  lanes?: number;
  /** 限速（km/h） */
  speedLimit?: number;
  /** 当前状态 */
  status?: RoadStatus;
}

/**
 * 路段
 * fromNode / toNode 是有向连接，但物理上双向通行。
 */
export interface RoadEdge {
  id: string;
  /** 起点节点 id */
  fromNode: string;
  /** 终点节点 id */
  toNode: string;
  /** 道路等级 */
  roadClass: RoadClass;
  /** 几何（可选，未提供时按 from/to 拉直线） */
  geometry?: [number, number][];
  /** 长度（m），可选 */
  length?: number;
  /** 路段属性 */
  properties?: RoadEdgeProperties;
}

// ============================================================
// 七、实时路况
// ============================================================
/** 实时路段速度（用于路况着色 + 预测） */
export interface RoadSpeedRecord {
  /** 路段 id */
  edgeId: string;
  /** 实时速度（km/h） */
  speed: number;
  /** 流量（辆/小时） */
  flow?: number;
  /** 时间戳（ISO 或 epoch ms） */
  timestamp?: number;
}

/** 拥堵等级（PRD §3.2.2 classify_speed） */
export type CongestionLevel = 'free' | 'smooth' | 'slow' | 'congested' | 'jammed';

// ============================================================
// 八、事件
// ============================================================
export interface IncidentProperties {
  /** 事件标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 严重程度 */
  severity?: IncidentSeverity;
  /** 状态 */
  status?: IncidentStatus;
  /** 发生时间（ISO） */
  occurredAt?: string;
  /** 处置时间（ISO） */
  dispatchedAt?: string;
  /** 解除时间（ISO） */
  resolvedAt?: string;
}

/**
 * 交通事件
 */
export interface Incident {
  id: string;
  /** 事件类型 */
  type: IncidentType;
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
  /** 关联路段（可选） */
  edgeId?: string;
  /** 事件属性 */
  properties?: IncidentProperties;
}

// ============================================================
// 九、完整路网拓扑
// ============================================================
export interface RoadNetworkDataset {
  nodes: RoadNode[];
  edges: RoadEdge[];
  /** 实时速度记录（可选，路况着色用） */
  speeds?: RoadSpeedRecord[];
  /** 事件列表（可选，事件响应用） */
  incidents?: Incident[];
}

// ============================================================
// 十、可视化着色模式
// ============================================================
/**
 * 着色模式
 * - roadClass：按道路等级（底图模式）
 * - speed：按实时速度（路况模式）
 * - status：按路段状态
 * - uniform：单一颜色
 */
export type RoadColorBy = 'roadClass' | 'speed' | 'status' | 'uniform';
