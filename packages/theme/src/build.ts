import darkStyle from './styles/dark.json';
import lightStyle from './styles/light.json';
import type { StyleSpecification } from 'maplibre-gl';

export type ThemeName = 'caoguo-dark' | 'caoguo-light';

export interface BuildStyleOptions {
  /** 替换默认矢量源（如注入天地图/私有瓦片 url） */
  sourceUrl?: string;
  /** 替换字体 PBF 模板 */
  glyphs?: string;
  /** 是否把字体改为思源黑体（Noto Sans SC） */
  notoFonts?: boolean;
}

const NOTO_FONTSTACKS = ['Noto Sans SC Regular', 'Noto Sans SC Bold'];

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

/** 生成指定主题的 MapLibre Style JSON（符合 v8 spec） */
export function buildStyle(
  theme: ThemeName,
  opts: BuildStyleOptions = {}
): StyleSpecification {
  let style = (theme === 'caoguo-dark' ? darkStyle : lightStyle) as StyleSpecification;
  if (opts.notoFonts) style = withNotoFonts(style);
  const next = structuredClone(style);
  const source = next.sources?.['caoguo-basemap'] as
    | { url?: string; glyphs?: string }
    | undefined;
  if (opts.sourceUrl && source) source.url = opts.sourceUrl;
  if (opts.glyphs) next.glyphs = opts.glyphs;
  else if (source?.glyphs) next.glyphs = source.glyphs;
  return next;
}

export { darkStyle, lightStyle };
