/**
 * 草果地图管网组件包 - 类型定义
 *
 * 地下管网 MVP 数据模型：
 * - 节点（Node）：管段的交汇点/设备点（阀门/泵/表/源头）
 * - 管段（Pipe/Edge）：连接两个节点的物理管线
 * - 用户（User）：连接到节点的消费方（居民/商业/工业）
 *
 * 拓扑数据结构参见 PRD phase-1-pipeline §4.1.2
 */

// ============================================================
// 一、管线类型（基础设施大类）
// ============================================================
/**
 * 管网大类
 * - gas：燃气
 * - water：供水
 * - drainage：排水
 * - heating：供热
 * - power：电力（管沟）
 * - telecom：通信（管沟）
 */
export type PipelineType = 'gas' | 'water' | 'drainage' | 'heating' | 'power' | 'telecom';

/** 所有支持的管线大类（便于运行时校验） */
export const PIPELINE_TYPES: readonly PipelineType[] = [
  'gas',
  'water',
  'drainage',
  'heating',
  'power',
  'telecom',
] as const;

// ============================================================
// 二、节点（Node）
// ============================================================
/**
 * 节点类型
 * - junction：普通连接点（三通/四通/弯头等）
 * - valve：阀门（可关闭以隔离故障段）
 * - pump：泵站（供水加压/供热循环）
 * - meter：计量表/用户表
 * - source：源头（制水厂/燃气门站/热源厂）
 * - tank：储水罐/储气罐
 * - junction_box：电缆/光缆接线井
 */
export type NodeKind =
  | 'junction'
  | 'valve'
  | 'pump'
  | 'meter'
  | 'source'
  | 'tank'
  | 'junction_box';

/** 阀门子类型 */
export type ValveType = 'gate' | 'butterfly' | 'check' | 'pressure_reduction' | 'control';

/** 阀门状态（用于爆管推演隔离方案） */
export type ValveStatus = 'open' | 'closed' | 'partial';

// ============================================================
// 三、管段（Pipe/Edge）
// ============================================================
/**
 * 管段材质
 * - cast_iron：铸铁（旧管网主力）
 * - ductile_iron：球墨铸铁（当前主流）
 * - steel：钢管（高压/燃气主干）
 * - pe：聚乙烯（PE，现代供水/燃气）
 * - pvc：聚氯乙烯（PVC，排水）
 * - concrete：混凝土（排水/给水主干）
 * - hdpe：高密度聚乙烯
 * - copper：铜管（室内引入管）
 * - unknown：未知
 */
export type PipeMaterial =
  | 'cast_iron'
  | 'ductile_iron'
  | 'steel'
  | 'pe'
  | 'pvc'
  | 'concrete'
  | 'hdpe'
  | 'copper'
  | 'unknown';

/**
 * 管段状态
 * - normal：正常运行
 * - aging：老化（建议关注）
 * - damaged：损坏（泄漏/破裂）
 * - under_repair：维修中（部分阀门/路段暂停使用）
 * - abandoned：废弃
 * - unknown：未知
 */
export type PipeStatus =
  | 'normal'
  | 'aging'
  | 'damaged'
  | 'under_repair'
  | 'abandoned'
  | 'unknown';

// ============================================================
// 四、设备附加属性（管段 / 节点公用扩展）
// ============================================================
export interface PipeProperties {
  /** 公称直径（mm），如 DN150 = 150 */
  diameter?: number;
  /** 管材 */
  material?: PipeMaterial;
  /** 安装日期（ISO 字符串） */
  installDate?: string;
  /** 工作压力（MPa） */
  pressure?: number;
  /** 最高允许压力（MPa） */
  ratedPressure?: number;
  /** 当前状态 */
  status?: PipeStatus;
  /** 埋深（m） */
  depth?: number;
  /** 建设单位 */
  owner?: string;
  /** 自由扩展（运维记录/检测报告 URL 等） */
  extra?: Record<string, unknown>;
}

