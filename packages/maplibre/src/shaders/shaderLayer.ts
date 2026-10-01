/**
 * 通用 Shader 框架（PRD phase-0-foundation §5.1.2 F-1.3）
 *
 * 背景：此前只有「管线辉光」一个垂直 CustomLayer（GLSL 与顶点布局都写死在
 * `CustomLineLayer` 内）。本模块把它抽成**通用框架**：
 * - 顶点/片元着色器源码、属性布局、uniform 全部由调用方声明式传入；
 * - 框架负责编译链接、属性绑定、uniform 按类型分派、内置 uniform 注入与资源回收；
 * - 与 `CustomLineLayer` 并列，二者都实现 `CustomLayerInterface`，可直接 `map.addLayer`。
 *
 * 内置 uniform（若着色器里声明了就会被自动注入，调用方无需传）：
 * - `uMatrix`：当前视图矩阵（mat4）
 * - `uResolution`：画布像素尺寸（vec2）；用于屏幕空间等像素宽度
 */

import type { CustomLayerInterface } from './CustomLineLayer';

/** 顶点属性声明 */
export interface ShaderAttributeSpec {
  /** 着色器中的 attribute 名 */
  name: string;
  /** 分量数（1~4） */
  size: number;
  /** 在单个顶点中的偏移（单位：float 个数）；省略则按声明顺序紧凑排列 */
  offset?: number;
}

/** uniform 值：标量 / 2~4 维向量 / mat4(16) 或任意长度 float 数组 */
export type ShaderUniformValue = number | number[] | Float32Array;

export interface ShaderLayerOptions {
  id?: string;
  /** 顶点着色器 GLSL */
  vertex: string;
  /** 片元着色器 GLSL */
  fragment: string;
  /** 顶点属性布局 */
  attributes: ShaderAttributeSpec[];
  /** 单个顶点的 float 数（stride）；省略则由属性布局推导 */
  stride?: number;
  /** 顶点数据（按 stride 交错存放） */
  vertices: Float32Array;
  /** 初始 uniform（`uMatrix` / `uResolution` 由框架注入，无需传） */
  uniforms?: Record<string, ShaderUniformValue>;
  /** 绘制模式，默认 TRIANGLES */
  drawMode?: 'TRIANGLES' | 'LINES' | 'POINTS';
  /** 是否启用加法混合（辉光/发光效果），默认 true */
  blend?: boolean;
  renderingMode?: '2d' | '3d';
}

/**
 * 计算属性的偏移与 stride。
 * 显式 offset 优先；否则按声明顺序紧凑排列（与 GLSL 交错数组写法一致）。
 */
export function packAttributes(attributes: ShaderAttributeSpec[]): {
  offsets: number[];
  stride: number;
} {
  let cursor = 0;
  const offsets = attributes.map((a) => {
    const off = a.offset ?? cursor;
    cursor = off + a.size;
    return off;
  });
  return { offsets, stride: cursor };
}

/**
 * 按值的形状分派 uniform 设置函数。
 * 抽成独立函数既便于复用，也可脱离 WebGL 单测（传一个记录调用的假 gl 即可）。
 */
export function setUniformValue(
  gl: WebGLRenderingContext,
  location: unknown,
  value: ShaderUniformValue,
): void {
  if (location == null) return;
  const loc = location as WebGLUniformLocation;
  if (typeof value === 'number') {
    gl.uniform1f(loc, value);
    return;
  }
  if (value instanceof Float32Array) {
    if (value.length === 16) gl.uniformMatrix4fv(loc, false, value);
    else gl.uniform1fv(loc, value);
    return;
  }
  switch (value.length) {
    case 2:
      gl.uniform2f(loc, value[0], value[1]);
      break;
    case 3:
      gl.uniform3f(loc, value[0], value[1], value[2]);
      break;
    case 4:
      gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
      break;
    default:
      gl.uniform1fv(loc, new Float32Array(value));
  }
}

