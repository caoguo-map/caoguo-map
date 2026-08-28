import maplibregl from 'maplibre-gl';
import type {
  Map as MlMap,
  StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { osmRasterStyle, geoqRasterStyle, localBasemapStyle, WUHAN_CENTER, WUHAN_ZOOM } from './styles';
import { createTransformer, type CRS, type LngLat } from './crs';
import { toWgs84 } from './crs';
import {
  addTiandituBaseMap,
  tiandituStyle,
  MissingTokenError,
  type TiandituOptions,
  type TiandituType,
} from './sources';
import {
  createDefaultStore,
  registerOfflineProtocol,
  offlineTileUrl,
  offlineSourceTiles,
  packGeoJSONToStore,
  type TileStoreBackend,
  type TileFormat,
} from './offline';
import { ScaleControl, ThemeSwitcher, LegendControl, ExportControl } from './controls';
import { CustomLineLayer } from './shaders';
import type { GlowLine } from './shaders';
import { LodController } from './lod';
import type { LodLevel, LodChangeEvent } from './lod';
import { applyTerrain, removeTerrain } from './terrain';
import type { ThemeName } from '@caoguo/theme';

export type MapInstance = MlMap;

/**
 * WebGL 不可用时抛出（如无 GPU 的沙箱/无头环境、老旧浏览器）。
 * 调用方应捕获并向用户展示降级提示，而非让页面崩溃。
 */
export class WebGLUnavailableError extends Error {
  constructor(message = '当前环境不支持 WebGL，无法渲染地图') {
    super(message);
    this.name = 'WebGLUnavailableError';
  }
}

/**
 * 探测当前环境是否可创建真正可用的 WebGL 上下文。
 * 某些沙箱/无头浏览器会返回 canvas，且 getContext 也返回一个「伪对象」，
 * 但上下文实际不可用（渲染时崩溃）。因此除了非 null 判断，还进一步验证
 * 上下文确实能工作：能读出 VENDOR、能取到必要扩展，并捕获
 * webglcontextcreationerror 事件。
 */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    let failed = false;
    const onErr = () => {
      failed = true;
    };
    canvas.addEventListener('webglcontextcreationerror', onErr, { once: true });

    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    canvas.removeEventListener('webglcontextcreationerror', onErr);

    if (failed || !gl) return false;

    // 进一步验证上下文确实可用：读取基础参数 + 编译一个最小着色器。
    const vendor = gl.getParameter(gl.VERSION);
    if (!vendor) return false;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return false;
    gl.shaderSource(vs, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }');
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) return false;

    return true;
  } catch {
    return false;
  }
}

export { maplibregl, WUHAN_CENTER, WUHAN_ZOOM, osmRasterStyle, geoqRasterStyle, localBasemapStyle };
export * from './crs';
export * from './sources';
export * from './offline';
export * from './controls';
export * from './shaders';
export * from './lod';
export * from './sourceUtils';
// 设备卡片通用字段解析（grid / pipeline / water 共用）
export * from './cardFields';

/**
 * 全局配置（由应用入口注入一次，所有 Map 实例共享）。
 * 用于把敏感 token（如天地图 key）从库内部解耦到应用侧，
 * 避免硬编码、避免库 dist 中无法替换 import.meta.env 的问题。
 */
export interface CaoguoMapGlobalConfig {
  /** 天地图 token；未显式给 Map 传 tianditu 时自动生效 */
  tiandituToken?: string;
}

const GLOBAL_KEY = '__caoguoMapConfig__';

export function setGlobalConfig(cfg: CaoguoMapGlobalConfig): void {
  const prev = getGlobalConfig();
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = { ...prev, ...cfg };
}

export function getGlobalConfig(): CaoguoMapGlobalConfig {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as CaoguoMapGlobalConfig ?? {};
}

