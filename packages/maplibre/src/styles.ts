/**
 * 草果地图内置样式。
 *
 * - `caoguoStyle()`：官方矢量主题（caoguo-dark / caoguo-light），
 *   由 @caoguo/theme 生成，底层使用 MapLibre 免费 demo 矢量瓦片，无需 token。
 * - `geoqRasterStyle()` / `osmRasterStyle()`：国内可达的栅格兜底底图
 *   （智图 GeoQ 公共服务，免 key，适配国内网络）。`osmRasterStyle` 保留为别名。
 */

import type { StyleSpecification } from 'maplibre-gl';
import { buildStyle, type ThemeName } from '@caoguo/theme';

export const WUHAN_CENTER: [number, number] = [114.3055, 30.5928];
export const WUHAN_ZOOM = 11;

/** 草果官方矢量主题（默认暗色）。 */
export function caoguoStyle(theme: ThemeName = 'caoguo-dark'): StyleSpecification {
  return buildStyle(theme);
}

/**
 * 国内可达的栅格兜底底图（智图 GeoQ 公共服务，免 key）。
 * 使用 ChinaOnlineStreetPurplishBlue（蓝紫街道，贴合暗色演示主题）。
 * 替代原 OSM 兜底：OSM 在国内网络普遍不可达，导致部署在国内访问的
 * 演示中心底图空白。GeoQ 为 Esri 中国公共服务，长期稳定免 key。
 */
export function geoqRasterStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'geoq-raster': {
        type: 'raster',
        tiles: [
          'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '© GeoQ 智图',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0a0f1e' },
      },
      {
        id: 'geoq-raster',
        type: 'raster',
        source: 'geoq-raster',
        paint: {
          'raster-opacity': 0.9,
          'raster-saturation': -0.2,
          'raster-contrast': 0.05,
        },
      },
    ],
  };
}

/** 兼容别名：国内可达栅格兜底底图。 */
export const osmRasterStyle = geoqRasterStyle;

