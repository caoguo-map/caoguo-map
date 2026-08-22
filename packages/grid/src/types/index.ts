/**
 * 草果地图电网组件包 - 类型定义
 *
 * 电网 MVP 数据模型（PRD phase-2-grid-water §3.1.1）：
 * - 5 级层级：发电（L1）→ 输电（L2）→ 变电（L3）→ 配电（L4）→ 用户（L5）
 * - 设备（Device）：变电站/线路/铁塔/配变/用户等
 * - 线路（Line/Edge）：连接两个设备的物理连接
 *
 * 拓扑数据结构参见 PRD phase-2-grid-water §3.1。
 */

// ============================================================
// 一、电压等级
// ============================================================
/**
 * 电压等级（kV）
 * - 1000：特高压
 * - 500 / 220 / 110：高压（输电/变电）
 * - 35 / 10：中低压（配电）
 * - 0.4：低压（用户）
 */
export type VoltageLevel = '1000' | '500' | '220' | '110' | '35' | '10' | '0.4';

/** 所有支持的电压等级 */
export const VOLTAGE_LEVELS: readonly VoltageLevel[] = [
  '1000',
  '500',
  '220',
  '110',
  '35',
  '10',
  '0.4',
] as const;

// ============================================================
// 二、设备（Device）与层级
// ============================================================
/**
 * 电网设备类型
 * - plant：发电厂（火电/水电/光伏/风电）
 * - tower：输电铁塔
 * - substation：变电站
 * - transformer：配变（10kV/0.4kV）
 * - user：低压用户（居民/商业/工业）
 */
export type GridDeviceKind =
  | 'plant'
  | 'tower'
  | 'substation'
  | 'transformer'
  | 'user';

/**
 * 电网层级（5 级钻取，PRD §3.1.1）
 * - L1 发电 / L2 输电 / L3 变电 / L4 配电 / L5 用户
 */
export type GridLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

/** 设备类型 → 层级映射 */
export const DEVICE_LEVEL: Record<GridDeviceKind, GridLevel> = {
  plant: 'L1',
  tower: 'L2',
  substation: 'L3',
  transformer: 'L4',
  user: 'L5',
};

/** 发电类型（plant 细分） */
export type PlantType = 'thermal' | 'hydro' | 'solar' | 'wind';

/** 用户类型 */
export type GridUserKind = 'residential' | 'commercial' | 'industrial' | 'important';

// ============================================================
// 三、设备属性
// ============================================================
export interface GridDeviceProperties {
  /** 设备编号 */
  code?: string;
  /** 额定容量（MVA，变电站/配变） */
  capacity?: number;
  /** 发电装机（MW，电厂） */
  installedCapacity?: number;
  /** 发电类型（电厂） */
  plantType?: PlantType;
  /** 电压等级（kV） */
  voltage?: VoltageLevel;
  /** 运行状态：running/standby/fault/maintenance */
  status?: GridDeviceStatus;
  /** 投运年份 */
  commissionYear?: number;
  /** 当前负荷率（0-1，配变/台区） */
  loadRate?: number;
  /** 产权单位 */
  owner?: string;
  /** 自由扩展 */
  extra?: Record<string, unknown>;
}

/** 运行状态 */
export type GridDeviceStatus = 'running' | 'standby' | 'fault' | 'maintenance';

// ============================================================
// 四、设备（Device）
// ============================================================
/** 电网设备（节点），position 为 [lng, lat] */
export interface GridDevice {
  id: string;
  /** 设备类型 */
  kind: GridDeviceKind;
  /** 经度（WGS84） */
  lng: number;
  /** 纬度（WGS84） */
  lat: number;
  /** 设备名称 */
  name?: string;
  /** 所属层级（冗余，可由 kind 推导） */
  level?: GridLevel;
  /** 区域（用于层级钻取/专题） */
  region?: string;
  /** 设备属性 */
  properties?: GridDeviceProperties;
}

// ============================================================
// 四-B、设备卡片详情（PRD G-2 设备卡片数据层）
// ============================================================
/**
 * 设备卡片详情（供上层 UI 弹卡片，G-2）。
 * 在 {@link GridDevice} 基础上补全「关联网路」「供电下游用户」等卡片展示字段。
 */
export interface GridDeviceDetail extends GridDevice {
  /** 关联线路数（该设备作为端点的线路条数） */
  connectedLines: number;
  /** 供电下游用户数（按上游可达性估算；仅配变/变电站/线路有意义） */
  downstreamUserCount: number;
  /** 卡片展示用的关键信息（已格式化，便于直接渲染） */
  cardInfo: {
    title: string;
    subtitle: string;
    statusLabel: string;
    levelLabel: string;
    capacityLabel?: string;
  };
}

// ============================================================
// 五、线路（Line/Edge）
// ============================================================
/**
 * 电网线路类型
 * - transmission：输电线路（220kV+）
 * - distribution：配电线路（10/35kV）
 * - service：低压接入线（用户）
 */
export type GridLineType = 'transmission' | 'distribution' | 'service';

export interface GridLineProperties {
  /** 电压等级（kV） */
  voltage?: VoltageLevel;
  /** 线路类型 */
  lineType?: GridLineType;
  /** 运行状态 */
  status?: GridDeviceStatus;
  /** 投运年份 */
  commissionYear?: number;
  /** 当前负载率（0-1） */
  loadRate?: number;
  /** 长度（m） */
  length?: number;
  /** 自由扩展 */
  extra?: Record<string, unknown>;
}

/** 电网线路（连接两个设备的物理线路） */
export interface GridLine {
  id: string;
  /** 起点设备 id */
  fromDevice: string;
  /** 终点设备 id */
  toDevice: string;
  /** 线路类型 */
  lineType: GridLineType;
  /** 几何（可选，未提供按 from/to 拉直线） */
  geometry?: [number, number][];
  /** 长度（m），可选 */
  length?: number;
  /** 线路属性 */
  properties?: GridLineProperties;
}

// ============================================================
// 六、用户（L5，停电分析用）
// ============================================================
export interface GridUser {
  id: string;
  /** 用户名 */
  name?: string;
  /** 类型 */
  kind: GridUserKind;
  /** 所属设备（配变）id */
  deviceId?: string;
  /** 位置 */
  lng: number;
  lat: number;
  /** 区域 */
  region?: string;
  /** 人口/户数 */
  scale?: number;
  /** 重要用户原因（医院/学校/政府） */
  reason?: string;
}

// ============================================================
// 七、完整电网拓扑
// ============================================================
/**
 * 电网拓扑数据集（完整 MVP 输入）
 * - devices：设备列表（节点）
 * - lines：线路列表（边）
 * - users：用户列表（可选，停电分析需要）
 */
export interface GridTopologyDataset {
  devices: GridDevice[];
  lines: GridLine[];
  users?: GridUser[];
}

// ============================================================
// 八、事件载荷
// ============================================================
export interface GridDeviceSelectEvent {
  device: GridDevice;
  point?: { x: number; y: number };
}

export interface GridLineSelectEvent {
  line: GridLine;
  point?: { x: number; y: number };
}

export interface GridDrillEvent {
  from: GridLevel | null;
  to: GridLevel;
}

// ============================================================
// 九、着色模式（caoguo-grid 主题）
// ============================================================
/**
 * 电网着色模式
 * - voltage：按电压等级（PRD §3.1.3）
 * - status：按运行状态
 * - load：按负载率
 * - year：按投运年份
 * - uniform：单一颜色
 */
export type GridColorByMode = 'voltage' | 'status' | 'load' | 'year' | 'uniform';
