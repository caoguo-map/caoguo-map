/**
 * 比例尺 + 坐标显示控件（T8 / F-1.8）。
 *
 * - 比例尺：基于 Web Mercator 在给定纬度下的地面分辨率（m/像素），
 *   自动选择「米 / 公里」并吸附到 1/2/5 的整数档（标准地图比例尺行为）。
 * - 坐标：鼠标在图上移动时，实时显示当前光标处的经纬坐标（WGS84 渲染基准）。
 *
 * 设计为「纯函数 core + 薄 DOM 绑定」：比例计算 `computeScaleBar` 不依赖浏览器，
 * 可独立单测；`ScaleControl` 类负责把结果渲染进容器并监听地图事件。
 */

export type LengthUnit = 'metric';

export interface ScaleBar {
  /** 比例尺条代表的真实距离（米） */
  meters: number;
  /** 比例尺条在屏幕上的像素宽度 */
  pixels: number;
  /** 展示文案，如 "500 m" / "2 km" */
  label: string;
}

const EARTH_RADIUS = 6378137; // WGS84 赤道半径（米）

/**
 * 计算比例尺。
 * @param latitude 当前视图中心纬度（度）
 * @param zoom     MapLibre zoom（Web Mercator）
 * @param dpiScale 设备像素比（默认 1；Retina 设为 window.devicePixelRatio）
 * @param maxWidth 比例尺条最大像素宽度（默认 100）
 * @param tileSize 瓦片像素尺寸（默认 512，MapLibre v4 默认）
 */
export function computeScaleBar(
  latitude: number,
  zoom: number,
  opts: { dpiScale?: number; maxWidth?: number; tileSize?: number } = {}
): ScaleBar {
  const dpiScale = opts.dpiScale ?? 1;
  const maxWidth = opts.maxWidth ?? 100;
  const tileSize = opts.tileSize ?? 512;

  // 每像素的地面距离（米/像素），在给定纬度下
  const latRad = (latitude * Math.PI) / 180;
  const metersPerPixel =
    (Math.cos(latRad) * 2 * Math.PI * EARTH_RADIUS) /
    (tileSize * Math.pow(2, zoom) * dpiScale);

  // 最大像素宽度对应的真实距离
  let meters = metersPerPixel * maxWidth;

  // 吸附到 1/2/5 档
  const pow = Math.pow(10, Math.floor(Math.log10(meters)));
  const base = meters / pow; // 1..10
  const step = base >= 5 ? 5 : base >= 2 ? 2 : 1;
  meters = step * pow;

  const pixels = meters / metersPerPixel;
  const label = meters >= 1000 ? `${(meters / 1000).toLocaleString()} km` : `${Math.round(meters)} m`;

  return { meters, pixels, label };
}

export interface ScaleControlOptions {
  /** 挂载容器（可选；不传则在地图容器内自动创建） */
  container?: HTMLElement;
  /** 是否显示实时坐标（默认 true） */
  showCoordinate?: boolean;
  /** 最大比例尺像素宽度 */
  maxWidth?: number;
}

/**
 * 比例尺控件。需传入 maplibre Map 实例（直接用 maplibre-gl 的 Map）。
 */
export class ScaleControl {
  private el: HTMLElement;
  private barEl: HTMLElement;
  private labelEl: HTMLElement;
  private coordEl?: HTMLElement;
  private map: { getZoom: () => number; getCenter: () => { lat: number }; on: (e: string, h: (ev: unknown) => void) => void; off: (e: string, h: (ev: unknown) => void) => void; getCanvas?: () => { addEventListener: (t: string, h: (ev: unknown) => void) => void; removeEventListener: (t: string, h: (ev: unknown) => void) => void } };
  private opts: Required<Omit<ScaleControlOptions, 'container'>>;
  private onMove = (ev: unknown) => this.handleMove(ev);
  private onZoom = () => this.update();

  constructor(
    map: ScaleControl['map'],
    options: ScaleControlOptions = {}
  ) {
    this.map = map;
    this.opts = {
      showCoordinate: options.showCoordinate ?? true,
      maxWidth: options.maxWidth ?? 100,
    };
    this.el = options.container ?? document.createElement('div');
    this.el.className = 'caoguo-scale-control';
    this.el.style.cssText =
      'position:absolute;left:10px;bottom:24px;padding:4px 8px;background:rgba(10,15,30,.7);color:#cfe;border-radius:4px;font:12px/1.4 system-ui,sans-serif;pointer-events:none;z-index:2;';

    this.barEl = document.createElement('div');
    this.barEl.style.cssText =
      'height:6px;border:1px solid #cfe;border-top:none;margin-bottom:2px;';
    this.labelEl = document.createElement('div');
    if (this.opts.showCoordinate) {
      this.coordEl = document.createElement('div');
      this.coordEl.style.cssText = 'opacity:.85;margin-top:2px;';
      this.el.append(this.barEl, this.labelEl, this.coordEl);
    } else {
      this.el.append(this.barEl, this.labelEl);
    }

    map.on('zoom', this.onZoom);
    map.on('move', this.onZoom);
    const canvas = (map as any).getCanvas?.();
    canvas?.addEventListener('mousemove', this.onMove as never);
  }

  /** 把控件挂到地图容器（无预设容器时调用） */
  addTo(container: HTMLElement): this {
    if (!this.el.parentElement) container.appendChild(this.el);
    this.update();
    return this;
  }

  /** 计算并刷新显示 */
  update(): void {
    const center = this.map.getCenter();
    const bar = computeScaleBar(center.lat, this.map.getZoom(), { maxWidth: this.opts.maxWidth });
    this.barEl.style.width = `${Math.round(bar.pixels)}px`;
    this.labelEl.textContent = bar.label;
  }

  private handleMove(ev: unknown): void {
    if (!this.coordEl) return;
    const e = ev as { lngLat?: { lng: number; lat: number } };
    const ll = e.lngLat;
    if (!ll) return;
    this.coordEl.textContent = `${ll.lng.toFixed(5)}, ${ll.lat.toFixed(5)}`;
  }

  /** 移除控件与事件监听 */
  remove(): void {
    this.map.off('zoom', this.onZoom);
    this.map.off('move', this.onZoom);
    const canvas = (this.map as any).getCanvas?.();
    canvas?.removeEventListener('mousemove', this.onMove as never);
    this.el.remove();
  }
}
