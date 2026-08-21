/**
 * 样式生成器 v2（PRD phase-3 §8）
 *
 * 功能点：
 * - SG-1 色板提取：上传图片 → 提取主色调 → 生成配色方案
 * - SG-2 风格模板：预置 6 套行业模板（管网/电网/水网/交通/算力/通信）
 * - SG-3 品牌定制：输入品牌色 → 自动生成全套地图样式
 * - SG-4 运营商主题：三大运营商预设主题 + 自定义
 * - SG-5 昼夜切换：一键切换亮色/暗色模式
 */

/** 行业风格模板类型（六张网） */
export type IndustryStyle = 'pipeline' | 'grid' | 'water' | 'transport' | 'compute' | 'telecom';

/** 配色方案 */
export interface ColorScheme {
  /** 主色 */
  primary: string;
  /** 辅助色 */
  secondary: string;
  /** 强调色 */
  accent: string;
  /** 背景色 */
  background: string;
  /** 名称 */
  name: string;
}

/** 生成的地图样式（简化 style.json 配色片段） */
export interface GeneratedMapStyle {
  scheme: ColorScheme;
  /** 线要素配色 */
  lineColor: string;
  /** 点要素配色 */
  pointColor: string;
  /** 面要素配色 */
  fillColor: string;
  /** 底图背景 */
  background: string;
  /** 模式 */
  mode: 'light' | 'dark';
}

// ============================================================
// SG-2 风格模板：6 套行业模板
// ============================================================
export const INDUSTRY_TEMPLATES: Record<IndustryStyle, ColorScheme> = {
  pipeline: { name: '管网', primary: '#f59e0b', secondary: '#3b82f6', accent: '#ef4444', background: '#0b1320' },
  grid: { name: '电网', primary: '#f59e0b', secondary: '#ef4444', accent: '#3b82f6', background: '#0b1320' },
  water: { name: '水网', primary: '#3b82f6', secondary: '#22d3ee', accent: '#4ade80', background: '#0b1320' },
  transport: { name: '交通', primary: '#f59e0b', secondary: '#ef4444', accent: '#22d3ee', background: '#0b1320' },
  compute: { name: '算力', primary: '#a78bfa', secondary: '#3b82f6', accent: '#4ade80', background: '#0b1320' },
  telecom: { name: '通信', primary: '#3b82f6', secondary: '#4ade80', accent: '#ef4444', background: '#0b1320' },
};

// ============================================================
// SG-4 运营商主题
// ============================================================
export const CARRIER_STYLES: Record<string, ColorScheme> = {
  '中国移动': { name: '中国移动', primary: '#4ade80', secondary: '#166534', accent: '#22c55e', background: '#0b1320' },
  '中国联通': { name: '中国联通', primary: '#ef4444', secondary: '#991b1b', accent: '#f87171', background: '#0b1320' },
  '中国电信': { name: '中国电信', primary: '#3b82f6', secondary: '#1e40af', accent: '#60a5fa', background: '#0b1320' },
  '中国广电': { name: '中国广电', primary: '#f59e0b', secondary: '#92400e', accent: '#fbbf24', background: '#0b1320' },
};

// ============================================================
// SG-1 色板提取
// ============================================================
/**
 * 从图片像素数据提取主色调。
 * @param pixels RGBA 像素数组（每 4 个值一个像素）
 * @returns 主色 hex（出现频率最高的量化色）
 */
export function extractDominantColor(pixels: Uint8ClampedArray): string {
  if (pixels.length < 4) return '#000000';
  const bucket = new Map<string, number>();
  // 采样（每 4px 取一个，提升性能）
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a === 0) continue;
    // 量化到 32 级
    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }
  let bestKey = '';
  let bestCount = -1;
  for (const [k, c] of bucket) {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k;
    }
  }
  if (!bestKey) return '#000000';
  // 还原量化桶中心值（每桶 8 级，中心偏移 +4）
  const [r, g, b] = bestKey.split(',').map((v) => (parseInt(v) << 3) + 4);
  return rgbToHex(r, g, b);
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** 调整颜色亮度（用于生成辅助色） */
export function adjustBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const nr = clamp(Math.round(r * factor));
  const ng = clamp(Math.round(g * factor));
  const nb = clamp(Math.round(b * factor));
  return rgbToHex(nr, ng, nb);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}

// ============================================================
// SG-3 品牌定制：输入品牌色 → 生成全套样式
// ============================================================
export interface BrandStyleOptions {
  /** 品牌主色（hex） */
  brandColor: string;
  /** 模式 */
  mode?: 'light' | 'dark';
  /** 名称 */
  name?: string;
}

export function generateBrandStyle(opts: BrandStyleOptions): GeneratedMapStyle {
  const mode = opts.mode ?? 'dark';
  const primary = opts.brandColor;
  const secondary = adjustBrightness(primary, 0.6);
  const accent = adjustBrightness(primary, 1.4);
  const background = mode === 'dark' ? '#0b1320' : '#f8fafc';
  return {
    scheme: {
      name: opts.name ?? '自定义品牌',
      primary,
      secondary,
      accent,
      background,
    },
    lineColor: primary,
    pointColor: accent,
    fillColor: primary,
    background,
    mode,
  };
}

/** 从行业模板生成样式 */
export function generateIndustryStyle(industry: IndustryStyle, mode: 'light' | 'dark' = 'dark'): GeneratedMapStyle {
  const scheme = INDUSTRY_TEMPLATES[industry];
  const background = mode === 'dark' ? '#0b1320' : '#f8fafc';
  return {
    scheme: { ...scheme, background },
    lineColor: scheme.primary,
    pointColor: scheme.accent,
    fillColor: scheme.secondary,
    background,
    mode,
  };
}

/** 从运营商主题生成样式 */
export function generateCarrierStyle(carrier: string, mode: 'light' | 'dark' = 'dark'): GeneratedMapStyle {
  const scheme = CARRIER_STYLES[carrier] ?? CARRIER_STYLES['中国移动'];
  const background = mode === 'dark' ? '#0b1320' : '#f8fafc';
  return {
    scheme: { ...scheme, background },
    lineColor: scheme.primary,
    pointColor: scheme.accent,
    fillColor: scheme.secondary,
    background,
    mode,
  };
}

// ============================================================
// SG-5 昼夜切换
// ============================================================
export function toggleMode(style: GeneratedMapStyle): GeneratedMapStyle {
  const nextMode: 'light' | 'dark' = style.mode === 'dark' ? 'light' : 'dark';
  return {
    ...style,
    mode: nextMode,
    background: nextMode === 'dark' ? '#0b1320' : '#f8fafc',
    scheme: { ...style.scheme, background: nextMode === 'dark' ? '#0b1320' : '#f8fafc' },
  };
}
