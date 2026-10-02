import { describe, it, expect, vi } from 'vitest';
import { TrafficFlow } from '../TrafficFlow';

/**
 * TF-4 OD 矩阵渲染（QA 审计 P1）：renderOdMatrix 此前零测试。
 * 重点固化：未知节点跳过、零流量线宽插值锚点从 0 起（无除零）、图层产物结构。
 */

function makeMap() {
  return {
    instance: {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
      setPaintProperty: vi.fn(),
      on: vi.fn(),
    },
    removeLayer: vi.fn(),
  };
}

const dataset = {
  nodes: [
    { id: 'a', lng: 114.3, lat: 30.5 },
    { id: 'b', lng: 114.31, lat: 30.51 },
  ],
  edges: [],
} as never;

describe('TF-4 renderOdMatrix', () => {
  it('合法 OD 对 → 1 个 source + 1 个 line 图层（青色）', () => {
    const map = makeMap();
    const tf = new TrafficFlow({ map: map as never, dataset });
    tf.renderOdMatrix([{ fromNode: 'a', toNode: 'b', flow: 300 }]);

    expect(map.instance.addSource).toHaveBeenCalledTimes(1);
    const layer = (map.instance.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      id: string;
      type: string;
      paint: Record<string, unknown>;
    };
    expect(layer.id).toBe('cg-flow-od-line'); // 默认前缀
    expect(layer.type).toBe('line');
    expect(layer.paint['line-color']).toBe('#22d3ee');
  });

  it('零流量对：线宽插值锚点从 0 起（0→1px，无除零风险）', () => {
    const map = makeMap();
    const tf = new TrafficFlow({ map: map as never, dataset });
    tf.renderOdMatrix([{ fromNode: 'a', toNode: 'b', flow: 0 }]);

    const layer = (map.instance.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      paint: Record<string, unknown>;
    };
    expect(layer.paint['line-width']).toEqual([
      'interpolate',
      ['linear'],
      ['get', 'flow'],
      0,
      1,
      500,
      6,
    ]);
  });

  it('未知节点（from 或 to 不存在）的 OD 对被跳过：不产出要素，但仍 upsert 空图层', () => {
    const map = makeMap();
    const tf = new TrafficFlow({ map: map as never, dataset });
    tf.renderOdMatrix([
      { fromNode: 'ghost', toNode: 'b', flow: 100 },
      { fromNode: 'a', toNode: 'ghost', flow: 100 },
    ]);
    // 契约与 water/pipeline 的「空输入早退」不同：本实现总是 upsert 一次，
    // 借空 source 清空上一帧 OD 渲染。此处锁定该行为。
    const [srcId, data] = (map.instance.addSource as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { features: unknown[] },
    ];
    expect(srcId).toBe('cg-flow-od-src');
    expect(data.features).toHaveLength(0);
    expect(map.instance.addLayer).toHaveBeenCalledTimes(1);
  });

  it('空 OD 列表：仍 upsert 空 source（等效清空上一帧），不加无效图层内容', () => {
    const map = makeMap();
    new TrafficFlow({ map: map as never, dataset }).renderOdMatrix([]);
    const [, data] = (map.instance.addSource as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { features: unknown[] },
    ];
    expect(data.features).toHaveLength(0);
    expect(map.instance.addLayer).toHaveBeenCalledTimes(1);
  });

  it('自定义 layerPrefix 生效', () => {
    const map = makeMap();
    const tf = new TrafficFlow({ map: map as never, dataset, layerPrefix: 'xx' });
    tf.renderOdMatrix([{ fromNode: 'a', toNode: 'b', flow: 10 }]);
    const layer = (map.instance.addLayer as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      id: string;
    };
    expect(layer.id).toBe('xx-od-line');
  });
});
