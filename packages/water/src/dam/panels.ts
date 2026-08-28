/**
 * 水库调度面板 HTML（PRD phase-2-grid-water §4.3 DO-1 / DO-2）
 *
 * 与 `renderCardHtml` 同构的零依赖 HTML 生成器：
 * - DO-1 `renderReservoirPanelHtml(details)`：多水库状态表（水位/库容/蓄泄/超警戒）
 * - DO-2 `renderScheduleEditorHtml(details, outflows)`：调度方案编辑器
 *   （每水库一行滑杆，`data-reservoir-id` 属性供事件委托，回调里调
 *   `DamOperation.setGateFlow()` / `simulate()` 即可闭环）
 *
 * 纯字符串输出（内容转义防注入），不依赖框架；`style:'class'` 模式配合自定义 CSS。
 */

import type { ReservoirDetail } from '../river/reservoirCard';
import { escapeHtml } from '@caoguo/maplibre';

export interface PanelStyleOptions {
  /** `inline`（默认，极简内联样式）/ `class`（仅 cg-panel__* 类名） */
  style?: 'inline' | 'class';
}

const TABLE_CSS =
  'width:100%;border-collapse:collapse;font:13px/1.6 system-ui,sans-serif;color:#e2e8f0';
const TD_CSS = 'padding:4px 8px;border-bottom:1px solid #1e293b;text-align:left';

/** DO-1 多水库状态面板（水位/库容/蓄泄状态/超警戒标红） */
export function renderReservoirPanelHtml(
  details: ReservoirDetail[],
  opts: PanelStyleOptions = {}
): string {
  const inline = (opts.style ?? 'inline') === 'inline';
  const esc = escapeHtml;
  const td = (css: string, extra = '') =>
    inline ? ` style="${TD_CSS};${css}${extra}"` : '';

  const rows = details
    .map((d) => {
      const warn = d.cardInfo.overWarning;
      const nameTd = `<td${td('', warn ? ';color:#f87171;font-weight:700' : '')}>${esc(d.cardInfo.title)}</td>`;
      return `<tr>
  ${nameTd}
  <td${td('color:#94a3b8')}>${esc(d.cardInfo.statusLabel)}</td>
  <td${td('')}>${esc(d.cardInfo.storageLabel ?? '—')}</td>
  <td${td(warn ? ';color:#f87171' : ';color:#94a3b8')}>${esc(d.cardInfo.levelLabel ?? '—')}</td>
  <td${td('')}>${esc(d.cardInfo.capacityLabel ?? '—')}</td>
</tr>`;
    })
    .join('');

  return `<table class="cg-panel cg-panel--reservoir"${inline ? ` style="${TABLE_CSS}"` : ''}>
  <thead><tr>
    <th${td('color:#94a3b8')}>水库</th><th${td('color:#94a3b8')}>状态</th>
    <th${td('color:#94a3b8')}>蓄水率</th><th${td('color:#94a3b8')}>水位</th>
    <th${td('color:#94a3b8')}>库容</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

/** DO-2 调度方案编辑器（每水库一行滑杆；事件委托回调里调 setGateFlow/simulate） */
export function renderScheduleEditorHtml(
  details: ReservoirDetail[],
  opts: PanelStyleOptions & { outflows?: Record<string, number> } = {}
): string {
  const inline = (opts.style ?? 'inline') === 'inline';
  const esc = escapeHtml;
  const rowCss = 'display:flex;align-items:center;gap:8px;padding:6px 0;font:13px/1.6 system-ui,sans-serif;color:#e2e8f0';
  const rangeCss = 'flex:1;accent-color:#38bdf8';
  const valCss = 'min-width:64px;text-align:right;color:#94a3b8';

  const rows = details
    .map((d) => {
      const current = opts.outflows?.[d.id] ?? 0;
      return `<div class="cg-panel__editor-row" data-reservoir-id="${esc(d.id)}"${inline ? ` style="${rowCss}"` : ''}>
  <span${inline ? ` style="min-width:96px"` : ''}>${esc(d.cardInfo.title)}</span>
  <input type="range" class="cg-panel__slider" data-reservoir-id="${esc(d.id)}"
         min="-200" max="200" step="10" value="${current}"${inline ? ` style="${rangeCss}"` : ''}/>
  <span class="cg-panel__editor-val" data-val-for="${esc(d.id)}"${inline ? ` style="${valCss}"` : ''}>${current} m³/s</span>
</div>`;
    })
    .join('');

  return `<div class="cg-panel cg-panel--editor">${rows}
  <div class="cg-panel__hint"${inline ? ` style="color:#64748b;font-size:11px;margin-top:6px"` : ''}>
    监听 input 事件（data-reservoir-id）→ setGateFlow() / simulate()；出库为正、蓄水为负。
  </div>
</div>`;
}
