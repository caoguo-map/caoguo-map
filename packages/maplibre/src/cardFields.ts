/**
 * 设备卡片通用字段解析（跨业务包共享）
 *
 * 各业务包（电网 grid / 管网 pipeline / 水网 water）的「设备卡片」都需要
 * 图片与维护记录两类可选附加信息。为**不侵入既有数据模型**，约定统一从
 * `properties.extra` 读取：
 *
 * ```ts
 * device.properties.extra = {
 *   images: ['https://…/a.jpg'],
 *   maintenance: [{ date: '2026-03-12', type: '例行巡检', operator: '张工', note: '正常' }],
 * }
 * ```
 *
 * 放这里而不是各业务包各写一份，是为了保证三张网的卡片字段口径一致。
 * 纯函数，无任何依赖，可在 Node 单测。
 */

/** 运维/检修记录 */
export interface MaintenanceRecord {
  /** 日期（ISO 或展示用字符串） */
  date: string;
  /** 记录类型，如 例行巡检 / 抢修 / 除险加固 / 闸门检修 */
  type: string;
  /** 操作人 */
  operator?: string;
  /** 备注 */
  note?: string;
}

/** 设备卡片通用可选字段（各业务包的 cardInfo 可按需扩展） */
export interface CardExtraFields {
  /** 图片 URL 列表 */
  images: string[];
  /** 维护/检修记录（已过滤非法项） */
  maintenance: MaintenanceRecord[];
}

/**
 * 读取图片列表（容错：非数组或含非字符串项时跳过）
 */
export function readImages(extra: Record<string, unknown> | undefined): string[] {
  const raw = extra?.images;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

/**
 * 读取维护记录（容错：逐条校验，缺少 date/type 的记录被丢弃）
 */
export function readMaintenance(
  extra: Record<string, unknown> | undefined
): MaintenanceRecord[] {
  const raw = extra?.maintenance;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const rec = item as Record<string, unknown>;
    if (typeof rec.date !== 'string' || typeof rec.type !== 'string') return [];
    return [
      {
        date: rec.date,
        type: rec.type,
        ...(typeof rec.operator === 'string' ? { operator: rec.operator } : {}),
        ...(typeof rec.note === 'string' ? { note: rec.note } : {}),
      },
    ];
  });
}

/**
 * 一次性解析两类可选字段（便捷入口）
 */
export function readCardFields(
  extra: Record<string, unknown> | undefined
): CardExtraFields {
  return { images: readImages(extra), maintenance: readMaintenance(extra) };
}

// ============================================================
// 设备卡片 HTML 渲染（零依赖 DOM 外壳，PRD G-2 / P-3 / R-2 共用）
// ============================================================

/** 卡片模型（各业务包的 detail → CardModel 后交给 `renderCardHtml`） */
export interface CardModel {
  title: string;
  subtitle?: string;
  /** 状态徽标文案（如「运行中」「泄洪中」「半开」） */
  statusLabel?: string;
  /** 状态徽标颜色（可选，默认灰） */
  statusColor?: string;
  /** 明细行 */
  rows?: Array<{ label: string; value: string }>;
  /** 图片 URL 列表 */
  images?: string[];
  /** 维护记录 */
  maintenance?: MaintenanceRecord[];
  /** 强调色（超警戒等场景），用于标题左侧色条 */
  accentColor?: string;
}

export interface RenderCardOptions {
  /**
   * `inline`（默认）：极简内联样式，开箱可读，适合快速接入；
   * `class`：只输出 `cg-card__*` 类名，样式由集成方提供（贴下方注释的默认样式）。
   */
  style?: 'inline' | 'class';
}

