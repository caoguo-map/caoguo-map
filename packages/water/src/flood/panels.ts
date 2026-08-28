/**
 * 淹没参数面板 HTML（PRD phase-2-grid-water §4.2 F-1）
 *
 * F-1 `renderFloodParamsHtml(input)`：降雨量/来水量/河段选择输入控件，
 * `data-field` 属性供事件委托——回调里改 `FloodInput` 后重跑 `simulateFlood()`。
 *
 * 纯字符串输出（内容转义防注入），不依赖框架。
 */

import { escapeHtml } from '@caoguo/maplibre';

export interface FloodParamsHtmlOptions {
  /** 当前参数值（用于回填控件） */
  rainfall?: number;
  inflow?: number;
  /** 河段选项（id + 名称） */
  reaches?: Array<{ id: string; name: string }>;
  /** 当前选中的河段 id */
  reachId?: string;
  style?: 'inline' | 'class';
}

const ROW_CSS =
  'display:flex;align-items:center;gap:8px;padding:6px 0;font:13px/1.6 system-ui,sans-serif;color:#e2e8f0';
const LABEL_CSS = 'min-width:72px;color:#94a3b8';
const INPUT_CSS = 'flex:1;accent-color:#38bdf8';

/** F-1 淹没参数面板 */
export function renderFloodParamsHtml(opts: FloodParamsHtmlOptions = {}): string {
  const inline = (opts.style ?? 'inline') === 'inline';
  const esc = escapeHtml;
  const row = (inner: string) =>
    `<div class="cg-panel__param-row"${inline ? ` style="${ROW_CSS}"` : ''}>${inner}</div>`;
  const label = (text: string) =>
    `<span class="cg-panel__param-label"${inline ? ` style="${LABEL_CSS}"` : ''}>${esc(text)}</span>`;

  const rainfall = row(
    `${label('降雨量 (mm)')}<input type="number" class="cg-panel__param" data-field="rainfall"
      value="${opts.rainfall ?? 100}" min="0" step="10"${inline ? ` style="${INPUT_CSS}"` : ''}/>`
  );
  const inflow = row(
    `${label('来水量 (m³/s)')}<input type="number" class="cg-panel__param" data-field="inflow"
      value="${opts.inflow ?? 200}" min="0" step="20"${inline ? ` style="${INPUT_CSS}"` : ''}/>`
  );
  const reachOpts = (opts.reaches ?? [])
    .map(
      (r) =>
        `<option value="${esc(r.id)}"${r.id === opts.reachId ? ' selected' : ''}>${esc(r.name)}</option>`
    )
    .join('');
  const reach = opts.reaches
    ? row(
        `${label('河段')}<select class="cg-panel__param" data-field="reachId"${inline ? ` style="${INPUT_CSS}"` : ''}>${reachOpts}</select>`
      )
    : '';

  return `<div class="cg-panel cg-panel--flood-params">${rainfall}${inflow}${reach}
  <div class="cg-panel__hint"${inline ? ` style="color:#64748b;font-size:11px;margin-top:6px"` : ''}>
    监听 change 事件（data-field）→ 更新 FloodInput → simulateFlood()。
  </div>
</div>`;
}