/** 通用自定义着色器图层：任意 GLSL + 声明式属性/uniform */
export class ShaderLayer implements CustomLayerInterface {
  readonly id: string;
  readonly type = 'custom' as const;
  readonly renderingMode?: '2d' | '3d';

  private vertex: string;
  private fragment: string;
  private attributes: ShaderAttributeSpec[];
  private stride: number;
  private vertices: Float32Array;
  private uniforms: Record<string, ShaderUniformValue>;
  private blend: boolean;
  private modeName: 'TRIANGLES' | 'LINES' | 'POINTS';

  private map: { getCanvas?: () => { width: number; height: number } } | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;

  constructor(options: ShaderLayerOptions) {
    const packed = packAttributes(options.attributes);
    this.id = options.id ?? 'caoguo-shader-layer';
    this.vertex = options.vertex;
    this.fragment = options.fragment;
    this.attributes = options.attributes;
    this.stride = options.stride ?? packed.stride;
    this.vertices = options.vertices;
    this.uniforms = { ...(options.uniforms ?? {}) };
    this.blend = options.blend ?? true;
    this.modeName = options.drawMode ?? 'TRIANGLES';
    this.renderingMode = options.renderingMode;
  }

  /** 属性偏移（供 render 绑定使用） */
  private get offsets(): number[] {
    return packAttributes(this.attributes).offsets;
  }

  private compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[ShaderLayer] shader 编译失败:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  onAdd(map: unknown, gl: WebGLRenderingContext): void {
    this.map = map as { getCanvas?: () => { width: number; height: number } };
    this.gl = gl;
    const vs = this.compile(gl, gl.VERTEX_SHADER, this.vertex);
    const fs = this.compile(gl, gl.FRAGMENT_SHADER, this.fragment);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ShaderLayer] program 链接失败:', gl.getProgramInfoLog(program));
      return;
    }
    this.program = program;
    const buffer = gl.createBuffer();
    if (buffer) {
      this.buffer = buffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    }
  }

  render(gl: WebGLRenderingContext, matrix: number[] | Float32Array): void {
    const program = this.program;
    if (!program) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    // 属性绑定
    const strideBytes = this.stride * 4;
    const offsets = this.offsets;
    this.attributes.forEach((a, i) => {
      const loc = gl.getAttribLocation(program, a.name);
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, a.size, gl.FLOAT, false, strideBytes, offsets[i] * 4);
    });

    // 内置 uniform
    const uMatrix = gl.getUniformLocation(program, 'uMatrix');
    if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, new Float32Array(matrix as number[]));
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    if (uResolution) {
      const canvas = this.map?.getCanvas?.();
      gl.uniform2f(uResolution, canvas?.width ?? 1024, canvas?.height ?? 768);
    }

    // 用户 uniform
    for (const [name, value] of Object.entries(this.uniforms)) {
      if (name === 'uMatrix' || name === 'uResolution') continue;
      setUniformValue(gl, gl.getUniformLocation(program, name), value);
    }

    if (this.blend) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }

    const mode =
      this.modeName === 'LINES' ? gl.LINES : this.modeName === 'POINTS' ? gl.POINTS : gl.TRIANGLES;
    gl.drawArrays(mode, 0, Math.floor(this.vertices.length / this.stride));
  }

  onRemove(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.buffer = null;
    this.program = null;
    this.gl = null;
  }

  /** 动态替换顶点数据（无需重建图层） */
  setVertices(vertices: Float32Array): void {
    this.vertices = vertices;
    const gl = this.gl;
    if (!gl || !this.buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  /** 设置单个 uniform（如驱动流动动画的 uTime） */
  setUniform(name: string, value: ShaderUniformValue): void {
    this.uniforms[name] = value;
  }

  /** 批量设置 uniform */
  setUniforms(patch: Record<string, ShaderUniformValue>): void {
    Object.assign(this.uniforms, patch);
  }

  /** 当前顶点数 */
  get vertexCount(): number {
    return Math.floor(this.vertices.length / this.stride);
  }
}