/**
 * 生成设备卡片 HTML（字符串，零依赖）。
 *
 * 用法（以管网为例）：
 * ```ts
 * const detail = topo.getNodeDetail(id);
 * el.innerHTML = renderCardHtml(toCardModel(detail));
 * ```
 *
 * `style: 'class'` 模式可配这段默认样式：
 * ```css
 * .cg-card { font: 13px/1.6 system-ui; color: #e2e8f0; background: #0b1320;
 *            border: 1px solid #1e293b; border-radius: 10px; padding: 12px 14px; max-width: 320px; }
 * .cg-card__title { font-size: 15px; font-weight: 700; }
 * .cg-card__subtitle { color: #64748b; font-size: 12px; margin-bottom: 8px; }
 * .cg-card__status { display: inline-block; padding: 1px 8px; border-radius: 999px;
 *                    background: #1e293b; font-size: 12px; margin-bottom: 8px; }
 * .cg-card__row { display: flex; justify-content: space-between; gap: 12px; }
 * .cg-card__label { color: #94a3b8; }
 * .cg-card__img { width: 100%; border-radius: 6px; margin-top: 6px; }
 * .cg-card__maint-item { border-top: 1px solid #1e293b; padding: 6px 0; font-size: 12px; }
 * ```
 */
export function renderCardHtml(card: CardModel, opts: RenderCardOptions = {}): string {
  const inline = (opts.style ?? 'inline') === 'inline';
  const esc = escapeHtml;

  const st = (css: string) => (inline ? ` style="${css}"` : '');
  const boxCss =
    'font:13px/1.6 system-ui,sans-serif;color:#e2e8f0;background:#0b1320;border:1px solid #1e293b;border-radius:10px;padding:12px 14px;max-width:320px';
  const accent = card.accentColor
    ? `border-left:3px solid ${esc(card.accentColor)};`
    : '';

  const status = card.statusLabel
    ? `<div class="cg-card__status"${st('margin-bottom:8px')}><span${st(`display:inline-block;padding:1px 8px;border-radius:999px;background:#1e293b;font-size:12px;${card.statusColor ? `color:${esc(card.statusColor)};` : ''}`)}>${esc(card.statusLabel)}</span></div>`
    : '';

  const rows = (card.rows ?? [])
    .map(
      (r) =>
        `<div class="cg-card__row"${st('display:flex;justify-content:space-between;gap:12px')}><span class="cg-card__label"${st('color:#94a3b8')}>${esc(r.label)}</span><span class="cg-card__value">${esc(r.value)}</span></div>`
    )
    .join('');

  const images = (card.images ?? [])
    .map(
      (src) =>
        `<img class="cg-card__img" src="${esc(src)}" alt=""${st('width:100%;border-radius:6px;margin-top:6px;display:block')}/>`
    )
    .join('');

  const maint = (card.maintenance ?? [])
    .map(
      (m) =>
        `<div class="cg-card__maint-item"${st('border-top:1px solid #1e293b;padding:6px 0;font-size:12px')}><span${st('color:#94a3b8')}>${esc(m.date)}</span> · ${esc(m.type)}${m.operator ? ` · ${esc(m.operator)}` : ''}${
          m.note ? `<div${st('color:#94a3b8')}>${esc(m.note)}</div>` : ''
        }</div>`
    )
    .join('');

  const maintBlock =
    card.maintenance && card.maintenance.length > 0
      ? `<div class="cg-card__maint"${st('margin-top:8px')}>${maint}</div>`
      : '';

  return `<div class="cg-card"${st(boxCss + ';' + accent)}>
  <div class="cg-card__head"${st('margin-bottom:4px')}>
    <div class="cg-card__title"${st('font-size:15px;font-weight:700')}>${esc(card.title)}</div>
    ${card.subtitle ? `<div class="cg-card__subtitle"${st('color:#64748b;font-size:12px')}>${esc(card.subtitle)}</div>` : ''}
  </div>
  ${status}
  ${rows ? `<div class="cg-card__rows">${rows}</div>` : ''}
  ${images ? `<div class="cg-card__images">${images}</div>` : ''}
  ${maintBlock}
</div>`;
}

/** HTML 转义（防内容注入） */
export function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
