import { createApp } from 'vue';
import type { App } from 'vue';
import ScreenViewer from '../editor/ScreenViewer.vue';
import type { DashboardConfig } from '../types';

/**
 * 大屏渲染运行时（W4）—— 渲染引擎入口。
 * 对应 PRD《大屏可视化编辑器》核心流程最后一步：渲染引擎读取 JSON → 自动搭建大屏。
 *
 * 用法：
 *   import { renderFromJSON } from '@caoguo/map-editor';
 *   import '@caoguo/map-editor/style.css';
 *   const handle = renderFromJSON('#app', jsonString);
 *   handle.unmount(); // 卸载
 */

/** 渲染句柄：可用于卸载大屏 */
export interface ScreenHandle {
  /** Vue 应用实例 */
  app: App;
  /** 卸载大屏（移除 DOM 并停止轮播等定时器） */
  unmount(): void;
}

function resolveContainer(container: HTMLElement | string): HTMLElement {
  const el =
    typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container;
  if (!el) throw new Error('渲染容器不存在：' + String(container));
  return el;
}

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

/**
 * 渲染大屏到指定容器。
 * - 默认全屏播放器（position:fixed）
 * - `options.embedded: true` 嵌入模式：随父容器尺寸自适应（父容器需给定宽高）
 * 注意：需自行引入样式 `import '@caoguo/map-editor/style.css'`。
 */
export function renderScreen(
  container: HTMLElement | string,
  config: DashboardConfig,
  options: { embedded?: boolean } = {},
): ScreenHandle {
  const el = resolveContainer(container);
  const app = createApp(ScreenViewer, { config, embedded: options.embedded ?? false });
  app.mount(el);
  return { app, unmount: () => app.unmount() };
}

/**
 * 从 JSON 字符串渲染大屏。JSON 无效时抛错（message 含原因）。
 */
export function renderFromJSON(container: HTMLElement | string, json: string): ScreenHandle {
  const { config, reason } = parseScreenJSON(json);
  if (!config) throw new Error('大屏配置无效：' + (reason ?? '未知错误'));
  return renderScreen(container, config);
}
