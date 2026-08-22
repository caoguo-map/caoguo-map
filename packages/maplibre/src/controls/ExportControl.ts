/**
 * 地图导出控件（通用）。
 *
 * 行业专题图渲染后，常需导出当前视图为成果图（PNG）。
 * 基于 maplibre-gl 画布 `toDataURL('image/png')` 生成截图并触发浏览器下载。
 *
 * 设计为「纯函数 triggerDownload + 薄 DOM 绑定」：triggerDownload 不依赖地图，可独立单测。
 */

export interface ExportOptions {
  /** 下载文件名（不含扩展名） */
  filename?: string;
  /** 挂载容器（可选；不传则自动创建） */
  container?: HTMLElement;
  /** 按钮文案 */
  buttonText?: string;
}

/** 纯函数：触发浏览器下载（data URL） */
export function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 导出控件 */
export class ExportControl {
  private el: HTMLElement;
  private map: {
    getCanvas: () => { toDataURL: (type?: string) => string };
  };
  private filename: string;
  private onClick = () => this.export();

  constructor(map: ExportControl['map'], options: ExportOptions = {}) {
    this.map = map;
    this.filename = options.filename ?? 'caoguo-map';
    this.el = options.container ?? document.createElement('button');
    this.el.className = 'caoguo-export-control';
    this.el.textContent = options.buttonText ?? '导出 PNG';
    this.el.style.cssText =
      'position:absolute;right:10px;top:10px;padding:5px 10px;background:rgba(10,15,30,.72);color:#cfe;border:1px solid #2a3550;border-radius:4px;font:12px system-ui,sans-serif;cursor:pointer;z-index:3;';
    this.el.addEventListener('click', this.onClick);
  }

  /** 导出当前地图视图为 PNG 并下载 */
  export(): void {
    const canvas = this.map.getCanvas();
    const url = canvas.toDataURL('image/png');
    triggerDownload(url, this.filename);
  }

  /** 挂载到容器 */
  addTo(container: HTMLElement): this {
    if (!this.el.parentElement) container.appendChild(this.el);
    return this;
  }

  remove(): void {
    this.el.removeEventListener('click', this.onClick);
    this.el.remove();
  }
}
