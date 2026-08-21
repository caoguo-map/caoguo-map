/**
 * 辉光管线 Custom Layer（T6 / F-1.3 WebGL 渲染层）。
 *
 * 实现 MapLibre v4 `CustomLayerInterface`：在地图之上叠加绘制 GeoJSON 线，
 * 用多遍（glowPasses）描边形成管线/路网/水系的辉光效果。
 *
 * 设计：几何构建（投影/档位）在 `./glowGeometry` 纯函数中完成（可单测）；
 * 本文件仅负责 WebGL 状态机与绘制，仅在浏览器执行。
 * 通过 `Map.addGlowLayer` 注入，调用方无需感知 WebGL 细节。
 *
 * 依赖 MapLibre 注入的 `matrix`（map 的 projectionMatrix * modelViewMatrix），
 * 与官方 CustomLayer 示例一致。
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

const DEFAULT_COLORS: Record<string, [number, number, number]> = {
  pipe: [0.2, 0.85, 1.0], // 青蓝：管线
  road: [0.6, 0.7, 0.9], // 灰蓝：路网
  water: [0.25, 0.55, 0.95], // 深蓝：水系
};

const VERT = `
attribute vec2 aPos;
attribute float aMiter;
uniform mat4 uMatrix;
uniform float uWidth;
uniform vec2 uResolution;
void main() {
  // 简化：沿法线方向偏移 width（屏幕空间），这里仅演示核心投影
  vec4 clip = uMatrix * vec4(aPos, 0.0, 1.0);
  vec2 screen = clip.xy / clip.w;
  // 注：精确线宽需法线计算，示范层用点宽近似
  vec2 offset = vec2(aMiter * uWidth / uResolution.x * 2.0, 0.0);
  gl_Position = vec4(screen + offset * clip.w, clip.z, clip.w);
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
  return sh;
}

export class CustomLineLayer implements CustomLayerInterface {
  id: string;
  type = 'custom' as const;
  renderingMode: '2d' = '2d';

  private lines: GlowLine[];
  private colors: Record<string, [number, number, number]>;
  private baseWidth: number;
  private passes: number;

  private program?: WebGLProgram;
  private buffer?: WebGLBuffer;
  private geometry: ReturnType<typeof buildGlowGeometry>;
  private map?: { getCanvas: () => HTMLCanvasElement };

  constructor(opts: GlowLayerOptions) {
    this.id = opts.id ?? 'caoguo-glow-line';
    this.lines = opts.lines;
    this.colors = { ...DEFAULT_COLORS, ...opts.colors };
    this.baseWidth = opts.baseWidth ?? 3;
    this.passes = opts.passes ?? 4;
    this.geometry = buildGlowGeometry(this.lines, { passes: this.passes });
  }

  onAdd(map: unknown, gl: WebGLRenderingContext): void {
    this.map = map as { getCanvas: () => HTMLCanvasElement };
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    this.program = prog;

    // 扁平化顶点：每条 segment 两端点
    const verts: number[] = [];
    for (const line of this.geometry.lines) {
      const pts = line.points;
      for (let i = 0; i < pts.length - 1; i++) {
        verts.push(pts[i][0], pts[i][1], 0, pts[i + 1][0], pts[i + 1][1], 0);
      }
    }
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this.buffer = buf;
  }

  render(gl: WebGLRenderingContext, matrix: number[]): void {
    if (!this.program || !this.buffer) return;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const aPos = gl.getAttribLocation(this.program, 'aPos');
    const aMiter = gl.getAttribLocation(this.program, 'aMiter');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(aMiter);
    gl.vertexAttribPointer(aMiter, 1, gl.FLOAT, false, 24, 16);

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

    const color = this.colors[this.lines[0]?.group ?? 'pipe'] ?? this.colors.pipe;
    for (const pass of this.geometry.passes) {
      gl.uniform1f(uWidth, this.baseWidth * pass.widthScale);
      gl.uniform3f(uColor, color[0], color[1], color[2]);
      gl.uniform1f(uOpacity, pass.opacity);
      gl.drawArrays(gl.LINES, 0, this.geometry.vertexCount);
    }
  }

  onRemove(_map: unknown, gl: WebGLRenderingContext): void {
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.buffer = undefined;
    this.program = undefined;
  }
}
