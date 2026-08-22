/**
 * 三维变电站核心纯函数（PRD G-6，Phase 2 简版）
 *
 * 由变电站设备（点坐标 + 容量/电压等级）推导 3D 体块参数：
 *  - footprint：以中心点生成的矩形底面（GeoJSON Polygon）
 *  - height：按电压等级/容量映射的建筑高度（米）
 * 纯函数，可在 Node 环境单测；渲染见 station3d.ts（fill-extrusion 叠加地形）。
 */

import type { GridDevice, VoltageLevel } from '../types';

/** 电压等级 → 典型建筑高度（米，Phase 2 简版经验值） */
const VOLTAGE_HEIGHT: Record<VoltageLevel, number> = {
  '1000': 180,
  '500': 120,
  '220': 80,
  '110': 50,
  '35': 30,
  '10': 18,
  '0.4': 10,
};

/**
 * 计算变电站 3D 体块高度（米）。
 * 优先按电压等级，若有额定容量则按容量线性微调（每 100 MVA +15m，封顶 200m）。
 */
export function stationHeightMeters(device: GridDevice): number {
  const voltage = device.properties?.voltage;
  const base = voltage ? VOLTAGE_HEIGHT[voltage] : 30;
  const capacity = device.properties?.capacity ?? device.properties?.installedCapacity;
  if (capacity && capacity > 0) {
    return Math.min(200, base + (capacity / 100) * 15);
  }
  return base;
}

/**
 * 计算变电站底面半边长（米），按容量缩放（容量越大占地越广）。
 * 容量缺失时取默认 80m。
 */
export function stationHalfSizeMeters(device: GridDevice): number {
  const capacity = device.properties?.capacity ?? device.properties?.installedCapacity;
  if (capacity && capacity > 0) {
    return Math.min(300, 60 + Math.sqrt(capacity) * 6);
  }
  return 80;
}

/** 米 → 经度偏移（在给定纬度下近似） */
function metersToLngOffset(meters: number, lat: number): number {
  return meters / (111320 * Math.cos((lat * Math.PI) / 180));
}
/** 米 → 纬度偏移 */
function metersToLatOffset(meters: number): number {
  return meters / 110540;
}

/**
 * 生成变电站底面矩形 footprint（GeoJSON Polygon，闭合 5 点）。
 * @param device 变电站设备（需有 lng/lat）
 */
export function stationFootprint(device: GridDevice): GeoJSON.Polygon {
  const half = stationHalfSizeMeters(device);
  const dlng = metersToLngOffset(half, device.lat);
  const dlat = metersToLatOffset(half);
  const { lng, lat } = device;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng - dlng, lat - dlat],
        [lng + dlng, lat - dlat],
        [lng + dlng, lat + dlat],
        [lng - dlng, lat + dlat],
        [lng - dlng, lat - dlat],
      ],
    ],
  };
}

// ============================================================
// 设备叠加层（G-6 进阶：附属设备）
// ============================================================

/** 附属设备聚合：返回某变电站关联的非变电站设备（铁塔/配变/用户） */
export interface StationAccessory {
  /** 变电站 id */
  stationId: string;
  /** 附属设备列表 */
  devices: GridDevice[];
  /** 通过的线路条数 */
  lineCount: number;
}

/**
 * G-6 进阶：聚合某变电站的附属设备。
 *
 * 判定规则：与 substation 通过至少一条 GridLine 相连，且 kind != 'substation' 的设备。
 * 同时返回通过该变电站的总线路条数（含变电站间互联）。
 */
export function stationAccessoryDevices(
  substationId: string,
  dataset: { devices: GridDevice[]; lines: { fromDevice: string; toDevice: string }[] }
): StationAccessory {
  const connectedDevices: GridDevice[] = [];
  let lineCount = 0;
  const subDeviceIds = new Set<string>();
  for (const line of dataset.lines) {
    if (line.fromDevice === substationId) subDeviceIds.add(line.toDevice);
    else if (line.toDevice === substationId) subDeviceIds.add(line.fromDevice);
  }
  for (const d of dataset.devices) {
    if (d.id === substationId) continue;
    if (subDeviceIds.has(d.id) && d.kind !== 'substation') connectedDevices.push(d);
  }
  for (const line of dataset.lines) {
    if (line.fromDevice === substationId || line.toDevice === substationId) lineCount++;
  }
  return { stationId: substationId, devices: connectedDevices, lineCount };
}

/** 批量聚合：返回数据集中所有变电站的附属设备 */
export function allStationAccessories(
  dataset: { devices: GridDevice[]; lines: { fromDevice: string; toDevice: string }[] }
): StationAccessory[] {
  const subs = dataset.devices.filter((d) => d.kind === 'substation');
  return subs.map((s) => stationAccessoryDevices(s.id, dataset));
}

/**
 * 计算附属设备的 3D 标识尺寸（小柱状，按设备类型差异化）。
 *
 * - tower：8m 高（细铁塔示意）
 * - transformer：4m 高（小型配电箱）
 * - user：2m 高
 * 半径统一 6m。
 */
export function accessoryHeightMeters(device: GridDevice): number {
  switch (device.kind) {
    case 'tower':
      return 8;
    case 'transformer':
      return 4;
    case 'user':
      return 2;
    default:
      return 3;
  }
}
