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

/**
 * 纯本地底图（零外部依赖，完全离线）。
 * 暗色背景 + 全球经纬网，无需任何在线瓦片 / 字体服务。
 * 用于：国内网络无法访问 OSM / GeoQ 等境外或受限瓦片源时，
 * 保证演示中心地图永远可渲染（业务图层为自有 GeoJSON，叠加其上即可见）。
 */
function buildGraticule(step = 10): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let lon = -180; lon <= 180; lon += step) {
    features.push({
      type: 'Feature',
      properties: { kind: 'meridian' },
      geometry: { type: 'LineString', coordinates: [[lon, -85], [lon, 85]] },
    });
  }
  for (let lat = -80; lat <= 80; lat += step) {
    features.push({
      type: 'Feature',
      properties: { kind: 'parallel' },
      geometry: { type: 'LineString', coordinates: [[-180, lat], [180, lat]] },
    });
  }
  return { type: 'FeatureCollection', features };
}

export function localBasemapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      graticule: { type: 'geojson', data: buildGraticule() },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0a0f1e' } },
      {
        id: 'graticule',
        type: 'line',
        source: 'graticule',
        paint: { 'line-color': '#1e293b', 'line-width': 0.6, 'line-opacity': 0.6 },
      },
    ],
  };
}