/** `addGlowLayer` 返回的句柄：既提供图层 id（用于 removeLayer），也支持动态更新线数据。 */
export interface GlowLayerHandle {
  /** 图层 id，可用于 map.removeLayer(id) */
  id: string;
  /** 动态替换线集合（高亮选中 / 切换数据，无需重建图层） */
  setLines: (lines: GlowLine[]) => void;
}

export interface MapOptions {
  container: string | HTMLElement;
  center?: [number, number];
  zoom?: number;
  style?: string | StyleSpecification;
  pitch?: number;
  bearing?: number;
  /**
   * 业务/叠加数据的坐标系（默认 WGS84）。
   * 引擎内部以 WGS84 渲染；若数据为 GCJ-02 / CGCS2000，
   * 设定后可通过 `transformToMap` 在入图前自动纠偏。
   */
  dataCRS?: CRS;
  /**
   * 天地图（Tianditu）底图选项。传入后，**默认底图从 OSM 切换为天地图**
   * （国内权威底图，CGCS2000 / Web Mercator，适配国内网络与坐标系）。
   * token 由调用方注入，缺失时抛出 MissingTokenError。
   */
  tianditu?: {
    token: string;
    type?: TiandituType;
    lang?: 'zh' | 'en';
    subdomains?: number[];
    tileSize?: number;
    maxzoom?: number;
  };
}

/**
 * 草果地图引擎封装（展示层骨架）。
 *
 * 当前为轻量包装：直接复用 maplibre-gl 能力。
 * 后续阶段将在此注入：GCJ-02/BD-09 坐标系插件、行业 Shader、离线瓦片加载，
 * 业务调用方无需改动（通过本类统一入口）。
 */
export class Map {
  private _map: MlMap;
  private _dataCRS: CRS;

  constructor(options: MapOptions) {
    this._dataCRS = options.dataCRS ?? 'WGS84';
    if (!isWebGLAvailable()) {
      throw new WebGLUnavailableError();
    }

    let style = localBasemapStyle() as StyleSpecification;
    if (options.style) {
      style = options.style as StyleSpecification;
    } else if (options.tianditu) {
      if (!options.tianditu.token) throw new MissingTokenError();
      style = tiandituStyle(
        options.tianditu.type ?? 'vector',
        options.tianditu as TiandituOptions,
      ) as StyleSpecification;
    } else {
      // 未显式指定底图时，若应用侧已注入天地图 token，则默认使用天地图（国内权威底图）。
      const g = getGlobalConfig();
      if (g.tiandituToken) {
        style = tiandituStyle('vector', { token: g.tiandituToken } as TiandituOptions) as StyleSpecification;
      }
    }

    this._map = new maplibregl.Map({
      container: options.container,
      center: options.center ?? WUHAN_CENTER,
      zoom: options.zoom ?? WUHAN_ZOOM,
      style,
      pitch: options.pitch ?? 0,
      bearing: options.bearing ?? 0,
      attributionControl: { compact: true },
    });
  }

  /**
   * 把业务坐标系坐标转换到地图渲染基准（WGS84）。
   * 用于叠加 GCJ-02 / CGCS2000 数据前的纠偏。
   */
  transformToMap(lng: number, lat: number): LngLat {
    return toWgs84(this._dataCRS, lng, lat);
  }

  /** 设定叠加数据坐标系 */
  setDataCRS(crs: CRS): void {
    this._dataCRS = crs;
  }

  /** 读取叠加数据坐标系 */
  getDataCRS(): CRS {
    return this._dataCRS;
  }

  /** 生成当前 dataCRS -> WGS84 的变换器（供批量转换使用） */
  getTransformer() {
    return createTransformer(this._dataCRS, 'WGS84');
  }

  /**
   * 切换为底图为天地图（国内权威底图，CGCS2000 / Web Mercator）。
   * token 必须由调用方注入，缺失时抛出 MissingTokenError。
   */
  useTianditu(type: TiandituType, opts: Omit<TiandituOptions, 'type'>): void {
    this._map.setStyle(tiandituStyle(type, opts) as never);
  }

