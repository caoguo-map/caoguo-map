/**
 * 泄漏参数面板 HTML（PRD phase-1-pipeline §4.3 L-1）
 *
 * `renderLeakParamsHtml()`：风向/风速/泄漏量/释放高度/稳定度 输入控件，
 * `data-field` 属性供事件委托——回调里取值后经 `leakParamsFromForm()` 重跑 `simulateGas()`。
 *
 * 与 water `renderFloodParamsHtml` 同构：纯字符串输出（内容转义防注入），不依赖框架。
 *
 * 单位口径：**面板用气象习惯**（风向 = 来向度数、0=北顺时针；风速 m/s），
 * 由 `leakParamsFromForm()` 统一转换成高斯烟羽所需的弧度，避免调用方手工换算出错。
 */

import { escapeHtml } from '@caoguo/maplibre';
import { windDegToRadians } from './weather';

export interface LeakParamsHtmlOptions {
  /** 风向（来向度，0=北顺时针） */
  windDirectionDeg?: number;
  /** 风速（m/s） */
  windSpeed?: number;
  /** 泄漏速率（kg/s） */
  leakRate?: number;
  /** 释放高度（m） */
  releaseHeight?: number;
  /** 大气稳定度（可选，不传则自动分类） */
  stability?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  style?: 'inline' | 'class';
}

const ROW_CSS =
  'display:flex;align-items:center;gap:8px;padding:6px 0;font:13px/1.6 system-ui,sans-serif;color:#e2e8f0';
const LABEL_CSS = 'min-width:84px;color:#94a3b8';
const INPUT_CSS = 'flex:1;accent-color:#fb923c';

const STABILITIES: Array<'A' | 'B' | 'C' | 'D' | 'E' | 'F'> = ['A', 'B', 'C', 'D', 'E', 'F'];

/** L-1 泄漏参数面板 */
export function renderLeakParamsHtml(opts: LeakParamsHtmlOptions = {}): string {
  const inline = (opts.style ?? 'inline') === 'inline';
  const esc = escapeHtml;
  const row = (inner: string) =>
    `<div class="cg-panel__param-row"${inline ? ` style="${ROW_CSS}"` : ''}>${inner}</div>`;
  const label = (text: string) =>
    `<span class="cg-panel__param-label"${inline ? ` style="${LABEL_CSS}"` : ''}>${esc(text)}</span>`;
  const num = (field: string, value: number, min: number, step: number) =>
    `<input type="number" class="cg-panel__param" data-field="${field}" value="${value}" min="${min}" step="${step}"${inline ? ` style="${INPUT_CSS}"` : ''}/>`;

  const windDir = row(`${label('风向 (°)')}${num('windDirectionDeg', opts.windDirectionDeg ?? 0, 0, 5)}`);
  const windSpeed = row(`${label('风速 (m/s)')}${num('windSpeed', opts.windSpeed ?? 3, 0, 0.5)}`);
  const leakRate = row(`${label('泄漏量 (kg/s)')}${num('leakRate', opts.leakRate ?? 2, 0, 0.5)}`);
  const height = row(`${label('释放高度 (m)')}${num('releaseHeight', opts.releaseHeight ?? 2, 0, 1)}`);

  const stabilityOpts = STABILITIES.map(
    (s) => `<option value="${s}"${s === opts.stability ? ' selected' : ''}>${s}</option>`,
  ).join('');
  const stability = row(
    `${label('稳定度')}<select class="cg-panel__param" data-field="stability"${inline ? ` style="${INPUT_CSS}"` : ''}><option value="">自动</option>${stabilityOpts}</select>`,
  );

  return `<div class="cg-panel cg-panel--leak-params">${windDir}${windSpeed}${leakRate}${height}${stability}
  <div class="cg-panel__hint"${inline ? ` style="color:#64748b;font-size:11px;margin-top:6px"` : ''}>
    监听 change 事件（data-field）→ leakParamsFromForm() 转换风向为弧度 → simulateGas()。
  </div>
</div>`;
}

/** 面板表单值（多为字符串，来自 input.value） */
export interface LeakParamsFormValues {
  windDirectionDeg?: number | string;
  windSpeed?: number | string;
  leakRate?: number | string;
  releaseHeight?: number | string;
  stability?: string;
}

function toNum(v: number | string | undefined, fallback: number): number {
  if (v === undefined || v === null) return fallback;
  // 注意：Number('') === 0（空串不是 NaN），必须显式判空，否则清空输入框会被当成 0 而非回退默认值
  const n = typeof v === 'string' ? (v.trim() === '' ? NaN : Number(v)) : v;
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 面板取值 → 可直接交给 `simulateGas()` 的参数。
 *
 * 关键：把面板的「来向度数」经 `windDegToRadians` 转成烟羽所需弧度，
 * 调用方不必（也不应）自己换算，避免两套角度口径混用导致烟羽吹向反方向。
 */
export function leakParamsFromForm(values: LeakParamsFormValues): {
  windDirection: number;
  windSpeed: number;
  leakRate: number;
  releaseHeight: number;
  stability?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
} {
  const out: {
    windDirection: number;
    windSpeed: number;
    leakRate: number;
    releaseHeight: number;
    stability?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  } = {
    windDirection: windDegToRadians(toNum(values.windDirectionDeg, 0)),
    windSpeed: Math.max(0, toNum(values.windSpeed, 3)),
    leakRate: Math.max(0, toNum(values.leakRate, 2)),
    releaseHeight: Math.max(0, toNum(values.releaseHeight, 2)),
  };
  const s = values.stability;
  if (s && (STABILITIES as string[]).includes(s)) out.stability = s as 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  return out;
}
