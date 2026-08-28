---
title: G5 实时数据接入
---

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { GridRealtime, LoadHeatmap, overloadedDevices } from '@caoguo/maplibre-grid';
import type { GridTopologyDataset, RealtimeTransport } from '@caoguo/maplibre-grid';
import { wuhanGrid } from '../data/wuhan-grid';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

type MapInstance = InstanceType<typeof CaoguoMap>;

/**
 * 模拟传输层：实现 RealtimeTransport 接口即可接入任意实时源。
 * 生产环境替换为 WsTransport(url) 或 MQTT 适配即可，业务层无需改动。
 */
class MockTransport implements RealtimeTransport {
  private timer: number | null = null;
  private cb: ((raw: string) => void) | null = null;

  constructor(
    private intervalMs: number,
    private devices: string[]
  ) {}

  connect(): Promise<void> {
    this.start();
    return Promise.resolve();
  }
  subscribe(): void {
    // 模拟源无需服务端订阅协议
  }
  onMessage(cb: (raw: string) => void): void {
    this.cb = cb;
  }
  disconnect(): void {
    this.stop();
  }
  setInterval(ms: number): void {
    this.intervalMs = ms;
    if (this.timer) this.start();
  }
  private start(): void {
    this.stop();
    this.timer = window.setInterval(() => this.tick(), this.intervalMs);
  }
  private stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
  private tick(): void {
    const id = this.devices[Math.floor(Math.random() * this.devices.length)];
    const loadRate = Math.round(Math.random() * 100) / 100;
    // 精简键：d=设备 id / lr=负荷率 / s=状态
    this.cb?.(JSON.stringify({ d: id, lr: loadRate, s: loadRate > 0.8 ? 'overload' : 'running', ts: Date.now() }));
  }
}

// 使用数据副本，避免实时写入污染其它 demo 页面
const dataset: GridTopologyDataset = JSON.parse(JSON.stringify(wuhanGrid));

const mapEl = ref<HTMLElement | null>(null);
const map = ref<MapInstance | null>(null);
const heatmap = ref<LoadHeatmap | null>(null);
const rt = ref<GridRealtime | null>(null);
const transport = new MockTransport(1000, dataset.devices.map((d) => d.id));

const connected = ref(false);
const intervalMs = ref(1000);
const received = ref(0);
const lastUpdates = ref<Array<{ id: string; loadRate: number; at: string }>>([]);

const overloaded = computed(() => overloadedDevices(dataset));

function refreshMap() {
  heatmap.value?.render();
  heatmap.value?.highlightOverload();
}

async function toggle() {
  if (connected.value) {
    rt.value?.disconnect();
    connected.value = false;
    return;
  }
  if (!rt.value) {
    rt.value = new GridRealtime({
      transport,
      dataset,
      topic: 'grid/+/metrics',
      onUpdate: (deviceId, patch) => {
        received.value = rt.value?.received ?? received.value + 1;
        const rate = typeof patch.loadRate === 'number' ? patch.loadRate : 0;
        lastUpdates.value = [
          { id: deviceId, loadRate: rate, at: new Date().toLocaleTimeString('zh-CN', { hour12: false }) },
          ...lastUpdates.value,
        ].slice(0, 8);
        refreshMap();
      },
      onError: (err) => console.warn('[realtime]', err),
    });
  }
  await rt.value.connect();
  connected.value = true;
}

function changeInterval(ms: number) {
  intervalMs.value = ms;
  transport.setInterval(ms);
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.2 });
  m.on('load', () => {
    map.value = m;
    heatmap.value = new LoadHeatmap({ map: m, dataset, layerPrefix: 'cg-rt-load' });
    refreshMap();
  });
});

onUnmounted(() => {
  rt.value?.disconnect();
  heatmap.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="G5 · 实时数据接入"
  subtitle="传输层与业务解耦：实现 RealtimeTransport 即可接入 WebSocket / MQTT / SSE。本页用模拟源推送指标，实时驱动负荷热力图（PRD LH-3）。"
>
  <template #map>
    <div ref="mapEl" class="rt-map"></div>
    <div class="rt-status" :class="{ on: connected }">
      <span class="dot"></span>
      {{ connected ? '已连接 · 模拟源' : '未连接' }}
    </div>
  </template>
  <template #panel>
    <SimPanel title="连接控制" hint="GridRealtime + MockTransport">
      <button class="cg-btn" :class="{ danger: connected }" @click="toggle">
        {{ connected ? '断开连接' : '连接数据源' }}
      </button>
      <div class="field">
        <label>推送间隔：{{ intervalMs }} ms</label>
        <div class="interval-row">
          <button
            v-for="ms in [500, 1000, 3000]"
            :key="ms"
            class="chip"
            :class="{ active: intervalMs === ms }"
            @click="changeInterval(ms)"
          >{{ ms }}</button>
        </div>
      </div>
    </SimPanel>
    <SimPanel title="接收统计" hint="realtime.received / dirtyDevices">
      <div class="kv">
        <span>累计消息</span><b>{{ received }}</b>
      </div>
      <div class="kv">
        <span>已更新设备</span><b>{{ rt?.dirtyDevices?.length ?? 0 }}</b>
      </div>
      <div class="kv">
        <span>当前过载设备</span><b class="warn">{{ overloaded.length }}</b>
      </div>
    </SimPanel>
    <SimPanel title="最近更新" hint="最新 8 条（负荷率 patch）">
      <div v-if="lastUpdates.length" class="update-list">
        <div v-for="(u, i) in lastUpdates" :key="i" class="update-item">
          <span class="update-id">{{ u.id }}</span>
          <span class="update-bar">
            <span class="update-fill" :style="{ width: `${u.loadRate * 100}%` }"></span>
          </span>
          <span class="update-val">{{ (u.loadRate * 100).toFixed(0) }}%</span>
          <span class="update-at">{{ u.at }}</span>
        </div>
      </div>
      <p v-else class="cg-hint">点击「连接数据源」开始接收</p>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.rt-map { position: absolute; inset: 0; }
.rt-status {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #94a3b8;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.rt-status .dot { width: 8px; height: 8px; border-radius: 50%; background: #64748b; }
.rt-status.on { color: #4ade80; }
.rt-status.on .dot { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
.cg-btn {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  color: #e0f2fe;
  font-size: 13px;
  cursor: pointer;
}
.cg-btn.danger { border-color: #f87171; background: rgba(248, 113, 113, 0.15); color: #fecaca; }
.field { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.field label { font-size: 12px; color: #94a3b8; }
.interval-row { display: flex; gap: 6px; }
.chip {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}
.chip.active { border-color: #38bdf8; color: #e0f2fe; }
.kv { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #94a3b8; }
.kv b { color: #e2e8f0; }
.kv b.warn { color: #fbbf24; }
.update-list { display: flex; flex-direction: column; gap: 6px; }
.update-item { display: grid; grid-template-columns: 90px 1fr 40px 60px; align-items: center; gap: 6px; font-size: 12px; color: #cbd5e1; }
.update-id { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.update-bar { height: 6px; border-radius: 3px; background: rgba(148, 163, 184, 0.2); overflow: hidden; }
.update-fill { display: block; height: 100%; background: linear-gradient(90deg, #4ade80, #fbbf24, #ef4444); }
.update-val { text-align: right; font-weight: 700; }
.update-at { color: #64748b; text-align: right; }
.cg-hint { margin: 6px 0; font-size: 12px; color: #94a3b8; }
</style>
