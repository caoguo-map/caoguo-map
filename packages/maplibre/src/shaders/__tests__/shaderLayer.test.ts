import { describe, it, expect, vi } from 'vitest';
import { ShaderLayer, packAttributes, setUniformValue } from '../shaderLayer';
import {
  LINE_VERT,
  LINE_FRAG,
  FLOW_LINE_VERT,
  FLOW_LINE_FRAG,
  buildLineGeometry,
  buildFlowLineGeometry,
} from '../shaderPresets';

/** 最小 WebGL 桩：只记录调用，不真渲染（本包测试不加载 WebGL） */
function makeGl() {
  const calls: Array<[string, unknown[]]> = [];
  const rec = (name: string) => vi.fn((...args: unknown[]) => { calls.push([name, args]); });
  return {
    calls,
    gl: {
      VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
      ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, BLEND: 8, SRC_ALPHA: 9, ONE: 10,
      TRIANGLES: 11, LINES: 12, POINTS: 13,
      createShader: vi.fn(() => ({})),
      shaderSource: rec('shaderSource'),
      compileShader: rec('compileShader'),
      getShaderParameter: vi.fn(() => true),
      getShaderInfoLog: vi.fn(() => null),
      deleteShader: rec('deleteShader'),
      createProgram: vi.fn(() => ({})),
      attachShader: rec('attachShader'),
      linkProgram: rec('linkProgram'),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(() => null),
      deleteProgram: rec('deleteProgram'),
      useProgram: rec('useProgram'),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: rec('bindBuffer'),
      bufferData: rec('bufferData'),
      deleteBuffer: rec('deleteBuffer'),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: rec('enableVertexAttribArray'),
      vertexAttribPointer: rec('vertexAttribPointer'),
      getUniformLocation: vi.fn(() => ({})),
      uniform1f: rec('uniform1f'),
      uniform2f: rec('uniform2f'),
      uniform3f: rec('uniform3f'),
      uniform4f: rec('uniform4f'),
      uniform1fv: rec('uniform1fv'),
      uniformMatrix4fv: rec('uniformMatrix4fv'),
      drawArrays: rec('drawArrays'),
      enable: rec('enable'),
      blendFunc: rec('blendFunc'),
    } as unknown as WebGLRenderingContext,
  };
}

