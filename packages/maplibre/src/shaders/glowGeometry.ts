/**
 * 辉光线几何构建（T6 / F-1.3 纯逻辑部分）。
 *
 * 把 GeoJSON LineString 集合转换为「多遍辉光描边」所需的几何描述。
 * 渲染层（CustomLineLayer）再据此在 WebGL 中绘制：每遍一个宽度档 + 透明度档，
 * 叠加形成管线/路网/水系的辉光效果。
 *
 * 设计：本模块**不依赖 WebGL / maplibre**，纯函数可在 Node 单测。
 * 坐标投影使用简化 Web Mercator（经度→x、纬度→y 的归一化世界坐标），
 * 真实渲染时由 CustomLayer 的 matrix 变换到屏幕。
 */

export interface GlowLine {
  /** 线坐标 [lng, lat][] */
  coordinates: [number, number][];
  /** 该线所属分组（如 'pipe' | 'road' | 'water'），用于着色 */
  group?: string;
}

export interface GlowPass {
  /** 相对基础宽度的倍数（核心线=1，外晕逐遍增大） */
  widthScale: number;
  /** 该遍不透明度（核心线高、外晕低） */
  opacity: number;
}

export interface GlowGeometry {
  /** 所有线（含分组标记）的归一化坐标序列 */
  lines: { points: [number, number][]; group?: string }[];
  /** 辉光多遍参数（从外晕到核心，或反之，由渲染层决定） */
  passes: GlowPass[];
  /** 总顶点数（用于缓冲分配） */
  vertexCount: number;
}

/**
 * 生成辉光多遍档位。
 * @param passes 遍数（默认 4：3 层外晕 + 1 核心）
 * @param coreOpacity 核心线不透明度
 */
export function glowPasses(passes = 4, coreOpacity = 1): GlowPass[] {
  if (passes < 1) passes = 1;
  const out: GlowPass[] = [];
  // passes[0] = 核心（widthScale=1、opacity 最高）；
  // passes[last] = 最外晕（widthScale 最大、opacity 最低）
  for (let i = 0; i < passes; i++) {
    const t = passes === 1 ? 1 : 1 - i / (passes - 1); // 1(核心)..0(外晕)
    out.push({
      widthScale: 1 + (1 - t) * (passes - 1) * 1.5,
      opacity: coreOpacity * (0.12 + 0.88 * t),
    });
  }
  return out;
}

/**
 * 简化 Web Mercator 归一化（经度→x∈[-1,1]，纬度→y∈[-1,1]）。
 * 仅用于几何构建与单测，真实投影在渲染层用 map 的 matrix。
 */
export function projectSimple(lng: number, lat: number): [number, number] {
  const x = lng / 180;
  const y = Math.log(Math.tan((Math.PI / 4) + (lat * Math.PI) / 360)) / Math.PI;
  return [x, Math.max(-1, Math.min(1, y))];
}

/**
 * 构建辉光几何：投影每条线并统计顶点。
 * 顶点数 = 各线（点数-1）*2（线段两端），用于 Line 绘制。
 */
export function buildGlowGeometry(
  lines: GlowLine[],
  opts: { passes?: number; coreOpacity?: number } = {}
): GlowGeometry {
  const passes = glowPasses(opts.passes ?? 4, opts.coreOpacity ?? 1);
  let vertexCount = 0;
  const projected = lines.map((l) => {
    const points = l.coordinates.map(([lng, lat]) => projectSimple(lng, lat));
    // 线段绘制：每条 segment 2 顶点
    vertexCount += Math.max(0, points.length - 1) * 2;
    return { points, group: l.group };
  });
  return { lines: projected, passes, vertexCount };
}
