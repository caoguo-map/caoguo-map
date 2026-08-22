/**
 * 草果地图通信网组件包 - 类型定义
 *
 * 通信网 MVP 数据模型（PRD phase-3 §5）：
 * - 基站（BaseStation）：宏站/微站/室内分布
 * - 覆盖区域（CoverageArea）：扇区覆盖多边形
 *
 * 拓扑数据结构参见 PRD §5.1.1
 */

// ============================================================
// 一、基站类型
// ============================================================
/**
 * 基站类型
 * - macro：宏站
 * - micro：微站
 * - indoor_das：室内分布
 */
export type BaseStationType = 'macro' | 'micro' | 'indoor_das';

/** 运营商 */
export type Carrier = '中国移动' | '中国联通' | '中国电信' | '中国广电';

/** 技术制式 */
export type Technology = '5G' | '4G' | '3G';

/** 基站状态 */
export type StationStatus = 'online' | 'offline' | 'fault';

// ============================================================
// 二、基站属性
// ============================================================
export interface BaseStationProperties {
  /** 技术制式 */
  technology?: Technology;
  /** 频段 */
  frequency?: string;
  /** 发射功率（dBm） */
  powerDbm?: number;
  /** 天线挂高（m） */
  heightM?: number;
  /** 扇区方位角（度） */
  azimuth?: number[];
  /** 下倾角（度） */
  tilt?: number;
  /** 状态 */
  status?: StationStatus;
  /** 用户数 */
  userCount?: number;
  /** 吞吐量（Mbps） */
  throughputMbps?: number;
  /** 区域 */
  region?: string;
  /** 扩展 */
  extra?: Record<string, unknown>;
}

/**
 * 基站
 */
export interface BaseStation {
  id: string;
  /** 基站类型 */
  type: BaseStationType;
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
  /** 名称 */
  name?: string;
  /** 运营商 */
  carrier: Carrier;
  /** 属性 */
  properties?: BaseStationProperties;
}

// ============================================================
// 三、覆盖区域
// ============================================================
/** 信号等级 */
export type SignalLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface CoverageArea {
  /** 基站 id */
  stationId: string;
  /** 扇区 id */
  sectorId?: string;
  /** 覆盖范围多边形（[lng,lat][]） */
  geom: [number, number][];
  /** 信号等级 */
  signalLevel: SignalLevel;
}

// ============================================================
// 四、完整通信拓扑
// ============================================================
export interface TelecomTopologyDataset {
  baseStations: BaseStation[];
  coverageAreas: CoverageArea[];
  /** 信号采样点（路测/用户上报，CC-3 信号热力图用，可选） */
  signalSamples?: SignalSample[];
}

// ============================================================
// 五、信号测量
// ============================================================
/** 信号测量点（路测/用户上报，热力图用） */
export interface SignalSample {
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
  /** RSRP（dBm，如 -90） */
  rsrp: number;
}

// ============================================================
// 六、着色模式
// ============================================================
export type StationColorBy = 'carrier' | 'technology' | 'status';