describe('F-1.3 通用 Shader 框架', () => {
  it('packAttributes：省略 offset 时紧凑排列并推导 stride', () => {
    const r = packAttributes([{ name: 'aPos', size: 2 }, { name: 'aDir', size: 2 }, { name: 'aSide', size: 1 }]);
    expect(r.offsets).toEqual([0, 2, 4]);
    expect(r.stride).toBe(5);
  });

  it('packAttributes：显式 offset 优先', () => {
    const r = packAttributes([{ name: 'a', size: 2 }, { name: 'b', size: 1, offset: 4 }]);
    expect(r.offsets).toEqual([0, 4]);
    expect(r.stride).toBe(5);
  });

  it('setUniformValue 按值形状分派（标量/向量/mat4/长数组）', () => {
    const { gl, calls } = makeGl();
    const loc = {} as WebGLUniformLocation;
    setUniformValue(gl, loc, 3);
    setUniformValue(gl, loc, [1, 2]);
    setUniformValue(gl, loc, [1, 2, 3]);
    setUniformValue(gl, loc, [1, 2, 3, 4]);
    setUniformValue(gl, loc, new Float32Array(16));
    setUniformValue(gl, loc, new Float32Array([1, 2, 3, 4, 5]));
    expect(calls.map((c) => c[0])).toEqual([
      'uniform1f', 'uniform2f', 'uniform3f', 'uniform4f', 'uniformMatrix4fv', 'uniform1fv',
    ]);
  });

  it('setUniformValue 对空 location 静默跳过', () => {
    const { gl, calls } = makeGl();
    setUniformValue(gl, null, 1);
    expect(calls).toEqual([]);
  });

  it('ShaderLayer 构造：默认 id / stride 推导 / uniform 保留', () => {
    const layer = new ShaderLayer({
      vertex: LINE_VERT,
      fragment: LINE_FRAG,
      attributes: [{ name: 'aPos', size: 2 }, { name: 'aDir', size: 2 }, { name: 'aSide', size: 1 }],
      vertices: new Float32Array(15),
      uniforms: { uWidth: 3, uColor: [0.1, 0.2, 0.3] },
    });
    expect(layer.id).toBe('caoguo-shader-layer');
    expect(layer.vertexCount).toBe(3); // 15 / stride 5
    expect(layer.type).toBe('custom');
  });

  it('ShaderLayer 生命周期：onAdd 编译链接并上传 buffer，onRemove 释放', () => {
    const { gl, calls } = makeGl();
    const layer = new ShaderLayer({
      id: 'my-shader',
      vertex: LINE_VERT,
      fragment: LINE_FRAG,
      attributes: [{ name: 'aPos', size: 2 }],
      vertices: new Float32Array(4),
    });
    layer.onAdd({ getCanvas: () => ({ width: 800, height: 600 }) }, gl);
    expect(calls.some((c) => c[0] === 'linkProgram')).toBe(true);
    expect(calls.some((c) => c[0] === 'bufferData')).toBe(true);
    layer.onRemove();
    expect(calls.some((c) => c[0] === 'deleteBuffer')).toBe(true);
    expect(calls.some((c) => c[0] === 'deleteProgram')).toBe(true);
  });

  it('ShaderLayer.render 注入内置 uMatrix/uResolution 并按顶点数绘制', () => {
    const { gl, calls } = makeGl();
    const layer = new ShaderLayer({
      vertex: LINE_VERT,
      fragment: LINE_FRAG,
      attributes: [{ name: 'aPos', size: 2 }, { name: 'aDir', size: 2 }, { name: 'aSide', size: 1 }],
      vertices: new Float32Array(30), // stride 5 → 6 个顶点
      uniforms: { uWidth: 4 },
    });
    layer.onAdd({ getCanvas: () => ({ width: 800, height: 600 }) }, gl);
    calls.length = 0;
    layer.render(gl, new Float32Array(16));
    const names = calls.map((c) => c[0]);
    expect(names).toContain('uniformMatrix4fv'); // uMatrix
    expect(names).toContain('uniform2f'); // uResolution
    expect(names).toContain('uniform1f'); // uWidth
    const draw = calls.find((c) => c[0] === 'drawArrays');
    expect(draw?.[1][2]).toBe(6); // 顶点数
  });
});

describe('F-1.3 预置着色器与几何', () => {
  const line: Array<[number, number]> = [[114.3, 30.5], [114.31, 30.5], [114.32, 30.51]];

  it('预设 GLSL 声明了框架会用到的 uniform/attribute', () => {
    expect(LINE_VERT).toContain('uniform mat4 uMatrix');
    expect(LINE_VERT).toContain('uniform vec2 uResolution');
    expect(FLOW_LINE_VERT).toContain('attribute float aDist');
    expect(FLOW_LINE_FRAG).toContain('uniform float uTime');
    expect(LINE_FRAG).toContain('gl_FragColor');
  });

  it('buildLineGeometry：stride 5，每段 6 个顶点，side 取 ±1', () => {
    const g = buildLineGeometry([line]);
    expect(g.stride).toBe(5);
    expect(g.vertices.length).toBe(2 * 6 * 5); // 2 段 × 6 顶点 × stride 5
    for (let i = 0; i < g.vertices.length; i += g.stride) {
      expect(Math.abs(g.vertices[i + 4])).toBe(1); // aSide
    }
  });

  it('buildFlowLineGeometry：stride 6，累积距离递增且返回 maxDistance', () => {
    const g = buildFlowLineGeometry([line]);
    expect(g.stride).toBe(6);
    expect(g.vertices.length).toBe(2 * 6 * 6);
    expect(g.maxDistance).toBeGreaterThan(0);
    // 同一段内第二点的累积距离必不小于第一点
    for (let v = 0; v < g.vertices.length; v += g.stride * 3) {
      const d0 = g.vertices[v + 5];
      const d1 = g.vertices[v + g.stride + 5];
      expect(d1).toBeGreaterThanOrEqual(d0);
    }
  });

  it('几何构造忽略不足两点的折线', () => {
    expect(buildLineGeometry([[[114.3, 30.5]]]).vertices.length).toBe(0);
    expect(buildFlowLineGeometry([[[114.3, 30.5]]]).vertices.length).toBe(0);
  });
});
