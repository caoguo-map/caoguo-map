/**
 * 叠加渲染通用工具（跨包共用）
 *
 * 背景：「区域多边形 × 点要素」的叠加可视化在多个业务包重复出现
 * （water F-4 淹没 × 人口/建筑/耕地、pipeline L-4 危险区 × 用户/建筑），
 * 此前各包各写一遍「配色 → GeoJSON → circle/line 双层」，逻辑几乎一致。
 * 按本仓约定（跨包共用能力下沉到 `@caoguo/maplibre`，如 `cardFields.ts`），
 * 此处统一为一套纯函数 + 一个加层助手，业务包只提供**类型配色与角色名**。
 *
 * 纯函数，不依赖地图实例（除 `addOverlayLayers` 需传入 map api），可在 Node 单测。
 */

import { upsertSource } from './sourceUtils';

/** 默认叠加配色板 */
export const OVERLAY_PALETTE = ['#38bdf8', '#f59e0b', '#f472b6', '#a78bfa', '#4ade80', '#fb7185'];

/** 稳定字符串散列（同输入恒定同下标，不引入随机，保证多次渲染颜色一致） */
export function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 按类型取色。
 * @param known 已知类型 → 颜色映射（优先命中）
 * @param fallback 未命中且给出该值时用它；否则按类型名稳定散列取色板
 */
export function assignKindColor(
  kind: string,
  known?: Record<string, string>,
  fallback?: string,
): string {
  const hit = known?.[kind];
  if (hit) return hit;
  if (fallback) return fallback;
  return OVERLAY_PALETTE[stableHash(kind) % OVERLAY_PALETTE.length];
}

/** 参与叠加的点要素（业务包把自己的要素映射成这个 shape 即可） */
export interface OverlayPointInput {
  id: string;
  kind: string;
  lng: number;
  lat: number;
  /** 规模（人口/面积/用量等），用于归一化半径 */
  scale?: number;
  name?: string;
}

export interface BuildOverlayOptions {
  points: OverlayPointInput[];
  /** 区域多边形（线框，可选；少于 3 点则忽略） */
  polygon?: [number, number][];
  /** 类型 → 颜色（缺省按类型名稳定散列） */
  colorOf?: (kind: string) => string;
  /** 半径区间（px），默认 4~12 */
  minRadius?: number;
  maxRadius?: number;
  /** 无规模数据时的半径，默认 6 */
  defaultRadius?: number;
  /** properties.overlayRole 取值，便于业务包区分语义 */
  polygonRole?: string;
  pointRole?: string;
}

/**
 * 构造叠加 GeoJSON：区域线框（可选）+ 点要素（按类型着色、按规模归一化半径）。
 *
 * 配色/半径写入 `properties`，渲染层用 data-driven `['get','color']` / `['get','radius']`，
 * 因此**图层数恒为 2**，与点要素数量无关（这是本工具的关键收益）。
 */
export function buildOverlayGeoJSON(options: BuildOverlayOptions): GeoJSON.FeatureCollection {
  const {
    points,
    polygon = [],
    colorOf = (kind: string) => assignKindColor(kind),
    minRadius = 4,
    maxRadius = 12,
    defaultRadius = 6,
    polygonRole = 'outline',
    pointRole = 'point',
  } = options;

  const features: GeoJSON.Feature[] = [];

  if (polygon.length >= 3) {
    const ring = polygon.map(([x, y]) => [x, y] as [number, number]);
    ring.push(ring[0]); // 闭合
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { overlayRole: polygonRole },
    });
  }

  const list = points ?? [];
  const scales = list.map((p) => p.scale ?? 0);
  const maxScale = scales.length ? Math.max(...scales) : 0;
  for (const p of list) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        overlayRole: pointRole,
        id: p.id,
        kind: p.kind,
        name: p.name ?? '',
        scale: p.scale ?? 0,
        radius:
          maxScale > 0
            ? minRadius + (maxRadius - minRadius) * ((p.scale ?? 0) / maxScale)
            : defaultRadius,
        color: colorOf(p.kind),
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

/** `addOverlayLayers` 所需的最小 map api */
export interface OverlayMapApi {
  addSource?: (id: string, source: unknown) => void;
  /** `upsertSource` 依赖它判断是否已存在，故为必需 */
  getSource: (id: string) => unknown;
  setData?: (id: string, data: unknown) => void;
  addLayer: (layer: unknown) => void;
}

/**
 * 叠加渲染薄壳：写 source 并加 circle（点）+ line（区域线框）两层。
 * 同 source 混放 Point/Polygon，用 `geometry-type` 过滤区分。
 *
 * @returns 新增的图层 id 列表（调用方登记后可随自身 clear() 一并移除）
 */
export function addOverlayLayers(
  mlMap: OverlayMapApi,
  options: {
    sourceId: string;
    layerPrefix: string;
    data: GeoJSON.FeatureCollection;
    outlineColor?: string;
    outlineWidth?: number;
    pointOpacity?: number;
  },
): string[] {
  const { sourceId, layerPrefix, data, outlineColor = '#38bdf8', outlineWidth = 1.5, pointOpacity = 0.9 } =
    options;
  if (!data.features?.length) return [];

  upsertSource(mlMap, sourceId, data);

  const pointId = `${layerPrefix}-point`;
  const outlineId = `${layerPrefix}-outline`;
  mlMap.addLayer({
    id: pointId,
    type: 'circle',
    source: sourceId,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['get', 'radius'],
      'circle-opacity': pointOpacity,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#0b1220',
    },
  });
  mlMap.addLayer({
    id: outlineId,
    type: 'line',
    source: sourceId,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'line-color': outlineColor, 'line-width': outlineWidth },
  });
  return [pointId, outlineId];
}
