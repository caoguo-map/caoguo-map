/**
 * 草果地图水网组件包 - 类型定义
 *
 * 水网 MVP 数据模型（PRD phase-2-grid-water §4.1）：
 * - 水系拓扑：流域 → 干流 → 支流 → 河段
 * - 水库（库容/水位/蓄泄状态）
 * - 闸站（类型/启闭状态/过流能力）
 * - 堤防（等级/长度/警戒水位）
 * - 雨量站（实时降雨量）
 * - 水位站（实时水位）
 */

// ============================================================
// 一、水系要素类型
// ============================================================
/** 水系要素类型 */
export type WaterFeatureKind =
  | 'basin'       // 流域
  | 'mainstream'  // 干流
  | 'tributary'   // 支流
  | 'reach'       // 河段
  | 'reservoir'   // 水库
  | 'gate'        // 闸站
  | 'dike'        // 堤防
  | 'rainStation' // 雨量站
  | 'waterStation'; // 水位站

/** 河流层级（流域→干流→支流→河段） */
export type RiverLevel = 'basin' | 'mainstream' | 'tributary' | 'reach';

/** 水库蓄泄状态 */
export type ReservoirStatus = 'storing' | 'discharging' | 'balanced';

/** 闸站类型 */
export type GateType = 'sluice' | 'floodgate' | 'pumping';

/** 闸站启闭状态 */
export type GateStatus = 'open' | 'closed' | 'partial';

/** 堤防安全状态 */
export type DikeSafetyLevel = 'safe' | 'warning' | 'danger' | 'breach';

// ============================================================
// 二、属性
// ============================================================
export interface WaterFeatureProperties {
  /** 要素编号 */
  code?: string;
  /** 河流层级 */
  level?: RiverLevel;
  /** 流量（m³/s） */
  flowRate?: number;
  /** 蓄水率（0-1，水库） */
  storageRate?: number;
  /** 库容（万 m³，水库） */
  capacity?: number;
  /** 当前水位（m） */
  waterLevel?: number;
  /** 警戒水位（m） */
  warningLevel?: number;
  /** 蓄泄状态（水库） */
  reservoirStatus?: ReservoirStatus;
  /** 入库流量（m³/s） */
  inflow?: number;
  /** 出库流量（m³/s） */
  outflow?: number;
  /** 闸站类型 */
  gateType?: GateType;
  /** 闸站启闭状态 */
  gateStatus?: GateStatus;
  /** 过流能力（m³/s） */
  dischargeCapacity?: number;
  /** 堤防安全状态 */
  safetyLevel?: DikeSafetyLevel;
  /** 堤防等级（1-5） */
  dikeGrade?: number;
  /** 堤防长度（km） */
  dikeLength?: number;
  /** 实时降雨量（mm） */
  rainfall?: number;
  /** 自由扩展 */
  extra?: Record<string, unknown>;
}

// ============================================================
// 三、要素
// ============================================================
/** 水系要素（点/线/面），position 为 [lng, lat] */
export interface WaterFeature {
  id: string;
  /** 要素类型 */
  kind: WaterFeatureKind;
  /** 名称 */
  name?: string;
  /** 所属流域/上级河段 id（层级关系） */
  parentId?: string;
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
  /** 几何（线要素可选） */
  geometry?: [number, number][];
  /** 属性 */
  properties?: WaterFeatureProperties;
}

// ============================================================
// 四、完整水网数据集
// ============================================================
/**
 * 水网数据集（完整 MVP 输入）
 * - features：水系要素（河流/水库/闸站/堤防/雨量站/水位站）
 */
export interface WaterDataset {
  features: WaterFeature[];
}

// ============================================================
// 五、淹没模拟
// ============================================================
export interface FloodInput {
  /** 降雨量（mm）或上游来水量（m³/s） */
  rainfall?: number;
  inflow?: number;
  /** 河段 id */
  reachId?: string;
  /** 径流系数（SCS-CN 模型） */
  curveNumber?: number;
  /** 降雨强度（mm/h，推理公式法） */
  rainfallIntensity?: number;
  /** 集雨面积（km²） */
  catchmentArea?: number;
  /** 汇流时间（h） */
  concentrationTime?: number;
}

export interface FloodResult {
  /** 洪峰流量（m³/s） */
  peakFlow: number;
  /** 径流量（mm，SCS-CN） */
  runoff: number;
  /** 淹没范围多边形（GeoJSON） */
  inundationPolygon: [number, number][];
  /** 最大水深（m） */
  maxDepth: number;
  /** 淹没面积（km²） */
  inundatedArea: number;
  /** 受影响要素 */
  affectedFeatures: WaterFeature[];
  /** 计算耗时（ms） */
  durationMs: number;
}

// ============================================================
// 六、水库调度
// ============================================================
export interface DamScheduleInput {
  /** 各水库出库流量调整（m³/s） */
  outflows: Record<string, number>;
}

export interface DamScheduleResult {
  /** 下游水位变化（按河段/水位站） */
  downstreamLevels: Array<{ stationId: string; levelChange: number; level: number }>;
  /** 各水库蓄泄状态变化 */
  reservoirStates: Array<{ reservoirId: string; storageRate: number; status: ReservoirStatus }>;
  /** 计算耗时（ms） */
  durationMs: number;
}

// ============================================================
// 七、着色模式（caoguo-water 主题）
// ============================================================
/**
 * 水网着色模式
 * - flow：按流量（PRD §4.1.3）
 * - storage：按蓄水率
 * - dike：按堤防安全状态
 * - level：按河流层级
 * - uniform：单一颜色
 */
export type WaterColorByMode = 'flow' | 'storage' | 'dike' | 'level' | 'uniform';
