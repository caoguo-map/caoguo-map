/**
 * LOD 控制器（T7 / F-1.7，纯逻辑）。
 *
 * 按地图 zoom 自动切换数据密度（Level of Detail）：
 * - 低 zoom（全国/省）显示聚合/简化数据，避免要素过密；
 * - 高 zoom（市/区）显示全量/精细数据。
 *
 * 设计：本模块**不依赖 maplibre / WebGL / DOM**，纯函数可在 Node 单测。
 * 控制器 `LodController` 监听 zoom 变化并回调当前应激活的 LOD 等级，
 * 调用方据此 `setData` / 切换 source（具体渲染动作由调用方决定）。
 */

export interface LodLevel<T = unknown> {
  /** 该等级名称（如 'country' | 'province' | 'city' | 'detail'） */
  id: string;
  /** 进入该等级的最小 zoom（含） */
  minZoom: number;
  /** 进入该等级的最大 zoom（含）；省略表示 +∞ */
  maxZoom?: number;
  /** 该等级承载的数据/配置（任意类型，调用方解释） */
  payload?: T;
}

export interface LodChangeEvent<T> {
  /** 当前激活等级 */
  level: LodLevel<T>;
  /** 是否相较上一次发生了等级切换 */
  changed: boolean;
  /** 当前 zoom */
  zoom: number;
}

/**
 * 根据 zoom 解析应激活的 LOD 等级。
 * 规则：取满足 minZoom<=zoom<=(maxZoom??∞) 的等级；
 * 若存在多个命中（区间重叠），取 minZoom 最大者（更精细优先）。
 * 无命中返回 null（调用方可保留上一等级）。
 */
export function resolveLod<T>(zoom: number, levels: LodLevel<T>[]): LodLevel<T> | null {
  let best: LodLevel<T> | null = null;
  for (const lv of levels) {
    const max = lv.maxZoom ?? Infinity;
    if (zoom >= lv.minZoom && zoom <= max) {
      if (!best || lv.minZoom > best.minZoom) best = lv;
    }
  }
  return best;
}

/**
 * 给定可视范围的"要素密度"建议（用于调试/UI 提示）。
 * 返回每屏建议最大要素数（随 zoom 平方增长，模拟瓦片面积）。
 */
export function suggestDensity(zoom: number, basePerTile = 200, tileCountFactor = 1): number {
  const z = Math.max(0, zoom);
  return Math.round(basePerTile * Math.pow(2, Math.max(0, z - 8)) * tileCountFactor);
}

/**
 * LOD 控制器（薄状态机）。监听 zoom，触发 onLod 回调。
 */
export class LodController<T = unknown> {
  private levels: LodLevel<T>[];
  private current: LodLevel<T> | null = null;
  private onChange: (e: LodChangeEvent<T>) => void;
  private map: { getZoom: () => number; on: (e: string, h: (ev: unknown) => void) => void; off: (e: string, h: (ev: unknown) => void) => void };

  constructor(
    map: LodController['map'],
    levels: LodLevel<T>[],
    onChange: (e: LodChangeEvent<T>) => void
  ) {
    this.map = map;
    this.levels = levels;
    this.onChange = onChange;
    this.handler = () => this.evaluate(false);
    map.on('zoom', this.handler);
    map.on('move', this.handler);
  }

  private handler: (ev: unknown) => void;

  /** 立即评估当前 zoom 并（按需）触发回调 */
  evaluate(force = false): LodLevel<T> | null {
    const zoom = this.map.getZoom();
    const next = resolveLod(zoom, this.levels);
    if (!next) return this.current;
    const changed = force || next.id !== this.current?.id;
    if (changed || force) {
      this.current = next;
      this.onChange({ level: next, changed, zoom });
    }
    return next;
  }

  /** 当前等级 */
  getLevel(): LodLevel<T> | null {
    return this.current;
  }

  /** 更新分级配置（如权限/数据就绪后） */
  setLevels(levels: LodLevel<T>[]): void {
    this.levels = levels;
    this.evaluate(false);
  }

  /** 卸载监听 */
  remove(): void {
    this.map.off('zoom', this.handler);
    this.map.off('move', this.handler);
  }
}
