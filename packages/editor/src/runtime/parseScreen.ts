/**
 * 大屏 JSON 校验与解析（纯函数，无 Vue/DOM 依赖）
 *
 * 从 renderScreen.ts 拆出：renderScreen/renderFromJSON 依赖 Vue 与 ScreenViewer 组件，
 * 无法在 node 测试环境加载（vitest 无 vue 插件）；本模块保持纯函数以便单测错误路径。
 */

import type { DashboardConfig } from '../types';

/**
 * 校验并解析大屏 JSON。
 * 返回解析结果；config 为 null 时 reason 说明原因。
 */
export function parseScreenJSON(json: string): { config: DashboardConfig | null; reason?: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { config: null, reason: 'JSON 语法错误：' + (e as Error).message };
  }
  const cfg = raw as DashboardConfig;
  if (!cfg || typeof cfg !== 'object') return { config: null, reason: '配置不是对象' };
  if (!Array.isArray(cfg.scenes)) return { config: null, reason: '缺少 scenes 数组' };
  if (cfg.scenes.length === 0) return { config: null, reason: 'scenes 为空（至少需一个场景）' };
  if (!cfg.canvas || typeof cfg.canvas.width !== 'number') return { config: null, reason: '缺少 canvas.width' };
  return { config: cfg };
}
