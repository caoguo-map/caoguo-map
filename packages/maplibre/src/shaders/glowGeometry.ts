/**
 * 辉光线几何构建（T6 / F-1.3 纯逻辑部分）。
 *
 * 把 GeoJSON LineString 集合转换为「多遍描边」所需的三角形带几何。
 * 渲染层（CustomLineLayer）据此在 WebGL 中以屏幕像素宽度的三角面叠加绘制，
 * 每遍一个宽度档 + 透明度档，加法混合形成管线/路网/水系的辉光效果。
 *
 * 设计：本模块**不依赖 WebGL / maplibre**，纯函数可在 Node 单测。
 * 坐标投影使用简化 Web Mercator（经度→x、纬度→y 的归一化世界坐标），
 * 真实渲染时由 CustomLayer 的 matrix 变换到屏幕；线宽在屏幕空间计算。
 */

export interface GlowLine {
  /** 线坐标 [lng, lat][] */
  coordinates: [number, number][];
  /** 该线所属分组（如 'pipe' | 'road' | 'water'），用于着色 */
  group?: string;
}

export interface GlowPass {
  /** 该遍屏幕像素宽度 */
  width: number;
  /** 该遍不透明度（核心线高、外晕低） */
  opacity: number;
}

export interface GlowGeometry {
  /**
   * 扁平化顶点缓冲。每个顶点 5 个 float：
   * [worldX, worldY, dirX, dirY, side]
   * - worldX/worldY：该端点的归一化世界坐标
   * - dirX/dirY：所在线段的世界空间方向（用于屏幕空间法线）
   * - side：±1，左/右扩展符号
   */
  vertices: Float32Array;
  /** 每遍在 vertices 中的顶点区间 [start, count]（按顶点数，非 float 数） */
  passRanges: { start: number; count: number }[];
  /** 每遍参数（从最外晕到核心，由宽到窄） */
  passes: GlowPass[];
  /** 顶点属性跨距（float 数） */
  stride: number;
}

/**
 * 生成辉光多遍档位。
 * @param passes 遍数（默认 4：3 层外晕 + 1 核心）
 * @param baseWidth 核心线像素宽度（默认 3）
 */
export function glowPasses(passes = 4, baseWidth = 3): GlowPass[] {
  if (passes < 1) passes = 1;
  const out: GlowPass[] = [];
  // 从最外晕（宽、淡）到核心（窄、浓）排列
  for (let i = 0; i < passes; i++) {
    const t = passes === 1 ? 1 : 1 - i / (passes - 1); // 1(核心)..0(外晕)
    out.push({
      width: baseWidth * (1 + (1 - t) * (passes - 1) * 1.8),
      opacity: 0.1 + 0.9 * t * t,
    });
  }
  return out;
}

/**
 * 简化 Web Mercator 归一化（经度→x∈[-1,1]，纬度→y 经墨卡托压缩）。
 * 仅用于几何构建与单测，真实投影在渲染层用 map 的 matrix。
 */
export function projectSimple(lng: number, lat: number): [number, number] {
  const x = lng / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI;
  // 纬度墨卡托范围约 [-π/2, π/2]，归一化到 [-1,1] 方便观察
  return [x, Math.max(-1, Math.min(1, y / Math.PI))];
}

/**
 * 构建辉光几何：对每条线、每遍、每段生成三角面（2 三角形 = 6 顶点）。
 */
export function buildGlowGeometry(
  lines: GlowLine[],
  opts: { passes?: number; baseWidth?: number } = {}
): GlowGeometry {
  const passes = glowPasses(opts.passes ?? 4, opts.baseWidth ?? 3);
  const stride = 5;
  const verts: number[] = [];
  const passRanges: { start: number; count: number }[] = [];

  for (const pass of passes) {
    const start = verts.length / stride;
    for (const line of lines) {
      const pts = line.coordinates.map(([lng, lat]) => projectSimple(lng, lat));
      if (pts.length < 2) continue;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        // 段方向（世界空间，未归一化，shader 内会归一化）
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        // 每个端点左右各一个顶点，组成 quad：aL,aR,bL,bR → (aL,aR,bL),(bL,aR,bR)
        const quad: Array<[number, number, number, number, number]> = [
          [a[0], a[1], dx, dy, 1],
          [a[0], a[1], dx, dy, -1],
          [b[0], b[1], dx, dy, 1],
          [b[0], b[1], dx, dy, -1],
        ];
        // 两个三角形：0,1,2 与 2,1,3
        const idx = [0, 1, 2, 2, 1, 3];
        for (const k of idx) {
          const v = quad[k];
          verts.push(v[0], v[1], v[2], v[3], v[4]);
        }
      }
    }
    const count = verts.length / stride - start;
    passRanges.push({ start, count });
  }

  return { vertices: new Float32Array(verts), passRanges, passes, stride };
}