  /** 向当前地图注入天地图底图（叠加在现有 style 之上） */
  addTianditu(opts: Omit<TiandituOptions, 'type'> & { type?: TiandituType }): void {
    addTiandituBaseMap({ ...opts, map: this._map });
  }

  /** 离线瓦片后端（默认浏览器 IndexedDB / Node 内存） */
  private _store: TileStoreBackend = createDefaultStore();

  /** 注册离线协议并启用离线瓦片读取（F-1.4） */
  enableOffline(store?: TileStoreBackend): void {
    if (store) this._store = store;
    registerOfflineProtocol(maplibregl, { store: this._store });
  }

  /** 当前离线存储实例 */
  getOfflineStore(): TileStoreBackend {
    return this._store;
  }

  /** 构造离线源 tiles（供 source.tiles 使用） */
  offlineTiles(sourceId: string): string[] {
    return offlineSourceTiles(sourceId);
  }

  /** 把 GeoJSON 打包进离线存储（分桶到瓦片网格） */
  async packGeoJSON(
    sourceId: string,
    geojson: Parameters<typeof packGeoJSONToStore>[1]['geojson'],
    opts: { maxZoom?: number; expires?: number } = {}
  ): Promise<number> {
    return packGeoJSONToStore(this._store, {
      sourceId,
      geojson,
      maxZoom: opts.maxZoom,
      expires: opts.expires,
    });
  }

  addLayer(layer: Record<string, unknown>): void {
    this._map.addLayer(layer as MlMap['addLayer'] extends (l: infer L) => void ? L : never);
  }

  removeLayer(id: string): void {
    if (this._map.getLayer(id)) this._map.removeLayer(id);
  }

  on(event: string, cb: (e: unknown) => void): void;
  on(event: string, layerId: string, cb: (e: unknown) => void): void;
  on(event: string, layerId?: string | ((e: unknown) => void), cb?: (e: unknown) => void): void {
    if (typeof layerId === 'function') {
      this._map.on(event as keyof MlMap['on'], layerId as never);
    } else if (cb && layerId) {
      this._map.on(event as keyof MlMap['on'], layerId, cb as never);
    } else if (cb) {
      this._map.on(event as keyof MlMap['on'], cb as never);
    }
  }

  addSource(id: string, source: object): void {
    // 幂等：若同名 source 已存在（如层级切换重渲染时），先移除再重建，
    // 避免抛 "Source already exists" 导致面板交互静默失败。
    if (this._map.getSource(id)) {
      try {
        this._map.removeSource(id);
      } catch {
        // ignore
      }
    }
    this._map.addSource(id, source as never);
  }

  /** 安全移除 source（不存在时静默忽略） */
  removeSource(id: string): void {
    if (this._map.getSource(id)) {
      try {
        this._map.removeSource(id);
      } catch {
        // ignore
      }
    }
  }

  getSource(id: string): unknown {
    return this._map.getSource(id);
  }

  flyTo(opts: { center?: [number, number]; zoom?: number; pitch?: number; bearing?: number }): void {
    this._map.flyTo(opts as never);
  }

  remove(): void {
    this._map.remove();
  }

  /** 暴露底层 maplibre-gl Map 实例（用于 Marker 等原生能力，或精细控制） */
  getMap(): MlMap {
    return this._map;
  }

  /**
   * 挂载比例尺 + 实时坐标控件（T8 / F-1.8）。
   * 返回控件实例，可调用 .remove() 卸载。
   */
  addScaleControl(options?: { showCoordinate?: boolean; maxWidth?: number }): ScaleControl {
    const ctrl = new ScaleControl(this._map as never, options);
    const container = (this._map as unknown as { getContainer: () => HTMLElement }).getContainer();
    ctrl.addTo(container);
    return ctrl;
  }

