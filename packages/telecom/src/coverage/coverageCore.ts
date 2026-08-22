/**
 * CellCoverage 覆盖分析核心算法（纯函数，PRD §5.1）
 *
 * 功能点：
 * - CC-1 基站分布（按运营商/技术着色）
 * - CC-2 覆盖范围叠加
 * - CC-3 信号强度热力
 * - CC-4 覆盖盲区识别（无覆盖/弱覆盖）
 * - CC-5 扇区可视化（方位角/波束方向）
 */

import type {
  TelecomTopologyDataset,
  BaseStation,
  CoverageArea,
  SignalSample,
  SignalLevel,
} from '../types';
import { classifyRsrp } from '../style/telecomTheme';

/** 覆盖盲区 */
export interface CoverageGap {
  /** 中心位置 */
  lng: number;
  lat: number;
  /** 信号等级（weak = 弱覆盖，none = 无覆盖） */
  level: 'weak' | 'none';
  /** 参考 RSRP */
  rsrp: number;
}

/** 扇区可视化数据（CC-5） */
export interface SectorGeometry {
  stationId: string;
  /** 扇区中心 */
  center: [number, number];
  /** 方位角 */
  azimuth: number;
  /** 波束方向单位向量 */
  direction: [number, number];
}

/** Haversine 距离（m） */
export function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * 判断点是否在多边形内（射线法）
 */
export function pointInPolygon(
  lng: number,
  lat: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * CC-4 覆盖盲区识别：找出给定采样点中无覆盖或弱覆盖的区域
 */
export function detectCoverageGaps(
  samples: SignalSample[],
  coverageAreas: CoverageArea[],
  weakThreshold = -105
): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  for (const s of samples) {
    // 判断是否在任一覆盖区域内
    const covered = coverageAreas.some((area) =>
      pointInPolygon(s.lng, s.lat, area.geom)
    );
    if (!covered) {
      gaps.push({ lng: s.lng, lat: s.lat, level: 'none', rsrp: s.rsrp });
    } else if (s.rsrp < weakThreshold) {
      gaps.push({ lng: s.lng, lat: s.lat, level: 'weak', rsrp: s.rsrp });
    }
  }
  return gaps;
}

/**
 * CC-5 扇区可视化：生成扇区方位角/波束方向数据
 */
export function buildSectors(station: BaseStation): SectorGeometry[] {
  const azimuths = station.properties?.azimuth ?? [0];
  return azimuths.map((az) => {
    const rad = (az * Math.PI) / 180;
    return {
      stationId: station.id,
      center: [station.lng, station.lat] as [number, number],
      azimuth: az,
      direction: [Math.sin(rad), Math.cos(rad)] as [number, number],
    };
  });
}

/** 扇形覆盖（CC-5 渲染用） */
export interface SectorFan {
  stationId: string;
  sectorId: string;
  /** 方位角（度） */
  azimuth: number;
  /** 半功率波束宽度（度） */
  beamWidth: number;
  /** 半径（米） */
  radiusM: number;
  /** 扇形多边形 [lng,lat][]（渲染用） */
  polygon: [number, number][];
}

const EARTH_R = 6_371_000;

/** 由经纬度 + 方位角 + 距离(米) 推算目标点（大圆航点法） */
function destinationPoint(
  lng: number,
  lat: number,
  bearingDeg: number,
  distM: number
): [number, number] {
  const d = distM / EARTH_R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/**
 * CC-5 扇区扇形多边形：以基站为顶点，按方位角 ± beamWidth/2 张角、
 * radiusM 半径生成扇形 polygon（含中心点，便于 fill 渲染）。
 */
export function sectorFanPolygon(
  center: [number, number],
  azimuth: number,
  beamWidth = 65,
  radiusM = 800
): [number, number][] {
  const steps = 24;
  const half = beamWidth / 2;
  const ring: [number, number][] = [[center[0], center[1]]];
  for (let i = 0; i <= steps; i++) {
    const bearing = azimuth - half + (beamWidth * i) / steps;
    ring.push(destinationPoint(center[0], center[1], bearing, radiusM));
  }
  return ring;
}

/** 生成某基站全部扇区扇形（CC-5） */
export function buildSectorFans(
  station: BaseStation,
  opts: { beamWidth?: number; radiusM?: number } = {}
): SectorFan[] {
  const azimuths = station.properties?.azimuth;
  // 无方位角配置时无法生成扇区（PRD CC-5 语义），返回空
  if (!azimuths || azimuths.length === 0) return [];
  const beamWidth = opts.beamWidth ?? 65;
  const radiusM = opts.radiusM ?? 800;
  return azimuths.map((az, i) => ({
    stationId: station.id,
    sectorId: `${station.id}-s${i}`,
    azimuth: az,
    beamWidth,
    radiusM,
    polygon: sectorFanPolygon([station.lng, station.lat], az, beamWidth, radiusM),
  }));
}

/**
 * CC-3 信号热力：把 RSRP 采样点分类
 */
export function classifySamples(samples: SignalSample[]): Array<{
  lng: number;
  lat: number;
  rsrp: number;
  level: SignalLevel;
}> {
  return samples.map((s) => ({
    lng: s.lng,
    lat: s.lat,
    rsrp: s.rsrp,
    level: classifyRsrp(s.rsrp),
  }));
}

/**
 * 覆盖重叠分析（NLPG 6.3 "4G 和 5G 覆盖的重叠率"）
 */
export function coverageOverlapRatio(
  coverageAreas: CoverageArea[],
  dataset: TelecomTopologyDataset,
  techA: string,
  techB: string
): number {
  const stationById = new Map(dataset.baseStations.map((s) => [s.id, s] as const));
  const areasA = coverageAreas.filter(
    (a) => stationById.get(a.stationId)?.properties?.technology === techA
  );
  const areasB = coverageAreas.filter(
    (a) => stationById.get(a.stationId)?.properties?.technology === techB
  );
  // 简化：用采样点估算重叠率（在 A 覆盖内的点，落在 B 覆盖内的比例）
  if (areasA.length === 0) return 0;
  // 采样 A 区域中心点
  const samplePoints: Array<[number, number]> = areasA.map((a) => {
    const lng = a.geom.reduce((s, p) => s + p[0], 0) / a.geom.length;
    const lat = a.geom.reduce((s, p) => s + p[1], 0) / a.geom.length;
    return [lng, lat] as [number, number];
  });
  const overlapped = samplePoints.filter(([lng, lat]) =>
    areasB.some((b) => pointInPolygon(lng, lat, b.geom))
  ).length;
  return samplePoints.length > 0 ? overlapped / samplePoints.length : 0;
}
