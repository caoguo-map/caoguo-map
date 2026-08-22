import { describe, it, expect, vi } from 'vitest';
import {
  applyMetricToDataset,
  parseRealtimeMessage,
  GridRealtime,
  WsTransport,
} from '../index';
import type { GridTopologyDataset } from '../../types';
import type { RealtimeTransport } from '../index';

const dataset: GridTopologyDataset = {
  devices: [
    { id: 'd1', kind: 'substation', lng: 114.31, lat: 30.51, properties: { loadRate: 0.3, status: 'running' } },
    { id: 'd2', kind: 'transformer', lng: 114.32, lat: 30.52, properties: { loadRate: 0.5 } },
  ],
  lines: [],
};

/** 可注入的假传输，模拟服务端推消息 */
class FakeTransport implements RealtimeTransport {
  private cb: ((raw: string) => void) | null = null;
  connected = false;
  subscribed: string[] = [];
  push(raw: string) {
    this.cb?.(raw);
  }
  connect() {
    this.connected = true;
  }
  subscribe(t: string | string[]) {
    this.subscribed.push(...(Array.isArray(t) ? t : [t]));
  }
  onMessage(cb: (raw: string) => void) {
    this.cb = cb;
  }
  disconnect() {
    this.connected = false;
  }
}

describe('LH-3 realtimeCore 纯函数', () => {
  it('applyMetricToDataset 原地更新设备 properties', () => {
    const ok = applyMetricToDataset(dataset, 'd1', { loadRate: 0.92, status: 'fault' });
    expect(ok).toBe(true);
    const d1 = dataset.devices.find((d) => d.id === 'd1')!;
    expect(d1.properties?.loadRate).toBe(0.92);
    expect(d1.properties?.status).toBe('fault');
  });

  it('applyMetricToDataset 设备不存在返回 false', () => {
    expect(applyMetricToDataset(dataset, 'nope', { loadRate: 1 })).toBe(false);
  });

  it('parseRealtimeMessage 支持单条/批量/精简格式', () => {
    const single = parseRealtimeMessage('{"deviceId":"d1","loadRate":0.7,"status":"running"}');
    expect(single).toHaveLength(1);
    expect(single[0].patch.loadRate).toBe(0.7);

    const batch = parseRealtimeMessage('[{"deviceId":"d1","lr":0.6},{"deviceId":"d2","s":"fault"}]');
    expect(batch).toHaveLength(2);
    expect(batch[0].patch.loadRate).toBe(0.6);
    expect(batch[1].patch.status).toBe('fault');

    expect(parseRealtimeMessage('not json')).toEqual([]);
    expect(parseRealtimeMessage('{"foo":1}')).toEqual([]);
  });
});

describe('LH-3 GridRealtime 控制器', () => {
  it('连接后订阅主题，收到消息更新 dataset 并触发 onUpdate', async () => {
    const transport = new FakeTransport();
    const onUpdate = vi.fn();
    const rt = new GridRealtime({ transport, dataset, topic: 'grid/+', onUpdate });
    await rt.connect();
    expect(transport.connected).toBe(true);
    expect(transport.subscribed).toContain('grid/+');

    transport.push('{"deviceId":"d1","loadRate":0.85}');
    expect(rt.received).toBe(1);
    expect(rt.dirtyDevices).toContain('d1');
    expect(onUpdate).toHaveBeenCalledWith('d1', { loadRate: 0.85 }, expect.objectContaining({ deviceId: 'd1' }));
    expect(dataset.devices.find((d) => d.id === 'd1')!.properties?.loadRate).toBe(0.85);

    rt.disconnect();
    expect(transport.connected).toBe(false);
    expect(rt.dirtyDevices).toHaveLength(0);
  });

  it('批量消息一次更新多设备', async () => {
    const transport = new FakeTransport();
    const rt = new GridRealtime({ transport, dataset });
    await rt.connect();
    transport.push('[{"deviceId":"d1","lr":0.4},{"deviceId":"d2","lr":0.9}]');
    expect(rt.received).toBe(2);
    expect(rt.dirtyDevices.sort()).toEqual(['d1', 'd2']);
  });
});

describe('LH-3 WsTransport 接口契约', () => {
  it('实现 RealtimeTransport 接口形状', () => {
    const t = new WsTransport('ws://localhost:8080');
    expect(typeof t.connect).toBe('function');
    expect(typeof t.subscribe).toBe('function');
    expect(typeof t.onMessage).toBe('function');
    expect(typeof t.disconnect).toBe('function');
  });
});
