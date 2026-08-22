/**
 * GridRealtime 控制器（PRD LH-3）
 *
 * 连接实时源 → 解析消息 → 应用到拓扑数据集 → 触发回调（业务层据此刷新负荷热力/拓扑）。
 * 与具体传输解耦：传入任意 {@link RealtimeTransport}（内置 WsTransport 或外部 MQTT 适配）。
 *
 * 用法：
 *   const rt = new GridRealtime({ transport: new WsTransport(url), dataset, topic: 'grid/+' });
 *   rt.onUpdate = (id) => loadHeatmap.render(); // 重新着色
 *   await rt.connect();
 */

import type { GridTopologyDataset } from '../types';
import { applyMetricToDataset, parseRealtimeMessage } from './realtimeCore';
import type { RealtimeMessage, RealtimeMetricPatch } from './realtimeCore';
import type { RealtimeTransport } from './transport';

export interface GridRealtimeOptions {
  /** 传输实现（内置 WsTransport 或外部适配） */
  transport: RealtimeTransport;
  /** 拓扑数据集（将被原地更新） */
  dataset: GridTopologyDataset;
  /** 订阅主题（可选，交给 transport） */
  topic?: string | string[];
  /** 单条指标更新回调（deviceId, patch, msg） */
  onUpdate?: (deviceId: string, patch: RealtimeMetricPatch, msg: RealtimeMessage) => void;
  /** 连接/解析错误回调 */
  onError?: (err: unknown) => void;
}

export class GridRealtime {
  private transport: RealtimeTransport;
  private dataset: GridTopologyDataset;
  private topic?: string | string[];
  /** 已更新的设备 id 集合（用于增量刷新判断） */
  private dirty = new Set<string>();
  /** 累计接收消息数 */
  received = 0;

  /** 单条更新回调（公开可赋值） */
  onUpdate?: (deviceId: string, patch: RealtimeMetricPatch, msg: RealtimeMessage) => void;
  /** 错误回调 */
  onError?: (err: unknown) => void;

  constructor(options: GridRealtimeOptions) {
    this.transport = options.transport;
    this.dataset = options.dataset;
    this.topic = options.topic;
    this.onUpdate = options.onUpdate;
    this.onError = options.onError;
  }

  /** 建立连接并订阅 */
  async connect(): Promise<void> {
    if (this.topic) this.transport.subscribe(this.topic);
    this.transport.onMessage((raw) => this.handleRaw(raw));
    await this.transport.connect();
  }

  /** 断开连接 */
  disconnect(): void {
    this.transport.disconnect();
    this.dirty.clear();
  }

  /** 本次连接以来被更新的设备集合 */
  get dirtyDevices(): string[] {
    return [...this.dirty];
  }

  /** 处理一条原始消息：解析 → 应用 → 回调 */
  private handleRaw(raw: string): void {
    let messages: RealtimeMessage[];
    try {
      messages = parseRealtimeMessage(raw);
    } catch (err) {
      this.onError?.(err);
      return;
    }
    this.received += messages.length;
    for (const msg of messages) {
      const ok = applyMetricToDataset(this.dataset, msg.deviceId, msg.patch);
      if (ok) {
        this.dirty.add(msg.deviceId);
        this.onUpdate?.(msg.deviceId, msg.patch, msg);
      }
    }
  }
}
