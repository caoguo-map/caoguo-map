/**
 * 辉光管线 Custom Layer（T6 / F-1.3 WebGL 渲染层）。
 *
 * 实现 MapLibre v4 `CustomLayerInterface`：在地图之上叠加绘制 GeoJSON 线，
 * 用多遍（glowPasses）三角面描边形成管线/路网/水系的辉光效果。
 *
 * 设计：几何构建（投影/三角带）在 `./glowGeometry` 纯函数中完成（可单测）；
 * 本文件仅负责 WebGL 状态机与绘制，仅在浏览器执行。
 * 线宽在屏幕空间按像素计算（标准 Mapbox line shader 思路），因此可随缩放保持视觉宽度。
 * 通过 `Map.addGlowLayer` 注入，调用方无需感知 WebGL 细节。
 *
 * 依赖 MapLibre 注入的 `matrix`（map 的 projectionMatrix * modelViewMatrix）。
 */

import { buildGlowGeometry, type GlowLine } from './glowGeometry';

/** MapLibre v4 CustomLayerInterface 最小子集（避免强类型耦合） */
export interface CustomLayerInterface {
  id: string;
  type: 'custom';
  renderingMode?: '2d' | '3d';
  onAdd?(map: unknown, gl: WebGLRenderingContext): void;
  render(gl: WebGLRenderingContext, matrix: number[]): void;
  onRemove?(map: unknown, gl: WebGLRenderingContext): void;
  prerender?(gl: WebGLRenderingContext, matrix: number[]): void;
}

export interface GlowLayerOptions {
  /** 图层 id */
  id?: string;
  /** 线分组颜色映射（group -> [r,g,b] 0..1） */
  colors?: Record<string, [number, number, number]>;
  /** 基础线宽（像素，核心线） */
  baseWidth?: number;
  /** 辉光遍数 */
  passes?: number;
  /** 线集合 */
  lines: GlowLine[];
}

/** 取分组色的兜底色（灰蓝），避免未配置分组时渲染透明/黑。 */
const FALLBACK_COLOR: [number, number, number] = [0.6, 0.7, 0.9];

const DEFAULT_COLORS: Record<string, [number, number, number]> = {
  pipe: [0.2, 0.85, 1.0], // 青蓝：管线
  road: [0.6, 0.7, 0.9], // 灰蓝：路网
  water: [0.25, 0.55, 0.95], // 深蓝：水系
};

// 顶点属性：aPos(世界xy)、aDir(段方向xy)、aSide(±1)
const VERT = `
attribute vec2 aPos;
attribute vec2 aDir;
attribute float aSide;
uniform mat4 uMatrix;
uniform float uWidth;
uniform vec2 uResolution;
void main() {
  vec4 clip = uMatrix * vec4(aPos, 0.0, 1.0);
  // 段方向也投影，求屏幕空间方向
  vec4 clipDir = uMatrix * vec4(aPos + aDir, 0.0, 1.0);
  vec2 s0 = clip.xy / clip.w;
  vec2 s1 = clipDir.xy / clipDir.w;
  vec2 dir = normalize(s1 - s0 + vec2(1e-6));
  vec2 normal = vec2(-dir.y, dir.x);
  vec2 offset = normal * aSide * (uWidth / uResolution * 2.0);
  gl_Position = vec4(s0 + offset * clip.w, clip.z, clip.w);
}
`;

const FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  gl_FragColor = vec4(uColor, uOpacity);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[CustomLineLayer] shader 编译失败:', gl.getShaderInfoLog(sh));
  }
  return sh;
}

export class CustomLineLayer implements CustomLayerInterface {
  id: string;
  type = 'custom' as const;
  renderingMode: '2d' = '2d';

  private lines: GlowLine[];
  private colors: Record<string, [number, number, number]>;
  private baseWidth: number;

  private program?: WebGLProgram;
  private buffer?: WebGLBuffer;
  private geometry: ReturnType<typeof buildGlowGeometry>;
  private map?: { getCanvas: () => HTMLCanvasElement };
  private gl?: WebGLRenderingContext;