  /**
   * 挂载主题切换控件（T8 / F-1.9），在 caoguo-dark / caoguo-light 间切换。
   * 返回控件实例，可调用 .toggle() / .setTheme() / .remove()。
   */
  addThemeSwitcher(initial?: ThemeName): ThemeSwitcher {
    const ctrl = new ThemeSwitcher(this._map as never, { initial });
    const container = (this._map as unknown as { getContainer: () => HTMLElement }).getContainer();
    ctrl.addTo(container);
    return ctrl;
  }

  /**
   * 挂载图例控件（通用）：渲染数据驱动的色块/线段图例，说明专题图层语义。
   * 返回控件实例，可调用 .setItems() 随图层切换更新、.remove() 卸载。
   */
  addLegendControl(options: { title?: string; items: { label: string; color: string; shape?: 'color' | 'line' }[] }): LegendControl {
    const ctrl = new LegendControl(options);
    const container = (this._map as unknown as { getContainer: () => HTMLElement }).getContainer();
    ctrl.addTo(container);
    return ctrl;
  }

  /**
   * 挂载地图导出控件（通用）：点击按钮将当前视图导出为 PNG 下载。
   * 返回控件实例，可调用 .remove() 卸载。
   */
  addExportControl(options: { filename?: string; buttonText?: string } = {}): ExportControl {
    const ctrl = new ExportControl(this._map as never, options);
    const container = (this._map as unknown as { getContainer: () => HTMLElement }).getContainer();
    ctrl.addTo(container);
    return ctrl;
  }

  /**
   * 挂载辉光管线 Custom Layer（T6 / F-1.3）。
   * 传入 GeoJSON 线集合，叠加渲染管线/路网/水系辉光效果。
   * @returns 图层 id（可用于 removeLayer）
   */
  addGlowLayer(opts: {
    id?: string;
    lines: GlowLine[];
    colors?: Record<string, [number, number, number]>;
    baseWidth?: number;
    passes?: number;
  }): GlowLayerHandle {
    const layer = new CustomLineLayer(opts);
    this._map.addLayer(layer as never);
    return {
      id: layer.id,
      setLines: (lines: GlowLine[]) => layer.setLines(lines),
    };
  }

  /**
   * 挂载 LOD 控制器（T7 / F-1.7）。
   * 随 zoom 切换数据密度等级，并在等级变化时回调（调用方据此 setData / 切源）。
   * @returns LodController 实例（可 .getLevel() / .remove()）
   */
  addLodController<T = unknown>(
    levels: LodLevel<T>[],
    onLod: (e: LodChangeEvent<T>) => void
  ): LodController<T> {
    const ctrl = new LodController<T>(this._map as never, levels, onLod);
    ctrl.evaluate(true);
    return ctrl;
  }

  /**
   * 启用 3D 地形渲染（F-1.5）。
   *
   * 注入 raster-dem 高程源并调用 maplibre-gl 原生 `setTerrain`，使地图呈现地形起伏。
   * DEM 瓦片默认使用公共 Terrarium 源（elevation-tiles-prod，Terrain-RGB 编码，支持 CORS），
   * 可在 opts.tiles 覆盖为私有瓦片服务（如 MinIO / 本地 MBTiles 服务）。
   *
   * @param opts.exaggeration 地形夸张系数（默认 1.5）
   * @param opts.tiles DEM 瓦片模板，{z}/{x}/{y} 占位
   * @param opts.encoding 'terrarium'（默认，Mapzen）| 'mapbox'
   */
  enableTerrain(
    opts: {
      sourceId?: string;
      tiles?: string[];
      encoding?: 'terrarium' | 'mapbox';
      exaggeration?: number;
      maxzoom?: number;
    } = {},
  ): void {
    applyTerrain(this._map, opts);
  }

  /** 关闭 3D 地形渲染（F-1.5），并移除 DEM 源 */
  disableTerrain(sourceId = 'cg-dem'): void {
    removeTerrain(this._map, sourceId);
  }

  get instance(): MlMap {
    return this._map;
  }
}

export default Map;
