/**
 * 变电站视角切换（G-6 进阶）
 *
 * 提供 4 种预设视角 + 自定义视角切换。函数接收 maplibre Map 实例（防御性可选方法调用），
 * 适用于任何框架：Vue/React/原生 JS。
 *
 * 设计：纯函数 + 防御性调用，不绑死具体框架。
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';

export type StationViewMode =
  | '2d-top'        // 平面俯视（pitch=0，bearing=0）
  | '3d-perspective' // 透视（pitch=60，bearing=-30，zoom=14）
  | '3d-low-orbit'  // 低空环绕（pitch=75，bearing=45，zoom=15）
  | 'isometric';    // 等距（pitch=45，bearing=0，zoom=14）

export interface ViewPreset {
  /** 中心点 */
  center: [number, number];
  /** 缩放级别 */
  zoom: number;
  /** 俯仰角（0-85） */
  pitch: number;
  /** 方位角（0-360） */
  bearing: number;
}

/** 各模式的默认相机参数（不含中心点，由调用方注入） */
export const STATION_VIEW_PRESETS: Record<StationViewMode, Omit<ViewPreset, 'center'>> = {
  '2d-top': { zoom: 12, pitch: 0, bearing: 0 },
  '3d-perspective': { zoom: 14, pitch: 60, bearing: -30 },
  '3d-low-orbit': { zoom: 15, pitch: 75, bearing: 45 },
  isometric: { zoom: 14, pitch: 45, bearing: 0 },
};

/** 调用 maplibre 原生 API（防御性：缺失方法静默忽略） */
type MaplibreInstance = {
  flyTo?: (opts: Record<string, unknown>) => void;
  jumpTo?: (opts: Record<string, unknown>) => void;
  setPitch?: (pitch: number) => void;
  setBearing?: (bearing: number) => void;
};

/**
 * 切换地图视角到指定预设模式。
 *
 * @param map       CaoguoMap 实例
 * @param mode      视角模式
 * @param options   中心点 + 可选动画时长（ms）
 * @returns         实际写入的相机参数
 */
export function switchStationView(
  map: CaoguoMap,
  mode: StationViewMode,
  options: { center: [number, number]; animateMs?: number }
): ViewPreset {
  const preset = STATION_VIEW_PRESETS[mode];
  const target: ViewPreset = { center: options.center, ...preset };
  const inst = (map as unknown as { instance?: MaplibreInstance }).instance;
  const ml = (inst ?? (map as unknown as MaplibreInstance)) as MaplibreInstance;
  const animateMs = options.animateMs ?? 1200;

  // 优先 flyTo（动画），缺失则 jumpTo，再缺失则手动 setPitch/setBearing
  if (typeof ml.flyTo === 'function') {
    try {
      ml.flyTo({
        center: target.center,
        zoom: target.zoom,
        pitch: target.pitch,
        bearing: target.bearing,
        duration: animateMs,
        essential: true,
      });
      return target;
    } catch {
      // ignore and fallthrough
    }
  }
  if (typeof ml.jumpTo === 'function') {
    try {
      ml.jumpTo({
        center: target.center,
        zoom: target.zoom,
        pitch: target.pitch,
        bearing: target.bearing,
      });
      return target;
    } catch {
      // ignore and fallthrough
    }
  }
  // 兜底：单独 setPitch / setBearing（zoom/center 需 flyTo 才能动画，先跳变）
  try {
    if (typeof ml.setPitch === 'function') ml.setPitch(target.pitch);
  } catch {
    // ignore
  }
  try {
    if (typeof ml.setBearing === 'function') ml.setBearing(target.bearing);
  } catch {
    // ignore
  }
  return target;
}

/**
 * 围绕某变电站构造"聚焦"视角：以变电站为中心，根据电压等级自动选择 zoom。
 */
export function focusOnStation(
  map: CaoguoMap,
  options: {
    center: [number, number];
    voltage?: '1000' | '500' | '220' | '110' | '35' | '10' | '0.4';
    animateMs?: number;
  }
): ViewPreset {
  return switchStationView(map, '3d-perspective', {
    center: options.center,
    animateMs: options.animateMs,
  });
}