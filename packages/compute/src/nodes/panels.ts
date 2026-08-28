/**
 * 算力面板 HTML（PRD phase-3 §4.1 C-2 详情 / C-4 调度面板）
 *
 * 与三张网面板同构：零依赖 HTML 字符串生成器（复用 `@caoguo/maplibre` 的
 * `renderCardHtml` / `escapeHtml`），交互经 data-* 事件委托。
 */

import { renderCardHtml, escapeHtml } from '@caoguo/maplibre';
import type { RenderCardOptions } from '@caoguo/maplibre';
import type { ComputeNodeDetail } from './ComputeNodes';
import type { AssignmentResult } from './assignment';

/** C-2 节点详情卡片（detail 来自 `ComputeNodes.getNodeDetail()`） */
export function renderNodeDetailHtml(
  detail: ComputeNodeDetail,
  opts: RenderCardOptions = {}
): string {
  const statusColor =
    detail.status === 'offline'
      ? '#f87171'
      : detail.status === 'maintenance'
        ? '#fbbf24'
        : '#4ade80';
  return renderCardHtml(
    {
      title: detail.name,
      subtitle: `${detail.type} · ${detail.nodeId}`,
      statusLabel: detail.status,
      statusColor,
      rows: [
        { label: '总算力', value: detail.totalCompute },
        { label: '已用算力', value: detail.usedCompute },
        { label: 'GPU 数量', value: String(detail.gpuCount) },
        { label: 'GPU 利用率', value: `${Math.round(detail.gpuUtilization * 100)}%` },
        { label: '存储', value: detail.storage },
        { label: '带宽', value: detail.networkBandwidth },
        ...(detail.region ? [{ label: '区域', value: detail.region }] : []),
      ],
    },
    opts
  );
}

/** C-4 分配结果配色（失败红 / 单故障正常绿） */
const ASSIGN_STATUS_COLOR = { ok: '#4ade80', fail: '#f87171' } as const;

/** C-4 调度面板：任务分配结果表（失败行标红并显示原因） */
export function renderAssignmentPanelHtml(
  results: AssignmentResult[],
  opts: { style?: 'inline' | 'class' } = {}
): string {
  const inline = (opts.style ?? 'inline') === 'inline';
  const esc = escapeHtml;
  const td = (extra = '') => (inline ? ` style="padding:4px 8px;border-bottom:1px solid #1e293b;${extra}"` : '');

  const rows = results
    .map((r) => {
      const ok = !!r.nodeId;
      const color = ok ? ASSIGN_STATUS_COLOR.ok : ASSIGN_STATUS_COLOR.fail;
      const node = ok ? `${esc(r.nodeName ?? r.nodeId!)}` : `未分配（${esc(r.reason ?? '')}）`;
      const util = r.utilizationAfter !== undefined ? `${Math.round(r.utilizationAfter * 100)}%` : '—';
      return `<tr>
  <td${td('color:#94a3b8')}>${esc(r.taskId)}</td>
  <td${td(`color:${color}`)}>${node}</td>
  <td${td('')}>${esc(r.strategy)}</td>
  <td${td('')}>${util}</td>
</tr>`;
    })
    .join('');

  return `<table class="cg-panel cg-panel--assignment"${inline ? ` style="width:100%;border-collapse:collapse;font:13px/1.6 system-ui,sans-serif;color:#e2e8f0"` : ''}>
  <thead><tr>
    <th${td('color:#94a3b8;text-align:left')}>任务</th><th${td('color:#94a3b8;text-align:left')}>分配节点</th>
    <th${td('color:#94a3b8;text-align:left')}>策略</th><th${td('color:#94a3b8;text-align:left')}>分配后利用率</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}
