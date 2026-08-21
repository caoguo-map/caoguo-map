/**
 * 草果地图内置样式。
 *
 * - `caoguoStyle()`：官方矢量主题（caoguo-dark / caoguo-light），
 *   由 @caoguo/theme 生成，底层使用 MapLibre 免费 demo 矢量瓦片，无需 token。
 * - `osmRasterStyle()`：OSM 栅格兜底样式，矢量主题加载失败时使用。
 */

import type { StyleSpecification } from 'maplibre-gl';
import { buildStyle, type ThemeName } from '@caoguo/theme';

export const WUHAN_CENTER: [number, number] = [114.3055, 30.5928];
export const WUHAN_ZOOM = 11;

/** 草果官方矢量主题（默认暗色）。 */
export function caoguoStyle(theme: ThemeName = 'caoguo-dark'): StyleSpecification {
  return buildStyle(theme);
}

/** 暗色 OSM 栅格兜底底图（无需 key）。 */
export function osmRasterStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'osm-raster': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0a0f1e' },
      },
      {
        id: 'osm-raster',
        type: 'raster',
        source: 'osm-raster',
        paint: {
          'raster-opacity': 0.85,
          'raster-saturation': -0.6,
          'raster-brightness-max': 0.7,
          'raster-contrast': 0.1,
        },
      },
    ],
  };
}
