// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { ExportControl, triggerDownload } from '../controls/ExportControl';

describe('ExportControl (通用地图导出控件)', () => {
  it('triggerDownload 创建带 download 属性的 a 标签并触发点击', () => {
    let captured: HTMLAnchorElement | null = null;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        captured = this;
      });
    triggerDownload('data:image/png;base64,xxx', 'map-shot');
    expect(captured).not.toBeNull();
    expect(captured!.download).toBe('map-shot.png');
    expect(captured!.href).toContain('data:image/png');
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('export 通过 map.getCanvas().toDataURL 生成截图并下载', () => {
    const toDataURL = vi.fn(() => 'data:image/png;base64,TEST');
    const map = { getCanvas: () => ({ toDataURL }) } as never;
    let captured: HTMLAnchorElement | null = null;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        captured = this;
      });
    const ctrl = new ExportControl(map, { filename: 'shot' });
    ctrl.export();
    expect(toDataURL).toHaveBeenCalledWith('image/png');
    expect(captured!.download).toBe('shot.png');
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    ctrl.remove();
  });
});
