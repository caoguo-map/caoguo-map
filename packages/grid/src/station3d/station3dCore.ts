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