export interface NodeProperties {
  /** 设备编号 */
  code?: string;
  /** 阀门类型（仅 valve） */
  valveType?: ValveType;
  /** 阀门状态（仅 valve） */
  valveStatus?: ValveStatus;
  /** 流量/供气能力（m³/h，仅 source/pump） */
  capacity?: number;
  /** 安装日期 */
  installDate?: string;
  /** 产权单位 */
  owner?: string;
  /** 海拔（m，用于地形修正） */
  elevation?: number;
  /** 自由扩展 */
  extra?: Record<string, unknown>;
}

// ============================================================
// 五、节点（Node）
// ============================================================
/**
 * 管网节点
 * position 为 [lng, lat]（GeoJSON 习惯），不是 [lat, lng]
 */
export interface PipelineNode {
  id: string;
  /** 节点类型 */
  kind: NodeKind;
  /** 经度（WGS84） */
  lng: number;
  /** 纬度（WGS84） */
  lat: number;
  /** 所属管线大类（燃气/供水等） */
  pipelineType?: PipelineType;
  /** 行政区/区域（用于层级钻取） */
  region?: string;
  /** 自定义属性 */
  properties?: NodeProperties;
}

// ============================================================
// 六、管段（Pipe/Edge）
// ============================================================
/**
 * 管网管段
 * from_node / to_node 是有向连接，但物理上双向导通。
 * 地理 LineString 用 [[lng,lat], ...] 表示。
 */
export interface PipelinePipe {
  id: string;
  /** 起点节点 id */
  fromNode: string;
  /** 终点节点 id */
  toNode: string;
  /** 管段类型，固定为 'pipe'（预留扩展如 'channel'/'duct'） */
  type: 'pipe';
  /** 所属管线大类 */
  pipelineType?: PipelineType;
  /** 区域编码（用于 LOD 按需加载） */
  region?: string;
  /** 几何（可选，未提供时按 from/to 拉直线） */
  geometry?: [number, number][];
  /** 长度（m），可选，由 geometry 计算 */
  length?: number;
  /** 管段属性 */
  properties?: PipeProperties;
}

// ============================================================
// 七、用户/建筑（爆管推演影响分析用）
// ============================================================
/**
 * 用户类型
 * - residential：居民
 * - commercial：商业
 * - industrial：工业
 * - important：重要用户（医院/学校/政府部门/消防）
 */
export type UserKind = 'residential' | 'commercial' | 'industrial' | 'important';

export interface PipelineUser {
  id: string;
  /** 用户名 */
  name?: string;
  /** 类型 */
  kind: UserKind;
  /** 所属节点 id（直接或间接连接） */
  nodeId?: string;
  /** 位置 */
  lng: number;
  lat: number;
  /** 区域 */
  region?: string;
  /** 人口/用量（可选） */
  scale?: number;
  /** 备注 */
  note?: string;
}

// ============================================================
// 八、完整管网拓扑
// ============================================================
/**
 * 管网拓扑数据集（完整 MVP 输入）
 * - nodes：节点列表
 * - pipes：管段列表
 * - users：用户列表（可选，爆管推演需要）
 */
export interface PipelineTopologyDataset {
  nodes: PipelineNode[];
  pipes: PipelinePipe[];
  users?: PipelineUser[];
}

// ============================================================
// 九、事件载荷（包内统一事件类型）
// ============================================================
/** 选中节点 */
export interface NodeSelectEvent {
  node: PipelineNode;
  /** 在鼠标事件中的屏幕坐标（可选） */
  point?: { x: number; y: number };
}

/** 选中管段 */
export interface PipeSelectEvent {
  pipe: PipelinePipe;
  point?: { x: number; y: number };
}

/** 钻取事件（区域层级下钻） */
export interface DrillDownEvent {
  /** 上一级区域 */
  from: string | null;
  /** 目标区域 */
  to: string;
}

// ============================================================
// 十、可视化着色规则（caoguo-pipeline 主题）
// ============================================================
/**
 * 着色模式（管线渲染）
 * - type：按管线大类着色（燃气黄/供水蓝等）
 * - diameter：按管径着色（PRD §4.1.4）
 * - status：按管段状态着色
 * - material：按管材着色
 * - health：按健康度着色（PipelineHealth 集成）
 * - uniform：单一颜色
 */
export type ColorByMode =
  | 'type'
  | 'diameter'
  | 'status'
  | 'material'
  | 'health'
  | 'uniform';
