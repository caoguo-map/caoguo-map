/**
 * 把天地图底图（底图 + 注记）作为源/图层添加到 MapLibre 地图实例。
 *
 * 由于天地图为栅格底图，推荐作为「无 style 背景」的地图底层：
 * 直接通过 setStyle 注入最小 style，或先 addSource + addLayer。
 * 这里提供低侵入的「注入已有 map」方式，业务可叠加自有矢量图层。
 */

import type { Map as MlMap, StyleSpecification } from 'maplibre-gl';
import {
  buildTiandituSources,
  MissingTokenError,
  type TiandituOptions,
  type TiandituType,
} from './tianditu';

export interface AddTiandituOptions extends TiandituOptions {
  type?: TiandituType;
  /** 添加到指定地图实例 */
  map: MlMap;
  /** 注入为 style 的源/图层还是 addSource（默认 addSource + addLayer） */
  asStyle?: false;
}

/** 生成可直接作为 Map style 的天地图 Style JSON（含底图+注记两层） */
export function tiandituStyle(
  type: TiandituType,
  opts: TiandituOptions
): StyleSpecification {
  if (!opts.token) throw new MissingTokenError();
  const sources = buildTiandituSources(type, opts);
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: Object.fromEntries(
      sources.map((s) => [s.id, s.source])
    ) as StyleSpecification['sources'],
    layers: sources.map((s) => ({
      id: s.id,
      type: 'raster' as const,
      source: s.id,
      // 注记层置于底图之上
      ...(s.isLabel ? { minzoom: 0 } : {}),
    })),
  };
}

/** 向已存在的地图实例注入天地图底图（底图 + 注记） */
export function addTiandituBaseMap(opts: AddTiandituOptions): void {
  if (!opts.token) throw new MissingTokenError();
  const type = opts.type ?? 'vector';
  const sources = buildTiandituSources(type, opts);
  const map = opts.map;
  for (const s of sources) {
    if (!map.getSource(s.id)) {
      map.addSource(s.id, s.source as never);
    }
    if (!map.getLayer(s.id)) {
      map.addLayer({
        id: s.id,
        type: 'raster',
        source: s.id,
      } as never);
    }
  }
}