  constructor(opts: GlowLayerOptions) {
    this.id = opts.id ?? 'caoguo-glow-line';
    this.lines = opts.lines;
    this.colors = { ...DEFAULT_COLORS, ...opts.colors };
    this.baseWidth = opts.baseWidth ?? 3;
    this.geometry = buildGlowGeometry(this.lines, { passes: opts.passes ?? 4, baseWidth: this.baseWidth });
    // 为新分组补充兜底色，保证未显式配置的分组也能渲染。
    for (const g of this.geometry.groups) {
      if (!(g in this.colors)) this.colors[g] = FALLBACK_COLOR;
    }
  }

  onAdd(map: unknown, gl: WebGLRenderingContext): void {
    this.map = map as { getCanvas: () => HTMLCanvasElement };
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[CustomLineLayer] program 链接失败:', gl.getProgramInfoLog(prog));
    }
    this.program = prog;

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.geometry.vertices, gl.STATIC_DRAW);
    this.buffer = buf;
  }

  render(gl: WebGLRenderingContext, matrix: number[]): void {
    if (!this.program || !this.buffer) return;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const stride = this.geometry.stride * 4; // float -> byte
    const aPos = gl.getAttribLocation(this.program, 'aPos');
    const aDir = gl.getAttribLocation(this.program, 'aDir');
    const aSide = gl.getAttribLocation(this.program, 'aSide');
    const aGroup = gl.getAttribLocation(this.program, 'aGroup');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aDir);
    gl.vertexAttribPointer(aDir, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(aSide);
    gl.vertexAttribPointer(aSide, 1, gl.FLOAT, false, stride, 16);
    if (aGroup >= 0) {
      gl.enableVertexAttribArray(aGroup);
      gl.vertexAttribPointer(aGroup, 1, gl.FLOAT, false, stride, 20);
    }

    const uMatrix = gl.getUniformLocation(this.program, 'uMatrix');
    gl.uniformMatrix4fv(uMatrix, false, new Float32Array(matrix));
    const uWidth = gl.getUniformLocation(this.program, 'uWidth');
    const uColor = gl.getUniformLocation(this.program, 'uColor');
    const uOpacity = gl.getUniformLocation(this.program, 'uOpacity');
    const uRes = gl.getUniformLocation(this.program, 'uResolution');
    const canvas = this.map?.getCanvas();
    gl.uniform2f(uRes, canvas?.width ?? 1024, canvas?.height ?? 768);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // 加法混合形成辉光

    // 逐遍、逐分组取色绘制：实现「按分组多色」，不同业务线（管/路/水）各自着色。
    for (const rg of this.geometry.renderGroups) {
      const pass = this.geometry.passes[rg.passIndex];
      const color = this.colors[rg.group] ?? FALLBACK_COLOR;
      gl.uniform1f(uWidth, pass.width);
      gl.uniform3f(uColor, color[0], color[1], color[2]);
      gl.uniform1f(uOpacity, pass.opacity);
      gl.drawArrays(gl.TRIANGLES, rg.start, rg.count);
    }
  }

  /**
   * 动态更新线集合（高亮选中、切换数据等无需重建图层）。
   * 浏览器环境会刷新 GPU 缓冲；纯逻辑/测试环境仅更新几何与数据。
   */
  setLines(lines: GlowLine[]): void {
    this.lines = lines;
    this.geometry = buildGlowGeometry(this.lines, {
      passes: this.geometry.passes.length,
      baseWidth: this.baseWidth,
    });
    // 为新分组补充兜底色，保证未显式配置的分组也能渲染。
    for (const g of this.geometry.groups) {
      if (!(g in this.colors)) this.colors[g] = FALLBACK_COLOR;
    }
    // 图层已挂载（this.gl 在 onAdd 时缓存）则刷新 GPU 缓冲。
    if (this.buffer && this.gl) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.geometry.vertices, this.gl.STATIC_DRAW);
    }
  }

  onRemove(_map: unknown, gl: WebGLRenderingContext): void {
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.buffer = undefined;
    this.program = undefined;
  }
}
