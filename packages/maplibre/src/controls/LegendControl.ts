/**
 * 图例控件（通用）。
 *
 * 行业专题图（水深色阶 / 光缆利用率 / 闸站状态 / 故障告警等）渲染后，
 * 需要用户可读的图例说明。本控件接收数据驱动的图例项（label + color），
 * 以「色块 + 文案」形式渲染；支持运行时 setItems 随图层切换更新。
 *
 * 设计为「纯函数 renderLegendHtml + 薄 DOM 绑定」：renderLegendHtml 不依赖浏览器，可独立单测。
 */

export interface LegendItem {
  /** 文案，如「水深 > 3m」「利用率高」 */
  label: string;
  /** 色值（CSS color，可与渲染层 paint 配色保持一致） */
  color: string;
  /** 标记形状：color 色块（默认）/ line 线段 */
  shape?: 'color' | 'line';
}

export interface LegendOptions {
  /** 图例标题（可选） */
  title?: string;
  /** 图例项 */
  items: LegendItem[];
  /** 挂载容器（可选；不传则自动创建） */
  container?: HTMLElement;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

/** 纯函数：根据图例项生成 HTML 字符串（可单测） */
export function renderLegendHtml(items: LegendItem[], title?: string): string {
  const titleHtml = title ? `<div class="cg-legend-title">${escapeHtml(title)}</div>` : '';
  const itemsHtml = items
    .map((it) => {
      const swatch =
        it.shape === 'line'
          ? `<span class="cg-legend-swatch cg-legend-swatch--line" style="background:${it.color}"></span>`
          : `<span class="cg-legend-swatch" style="background:${it.color}"></span>`;
      return `<div class="cg-legend-item">${swatch}<span>${escapeHtml(it.label)}</span></div>`;
    })
    .join('');
  return `<div class="cg-legend-body">${titleHtml}${itemsHtml}</div>`;
}

/** 图例控件 */
export class LegendControl {
  private el: HTMLElement;
  private bodyEl: HTMLElement;
  private opts: Required<Pick<LegendOptions, 'title'>> & { items: LegendItem[] };

  constructor(options: LegendOptions) {
    this.opts = { title: options.title ?? '', items: options.items };
    this.el = options.container ?? document.createElement('div');
    this.el.className = 'caoguo-legend-control';
    this.el.style.cssText =
      'position:absolute;right:10px;top:10px;padding:8px 10px;background:rgba(10,15,30,.72);color:#cfe;border-radius:6px;font:12px/1.5 system-ui,sans-serif;z-index:2;max-width:220px;';
    this.bodyEl = document.createElement('div');
    this.el.appendChild(this.bodyEl);
    this.render();
  }

  private render(): void {
    this.bodyEl.innerHTML = renderLegendHtml(this.opts.items, this.opts.title || undefined);
  }

  /** 运行时更新图例项（随图层切换重新渲染） */
  setItems(items: LegendItem[], title?: string): void {
    if (title !== undefined) this.opts.title = title;
    this.opts.items = items;
    this.render();
  }

  /** 挂载到容器 */
  addTo(container: HTMLElement): this {
    if (!this.el.parentElement) container.appendChild(this.el);
    return this;
  }

  remove(): void {
    this.el.remove();
  }
}
