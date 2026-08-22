/**
 * 实时数据传输层（PRD LH-3）
 *
 * 传输无关抽象：业务层只需实现 {@link RealtimeTransport} 即可接入任意实时源
 * （WebSocket / MQTT / SSE / 自定义）。内置 {@link WsTransport} 基于浏览器原生
 * WebSocket，零额外依赖。MQTT 等可用 mqtt.js 包一层适配注入。
 */

/** 实时传输抽象 */
export interface RealtimeTransport {
  /** 建立连接 */
  connect(): Promise<void> | void;
  /** 订阅主题（topic 由服务端约定，如 `grid/+/metrics`） */
  subscribe(topic: string | string[]): void;
  /** 注册原始消息回调（拿到字符串后由上层解析） */
  onMessage(cb: (raw: string) => void): void;
  /** 断开连接并清理 */
  disconnect(): void;
}

/** WebSocket 传输（内置，零依赖） */
export class WsTransport implements RealtimeTransport {
  private ws: WebSocket | null = null;
  private msgCb: ((raw: string) => void) | null = null;
  private topics: string[] = [];
  private closedByUser = false;

  constructor(private url: string) {}

  connect(): Promise<void> {
    this.closedByUser = false;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        if (this.topics.length) {
          try {
            this.ws?.send(JSON.stringify({ type: 'subscribe', topics: this.topics }));
          } catch {
            // 服务器不支持显式订阅协议则忽略，依赖服务端全量推送
          }
        }
        resolve();
      };
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (ev: MessageEvent) => {
        if (typeof ev.data === 'string') this.msgCb?.(ev.data);
      };
      this.ws.onclose = () => {
        if (!this.closedByUser && this.autoReconnect) this.scheduleReconnect();
      };
    });
  }

  /** 是否断线自动重连（默认 true） */
  autoReconnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, 3000);
  }

  subscribe(topic: string | string[]): void {
    const list = Array.isArray(topic) ? topic : [topic];
    this.topics.push(...list);
    // WebSocket 无原生 subscribe；若已连接，尝试向服务端发送订阅指令（协议可选）
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'subscribe', topics: list }));
      } catch {
        // 忽略
      }
    }
  }

  onMessage(cb: (raw: string) => void): void {
    this.msgCb = cb;
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
