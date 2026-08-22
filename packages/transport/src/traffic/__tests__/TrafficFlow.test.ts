import { describe, it, expect, vi } from 'vitest';
import { TrafficFlow } from '../TrafficFlow';
import type { RoadNetworkDataset } from '../../types';

const dataset: RoadNetworkDataset = {
  nodes: [
    { id: 'a', lng: 116, lat: 39 },
    { id: 'b', lng: 117, lat: 40 },
    { id: 'c', lng: 118, lat: 41 },
  ],
  edges: [
    { id: 'e1', fromNode: 'a', toNode: 'b', roadClass: 'highway' },
    { id: 'e2', fromNode: 'b', toNode: 'c', roadClass: 'highway' },
  ],
  speeds: [
    { edgeId: 'e1', speed: 30 },
    { edgeId: 'e2', speed: 30 },
  ],
};

describe('TrafficFlow.renderCongestionSpread (TF-2 拥堵传播动画)', () => {
  it('从种子路段沿拓扑扩散并返回受影响路段，渲染高亮层', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
      on: vi.fn(),
    };
    const map = { instance: mlMap } as never;
    const tf = new TrafficFlow({ map, dataset });

    const affected = tf.renderCongestionSpread('e1', 3);

    // e1 自身 + 相邻且相对拥堵的 e2 都应被标记
    expect(affected).toContain('e1');
    expect(affected).toContain('e2');
    // 渲染层被创建（source 通过 upsertSource 写入）
    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();
  });

  it('未知种子返回空', () => {
    const tf = new TrafficFlow({ map: { instance: {} } as never, dataset });
    expect(tf.renderCongestionSpread('x')).toEqual([]);
  });

  it('playCongestionSpread 启动 rAF 动画并通过 setFilter 推进波前', () => {
    const setFilter = vi.fn();
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
      on: vi.fn(),
      setFilter,
    };
    const rafCalls: Array<(t: number) => void> = [];
    const raf = vi.fn((cb: (t: number) => void) => {
      rafCalls.push(cb);
      return rafCalls.length;
    });
    const map = { instance: mlMap } as never;
    const tf = new TrafficFlow({ map, dataset });

    const affected = tf.playCongestionSpread('e1', 3, { durationMs: 1000, raf });
    expect(affected).toContain('e1');
    // 动画启动：至少调度一帧
    expect(raf).toHaveBeenCalled();
    // 手动推进两帧，验证波前（setFilter 的 hop 上限）随进度增长
    rafCalls[0](0); // phase 0 → 波前 ~0
    rafCalls[1](500); // phase 0.5 → 波前 ~1.5
    // filter 结构: ['<=', ['get','hop'], wave]，wave 为第 3 个元素（index 2）
    const firstWave = (setFilter.mock.calls[0]?.[1] as unknown[])[2] as number;
    const secondWave = (setFilter.mock.calls[1]?.[1] as unknown[])[2] as number;
    expect(secondWave).toBeGreaterThan(firstWave);
  });

  it('playCongestionSpread 无 rAF/无 setFilter 时降级为静态快照', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
      on: vi.fn(),
      // 无 setFilter
    };
    const tf = new TrafficFlow({ map: { instance: mlMap } as never, dataset });
    const affected = tf.playCongestionSpread('e1', 3, {});
    expect(affected).toContain('e1');
  });
});

describe('TrafficFlow.renderRoadSpeed (TF-1 实时速度着色)', () => {
  it('按速度生成线图层并支持点击选中', () => {
    const onClick = vi.fn();
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
      on: vi.fn(),
    };
    const tf = new TrafficFlow({
      map: { instance: mlMap, removeLayer: vi.fn() } as never,
      dataset,
      onEdgeSelect: onClick,
    });

    tf.renderRoadSpeed();
    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();
    // 点击回调被注册
    expect(mlMap.on).toHaveBeenCalledWith('click', 'cg-flow-speed-line', expect.any(Function));

    // 再次调用应先清理旧层（clear 走顶层 removeLayer）
    mlMap.addLayer.mockClear();
    tf.renderRoadSpeed();
    expect((tf as unknown as { map: { removeLayer: ReturnType<typeof vi.fn> } }).map.removeLayer).toHaveBeenCalledWith('cg-flow-speed-line');
  });
});

describe('TrafficFlow.getEdgeTrend (TF-3 流量趋势图数据)', () => {
  const series = {
    timestamps: [0, 1, 2],
    series: {
      e1: [
        { t: 0, speed: 80, flow: 100 },
        { t: 1, speed: 40, flow: 200 },
        { t: 2, speed: 20, flow: 300 },
      ],
    },
  };

  it('聚合选中路段的趋势统计与拥堵序列', () => {
    const tf = new TrafficFlow({ map: { instance: {} } as never, dataset });
    const trend = tf.getEdgeTrend('e1', series);
    expect(trend).not.toBeNull();
    expect(trend!.avg).toBeCloseTo((80 + 40 + 20) / 3);
    expect(trend!.min).toBe(20);
    expect(trend!.max).toBe(80);
    expect(trend!.speeds).toEqual([80, 40, 20]);
    expect(trend!.congestionTrend).toEqual(['free', 'slow', 'congested']);
  });

  it('未知路段返回 null', () => {
    const tf = new TrafficFlow({ map: { instance: {} } as never, dataset });
    expect(tf.getEdgeTrend('nope', series)).toBeNull();
  });
});

describe('TrafficFlow.renderSpeedTimeline (T-4 路况时间轴回放)', () => {
  const series = {
    timestamps: [0, 1, 2],
    series: {
      e1: [
        { t: 0, speed: 80 },
        { t: 1, speed: 40 },
        { t: 2, speed: 20 },
      ],
      e2: [
        { t: 0, speed: 60 },
        { t: 1, speed: 50 },
        { t: 2, speed: 10 },
      ],
    },
  };

  it('在时间轴索引处切片全路网速度并渲染', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
    };
    const tf = new TrafficFlow({ map: { instance: mlMap, removeLayer: vi.fn() } as never, dataset });

    const snap = tf.renderSpeedTimeline(series, 2);
    // 第三时刻：e1=20, e2=10
    expect(snap.e1).toBe(20);
    expect(snap.e2).toBe(10);
    expect(mlMap.addSource).toHaveBeenCalled();
    expect(mlMap.addLayer).toHaveBeenCalled();
  });

  it('越界索引返回空快照', () => {
    const mlMap = {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      addLayer: vi.fn(),
    };
    const tf = new TrafficFlow({ map: { instance: mlMap, removeLayer: vi.fn() } as never, dataset });
    expect(tf.renderSpeedTimeline(series, 99)).toEqual({});
  });
});
