/**
 * 3D 地形渲染（F-1.5）
 *
 * 注入 raster-dem 高程源并调用 maplibre-gl 原生 `setTerrain`，使地图呈现地形起伏。
 * DEM 瓦片默认使用公共 Terrarium 源（elevation-tiles-prod，Terrain-RGB 编码，支持 CORS），
 * 可在 opts.tiles 覆盖为私有瓦片服务（如 MinIO / 本地 MBTiles 服务）。
 */

import type { Map as MlMap } from 'maplibre-gl';

export interface TerrainOptions {
  /** DEM source id（默认 cg-dem） */
  sourceId?: string;
  /** DEM 瓦片模板，{z}/{x}/{y} 占位 */
  tiles?: string[];
  encoding?: 'terrarium' | 'mapbox';
  /** 地形夸张系数（默认 1.5） */
  exaggeration?: number;
  maxzoom?: number;
}

/** 默认 DEM 瓦片源（Mapzen Terrarium，Terrain-RGB，支持 CORS，无需鉴权） */
export const DEFAULT_TERRAIN_TILES = [
  'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
];

/** 在原生 MapLibre 实例上启用地形（纯函数，便于单测） */
export function applyTerrain(mlMap: MlMap, opts: TerrainOptions = {}): void {
  const sourceId = opts.sourceId ?? 'cg-dem';
  if (!mlMap.getSource(sourceId)) {
    mlMap.addSource(sourceId, {
      type: 'raster-dem',
      tiles: opts.tiles ?? DEFAULT_TERRAIN_TILES,
      encoding: opts.encoding ?? 'terrarium',
      tileSize: 256,
      maxzoom: opts.maxzoom ?? 15,
    } as never);
  }
  mlMap.setTerrain({ source: sourceId, exaggeration: opts.exaggeration ?? 1.5 } as never);
}

/** 关闭地形（纯函数），移除 DEM 源 */
export function removeTerrain(mlMap: MlMap, sourceId = 'cg-dem'): void {
  mlMap.setTerrain(null);
  if (mlMap.getSource(sourceId)) {
    mlMap.removeSource(sourceId);
  }
}
