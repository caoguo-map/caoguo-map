/**
 * 预置着色器与几何构造（PRD F-1.3 通用 Shader 框架的配套预设）
 *
 * 提供两套开箱即用的线渲染方案（配合 `ShaderLayer` 使用）：
 * 1. **普通线**（`LINE_VERT` / `LINE_FRAG`）：屏幕空间等像素宽度 + 加法混合，
 *    是 `CustomLineLayer`（辉光）的单色简化版，适合不需要分组着色的场景；
 * 2. **流动线**（`FLOW_LINE_VERT` / `FLOW_LINE_FRAG`）：沿线累积距离驱动虚线流动，
 *    用于**管线流向 / 路网车流 / 水系流向**等动态表达（F-1.3 点名的三类线条）。
 *
 * 几何构造为纯函数、不依赖 WebGL，可在 Node 单测。
 */

import { projectSimple } from './glowGeometry';

/** 普通线：aPos(2) / aDir(2) / aSide(1)，stride = 5 */
export const LINE_VERT = `
attribute vec2 aPos;
attribute vec2 aDir;
attribute float aSide;
uniform mat4 uMatrix;
uniform float uWidth;
uniform vec2 uResolution;
void main() {
  vec4 clip = uMatrix * vec4(aPos, 0.0, 1.0);
  vec4 clipDir = uMatrix * vec4(aPos + aDir, 0.0, 1.0);
  vec2 s0 = clip.xy / clip.w;
  vec2 s1 = clipDir.xy / clipDir.w;
  vec2 dir = normalize(s1 - s0 + vec2(1e-6));
  vec2 normal = vec2(-dir.y, dir.x);
  vec2 offset = normal * aSide * (uWidth / uResolution * 2.0);
  gl_Position = vec4(s0 + offset * clip.w, clip.z, clip.w);
}
`;

export const LINE_FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  gl_FragColor = vec4(uColor, uOpacity);
}
`;

/** 流动线：在普通线基础上增加 aDist（沿线累积距离）与 uTime/uDash/uSpeed */
export const FLOW_LINE_VERT = `
attribute vec2 aPos;
attribute vec2 aDir;
attribute float aSide;
attribute float aDist;
uniform mat4 uMatrix;
uniform float uWidth;
uniform vec2 uResolution;
varying float vDist;
void main() {
  vec4 clip = uMatrix * vec4(aPos, 0.0, 1.0);
  vec4 clipDir = uMatrix * vec4(aPos + aDir, 0.0, 1.0);
  vec2 s0 = clip.xy / clip.w;
  vec2 s1 = clipDir.xy / clipDir.w;
  vec2 dir = normalize(s1 - s0 + vec2(1e-6));
  vec2 normal = vec2(-dir.y, dir.x);
  vec2 offset = normal * aSide * (uWidth / uResolution * 2.0);
  vDist = aDist;
  gl_Position = vec4(s0 + offset * clip.w, clip.z, clip.w);
}
`;

export const FLOW_LINE_FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uDash;
uniform float uSpeed;
varying float vDist;
void main() {
  // 沿线流动的虚线：亮段占 45%，其余为暗底（保证线形连续可见）
  float phase = fract((vDist - uTime * uSpeed) / max(uDash, 1e-6));
  float on = step(phase, 0.45);
  float a = uOpacity * mix(0.18, 1.0, on);
  gl_FragColor = vec4(uColor, a);
}
`;

/** 一条折线（经纬度点序列） */
export type LinePoints = [number, number][];

/** 普通线几何：每段一个四边形（6 个顶点），stride = 5 */
export function buildLineGeometry(lines: LinePoints[]): { vertices: Float32Array; stride: number } {
  const out: number[] = [];
  for (const pts of lines) {
    if (!pts || pts.length < 2) continue;
    const proj = pts.map(([lng, lat]) => projectSimple(lng, lat));
    for (let i = 0; i < proj.length - 1; i += 1) {
      const [x0, y0] = proj[i];
      const [x1, y1] = proj[i + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1e-6;
      const dirX = dx / len;
      const dirY = dy / len;
      // 两个三角形拼成沿线段的长条
      out.push(x0, y0, dirX, dirY, -1);
      out.push(x1, y1, dirX, dirY, -1);
      out.push(x1, y1, dirX, dirY, 1);
      out.push(x0, y0, dirX, dirY, -1);
      out.push(x1, y1, dirX, dirY, 1);
      out.push(x0, y0, dirX, dirY, 1);
    }
  }
  return { vertices: new Float32Array(out), stride: 5 };
}

/** 流动线几何：在普通线基础上携带沿线累积距离 aDist，stride = 6 */
export function buildFlowLineGeometry(lines: LinePoints[]): {
  vertices: Float32Array;
  stride: number;
  /** 全线最大累积距离（世界单位），便于按实际尺度设置 uDash */
  maxDistance: number;
} {
  const out: number[] = [];
  let maxDistance = 0;
  for (const pts of lines) {
    if (!pts || pts.length < 2) continue;
    const proj = pts.map(([lng, lat]) => projectSimple(lng, lat));
    // 逐点累积距离
    const dists: number[] = [0];
    for (let i = 1; i < proj.length; i += 1) {
      dists.push(dists[i - 1] + Math.hypot(proj[i][0] - proj[i - 1][0], proj[i][1] - proj[i - 1][1]));
    }
    maxDistance = Math.max(maxDistance, dists[dists.length - 1]);
    for (let i = 0; i < proj.length - 1; i += 1) {
      const [x0, y0] = proj[i];
      const [x1, y1] = proj[i + 1];
      const d0 = dists[i];
      const d1 = dists[i + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1e-6;
      const dirX = dx / len;
      const dirY = dy / len;
      out.push(x0, y0, dirX, dirY, -1, d0);
      out.push(x1, y1, dirX, dirY, -1, d1);
      out.push(x1, y1, dirX, dirY, 1, d1);
      out.push(x0, y0, dirX, dirY, -1, d0);
      out.push(x1, y1, dirX, dirY, 1, d1);
      out.push(x0, y0, dirX, dirY, 1, d0);
    }
  }
  return { vertices: new Float32Array(out), stride: 6, maxDistance };
}
