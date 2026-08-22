import darkStyle from './styles/dark.json';
import lightStyle from './styles/light.json';
import type { StyleSpecification } from 'maplibre-gl';

export type ThemeName = 'caoguo-dark' | 'caoguo-light';

/** 完整底图样式类型（maplibre StyleSpecification 的别名，供行业主题派生使用） */
export type ThemeStyleFull = StyleSpecification;

/** 任意已注册主题名（内置基础主题 + 运行时 registerTheme 注入的行业主题） */
export type AnyTheme = string;

export interface BuildStyleOptions {
  /** 主题名（内置 `caoguo-dark`/`caoguo-light` 或经 `registerTheme` 注册的行业主题），默认 `caoguo-dark` */
  theme?: AnyTheme;
  /** 替换默认矢量源（如注入天地图/私有瓦片 url） */
  sourceUrl?: string;
  /** 替换字体 PBF 模板 */
  glyphs?: string;
  /** 是否把字体改为思源黑体（Noto Sans SC） */
  notoFonts?: boolean;
}

const NOTO_FONTSTACKS = ['Noto Sans SC Regular', 'Noto Sans SC Bold'];

/** glyphs 兜底：style 自身未声明且未通过 opts 覆盖时使用，保证 symbol 层可渲染中文注记 */
export const DEFAULT_GLYPHS = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

/** 把符号图层字体替换为 Noto（中文优先） */
function withNotoFonts(style: StyleSpecification): StyleSpecification {
  const next = structuredClone(style);
  for (const layer of next.layers) {
    if (layer.type === 'symbol' && layer.layout && 'text-font' in layer.layout) {
      layer.layout['text-font'] = NOTO_FONTSTACKS as unknown as string[];
    }
  }
  return next;
}

/**
 * 生成指定主题的 MapLibre Style JSON（符合 v8 spec）。
 * 兼容两种调用形式：
 * - 对象式（推荐，与 README 一致）：`buildStyle({ theme, sourceUrl, glyphs, notoFonts })`
 * - 位置参数式（兼容旧代码）：`buildStyle('caoguo-dark', { sourceUrl, glyphs, notoFonts })`
 */
export { darkStyle, lightStyle };

/**
 * 主题注册表 —— 内置基础主题 + 运行时行业主题（六张网 Phase 落地点注入）。
 * 必须先于 `buildStyle` 声明，使其引用时必定已初始化（避免 TDZ 隐患）。
 */
const registry = new Map<string, StyleSpecification>([
  ['caoguo-dark', darkStyle as StyleSpecification],
  ['caoguo-light', lightStyle as StyleSpecification],
]);

export function buildStyle(
  opts?: BuildStyleOptions | ThemeName,
  legacyOpts: BuildStyleOptions = {}
): StyleSpecification {
  let theme: string = 'caoguo-dark';
  let opts2: BuildStyleOptions = {};

  if (typeof opts === 'string') {
    // 旧式位置参数：buildStyle('caoguo-dark', {...})
    theme = opts;
    opts2 = legacyOpts;
  } else {
    // 新式对象参数：buildStyle({ theme, ... })
    opts2 = opts ?? {};
    if (opts2.theme) theme = opts2.theme;
  }

  // 优先从注册表取（支持行业主题），回退到内置 dark/light
  const base = registry.get(theme) ?? (theme === 'caoguo-dark' ? darkStyle : lightStyle);
  let style = base as StyleSpecification;
  if (opts2.notoFonts) style = withNotoFonts(style);
  const next = structuredClone(style);
  const source = next.sources?.['caoguo-basemap'] as
    | { url?: string; glyphs?: string }
    | undefined;
  if (opts2.sourceUrl && source) source.url = opts2.sourceUrl;
  if (opts2.glyphs) next.glyphs = opts2.glyphs;
  else if (source?.glyphs) next.glyphs = source.glyphs;
  else if (!next.glyphs) next.glyphs = DEFAULT_GLYPHS;
  return next;
}

/** 注册（或覆盖）一个矢量主题。行业主题由此接入，buildStyle 即可按名构造。 */
export function registerTheme(name: string, style: StyleSpecification): void {
  registry.set(name, style);
}

/** 返回当前所有已注册主题名（含内置基础主题 + 运行时注册的行业主题）。 */
export function getRegisteredThemes(): string[] {
  return [...registry.keys()];
}

/** 判断给定名称是否为已知主题。 */
export function hasTheme(name: string): boolean {
  return registry.has(name);
}

/** 返回当前所有可用主题名（内置基础主题 + 运行时注册的行业主题，去重）。 */
export function getThemeList(): string[] {
  return [...registry.keys()];
}

export interface ZoomGap {
  /** 出现空洞的缩放层级 */
  zoom: number;
  /** 该层级可见图层 id 列表 */
  visibleLayerIds: string[];
  /** 缺失的核心要素（water / road-major / place / building 等） */
  missing: string[];
}

export interface ZoomCoverageReport {
  /** 检测区间 */
  minZoom: number;
  maxZoom: number;
  /** 是否存在断裂（任一核心要素在某层级缺失） */
  ok: boolean;
  /** 所有断裂明细 */
  gaps: ZoomGap[];
}

const CORE_FEATURES: Record<string, string> = {
  water: 'water',
  roadMajor: 'road-major',
  place: 'place-label-major',
  building: 'building',
};

/**
 * 缩放层级覆盖静态校验（PRD 验收「3-18 层级无断裂」的工具化封装）。
 * 不依赖真实瓦片，仅基于 style 的 minzoom/maxzoom 计算每层可见要素，
 * 检查核心要素（water/road-major/place/building）在 [minZoom,maxZoom] 是否始终可见。
 * 下游可在接入自有瓦片源的 CI / 运行时复用此函数。
 */
export function checkZoomCoverage(
  style: StyleSpecification,
  opts: { minZoom?: number; maxZoom?: number } = {}
): ZoomCoverageReport {
  const minZoom = opts.minZoom ?? 3;
  const maxZoom = opts.maxZoom ?? 18;
  const gaps: ZoomGap[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const visible = style.layers
      .filter((l) => (l.minzoom ?? 0) <= z && (l.maxzoom ?? 24) > z)
      .map((l) => l.id);
    const missing: string[] = [];
    if (!visible.includes(CORE_FEATURES.water)) missing.push('water');
    if (z >= 8 && !visible.some((id) => id === 'road-major' || id === 'place-label-major' || id === 'place-label-minor'))
      missing.push('road/place(z>=8)');
    if (z >= 13 && !visible.includes(CORE_FEATURES.building)) missing.push('building(z>=13)');
    if (missing.length) gaps.push({ zoom: z, visibleLayerIds: visible, missing });
  }

  return { minZoom, maxZoom, ok: gaps.length === 0, gaps };
}
