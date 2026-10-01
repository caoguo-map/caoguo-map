export { CustomLineLayer } from './CustomLineLayer';
export type { CustomLayerInterface, GlowLayerOptions } from './CustomLineLayer';
export {
  buildGlowGeometry,
  glowPasses,
  projectSimple,
} from './glowGeometry';
export type { GlowLine, GlowPass, GlowGeometry } from './glowGeometry';
// 通用 Shader 框架（PRD F-1.3）
export { ShaderLayer, packAttributes, setUniformValue } from './shaderLayer';
export type {
  ShaderAttributeSpec,
  ShaderUniformValue,
  ShaderLayerOptions,
} from './shaderLayer';
// 预置着色器与几何（普通线 / 流动线）
export {
  LINE_VERT,
  LINE_FRAG,
  FLOW_LINE_VERT,
  FLOW_LINE_FRAG,
  buildLineGeometry,
  buildFlowLineGeometry,
} from './shaderPresets';
export type { LinePoints } from './shaderPresets';
