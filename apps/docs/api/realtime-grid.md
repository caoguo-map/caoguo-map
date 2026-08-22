# Grid 实时流（LH-3）

> 隶属 `@caoguo/maplibre-grid` 包。来源：`packages/grid/src/realtime/`

为电网拓扑/负荷/设备状态提供**实时数据接入**能力。无需业务方引入 MQTT 客户端——内置浏览器原生 `WebSocket`，MQTT 可通过自定义 `RealtimeTransport` 注入。

---

## 核心类型

```ts
import type { RealtimeMessage, RealtimeMetricPatch, RealtimeTransport } from '@caoguo/maplibre-grid';

// 实时数据补丁
interface RealtimeMetricPatch {
  loadRate?: number;
  status?: GridDeviceStatus;
  [k: string]: unknown;
}

// 单条消息
interface RealtimeMessage {
  deviceId: string;
  patch: RealtimeMetricPatch;
  ts?: number;
}
```

## `RealtimeTransport`（传输抽象）

```ts
interface RealtimeTransport {
  connect(): Promise<void> | void;
  subscribe(topic: string | string[]): void;
  onMessage(cb: (raw: string) => void): void;
  disconnect(): void;
}
```

实现自定义 transport（如 MQTT）时按此接口实现即可。

## `WsTransport`（内置 WebSocket）

```ts
import { WsTransport } from '@caoguo/maplibre-grid';

const ws = new WsTransport({ url: 'wss://example.com/grid' });
ws.subscribe('stations/s1');
ws.onMessage((raw) => console.log('raw:', raw));
ws.connect();
```

## `GridRealtime`（控制器）

聚合 transport + 解析 + 应用 + 回调。推荐使用。

```ts
import { GridRealtime } from '@caoguo/maplibre-grid';

const realtime = new GridRealtime({
  transport: ws,
  onMetric: (deviceId, patch) => {
    // 触发 UI 更新
    store.updateDevice(deviceId, patch);
  },
});

realtime.start();

// 卸载时
realtime.stop();
```

---

## 自定义 MQTT Transport 示例

```ts
import mqtt from 'mqtt';
import type { RealtimeTransport } from '@caoguo/maplibre-grid';

class MqttTransport implements RealtimeTransport {
  private client = mqtt.connect('mqtt://broker.example.com');
  private cb?: (raw: string) => void;
  connect() { return new Promise(r => this.client.on('connect', r)); }
  subscribe(topic) { this.client.subscribe(topic); }
  onMessage(cb) {
    this.cb = cb;
    this.client.on('message', (_, payload) => cb(payload.toString()));
  }
  disconnect() { this.client.end(); }
}
```