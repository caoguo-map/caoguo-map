/**
 * 公共交通（公交/地铁）OD 数据模型（PRD §2.4 `<TransitHeatmap>`）
 */

/** 站点（公交/地铁站点，含经纬度） */
export interface TransitStation {
  id: string;
  name: string;
  lng: number;
  lat: number;
  /** 所属线路（可选，用于着色/筛选） */
  line?: string;
}

/** 一条 OD 记录：从 origin 站到 dest 站的客流量 */
export interface OdRecord {
  origin: string;
  dest: string;
  /** 客流量（人/时段） */
  volume: number;
}

/** 站点聚合吞吐（进出站总量），用于热力点权重 */
export interface StationThroughput {
  stationId: string;
  /** 出站量（作为起点的总量） */
  board: number;
  /** 进站量（作为终点的总量） */
  alight: number;
}

/** 线路优化建议项 */
export interface LineOptimizationSuggestion {
  from: string;
  to: string;
  /** 高 OD 但当前无直达线路的总客流量 */
  unservedVolume: number;
  /** 建议（中文描述） */
  suggestion: string;
}
