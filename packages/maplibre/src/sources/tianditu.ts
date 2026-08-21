/**
 * 天地图（Tianditu）WMTS 底图源（F-1.2）。
 *
 * 天地图为国内权威底图，坐标系为 CGCS2000 / Web Mercator（显示尺度等价于 WGS84）。
 * token 必须由调用方在运行时注入，**绝不硬编码**；缺失时抛出明确错误。
 *
 * 文档：https://lbs.tianditu.gov.cn/server/MapService.html
 */

export type TiandituLayer =
  /** 矢量底图（含道路/注记基础） */
  | 'vec'
  /** 影像底图 */
  | 'img'
  /** 地形底图 */
  | 'ter'
  /** 矢量注记（道路/地名） */
  | 'cva'
  /** 影像注记 */
  | 'cia'
  /** 地形注记 */
  | 'cta'
  /** 矢量注记（英文） */
  | 'eva'
  /** 影像注记（英文） */
  | 'eia'
  /** 地形注记（英文） */
  | 'eta';

export type TiandituType = 'vector' | 'satellite' | 'terrain';

export interface TiandituOptions {
  /** 天地图授权 token（必填，运行时注入） */
  token: string;
  /** 语言：中文 cva/cia/cta 或英文 eva/eia/eta */
  lang?: 'zh' | 'en';
  /** 瓦片服务子域，默认 0-7 */
  subdomains?: number[];
  /** 瓦片尺寸，默认 256 */
  tileSize?: number;
  /** 最大层级，默认 18 */
  maxzoom?: number;
}

const LAYER_MAP: Record<TiandituType, { base: TiandituLayer; label: TiandituLayer }> = {
  vector: { base: 'vec', label: 'cva' },
  satellite: { base: 'img', label: 'cia' },
  terrain: { base: 'ter', label: 'cta' },
};

const LAYER_LABEL_EN: Partial<Record<TiandituLayer, TiandituLayer>> = {
  cva: 'eva',
  cia: 'eia',
  cta: 'eta',
};

/** 构建单张 WMTS 栅格源的 tiles URL 列表（含子域与 token） */
export function tiandituTileUrls(
  layer: TiandituLayer,
  opts: TiandituOptions
): string[] {
  const sub = opts.subdomains ?? [0, 1, 2, 3, 4, 5, 6, 7];
  const labelLayer = opts.lang === 'en' ? LAYER_LABEL_EN[layer] ?? layer : layer;
  return sub.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/${labelLayer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${labelLayer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${encodeURIComponent(opts.token)}`
  );
}

export interface TiandituSourceSpec {
  id: string;
  source: {
    type: 'raster';
    tiles: string[];
    tileSize: number;
    maxzoom: number;
    attribution: string;
  };
  /** 是否注记层（绘制于底图之上） */
  isLabel: boolean;
}

/** 生成一组天地图源（底图 + 注记） */
export function buildTiandituSources(
  type: TiandituType,
  opts: TiandituOptions
): TiandituSourceSpec[] {
  const { base, label } = LAYER_MAP[type];
  const tileSize = opts.tileSize ?? 256;
  const maxzoom = opts.maxzoom ?? 18;
  const attr = '© 天地图 GS(2023)3295号';
  return [
    {
      id: `tianditu-${base}`,
      isLabel: false,
      source: {
        type: 'raster',
        tiles: tiandituTileUrls(base, opts),
        tileSize,
        maxzoom,
        attribution: attr,
      },
    },
    {
      id: `tianditu-${label}`,
      isLabel: true,
      source: {
        type: 'raster',
        tiles: tiandituTileUrls(label, opts),
        tileSize,
        maxzoom,
        attribution: attr,
      },
    },
  ];
}

export class MissingTokenError extends Error {
  constructor() {
    super('天地图 token 缺失：调用 addTiandituBaseMap 必须传入 tianditu: { token } 选项。');
    this.name = 'MissingTokenError';
  }
}
