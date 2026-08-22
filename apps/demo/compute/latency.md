---
title: C2 延迟热力图
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { LatencyMap, type LatencyAlert } from '@caoguo/maplibre-compute';
import { wuhanCompute } from '../data/wuhan-compute';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const latency = ref<LatencyMap | null>(null);

const userLng = ref<number>(114.30);
const userLat = ref<number>(30.55);
const recommendations = ref<Array<{ id: string; distance: number; latencyMs: number }>>([]);
const alerts = ref<LatencyAlert[]>([]);
const thresholdMs = ref<number>(50);
const showIsobands = ref<boolean>(true);

const isoLevels = [
  { level: 'excellent', label: '≤10ms 极佳', color: '#22d3ee' },
  { level: 'good', label: '≤30ms 良好', color: '#4ade80' },
  { level: 'fair', label: '≤60ms 一般', color: '#fbbf24' },
  { level: 'poor', label: '>60ms 较差', color: '#ef4444' },
] as const;

function analyze() {
  if (!latency.value) return;
  recommendations.value = latency.value.recommendBestNode(userLng.value, userLat.value);
  alerts.value = latency.value.checkAlerts();
  // LM-1 延迟等值线：以用户端为原点生成连续延迟等级面（实时拖拽即重算）
  if (showIsobands.value) {
    latency.value.renderLatencyIsobands(userLng.value, userLat.value);
  }
}

function toggleIsobands() {
  showIsobands.value = !showIsobands.value;
  if (!latency.value) return;
  if (showIsobands.value) {
    latency.value.renderLatencyIsobands(userLng.value, userLat.value);
  } else {
    latency.value.clearIsobands();
  }
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.0 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const l = new LatencyMap({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanCompute, thresholdMs: thresholdMs.value, layerPrefix: 'cg-latency' });
    latency.value = l;
    analyze();
  });
});

onUnmounted(() => {
  latency.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="C2 · 延迟热力图"
  subtitle="caoguo-compute：延迟分级 + 最优接入推荐（LM-2）+ 延迟告警（LM-4）。"
>
  <template #map>
    <div ref="mapEl" class="latency-map" ></div>
    <div class="tag">
      延迟告警：{{ alerts.length }} 条
    </div>
    <div v-if="showIsobands" class="iso-legend">
      <h4>LM-1 延迟等级区域</h4>
      <div v-for="lv in isoLevels" :key="lv.level" class="iso-item">
        <span class="iso-swatch" :style="{ background: lv.color }" ></span>
        <span>{{ lv.label }}</span>
      </div>
    </div>
  </template>
  <template #panel>
    <SimPanel title="最优接入推荐" hint="LM-2 按延迟排序">
      <label class="cg-label">用户位置（经度）</label>
      <input v-model.number="userLng" type="number" step="0.01" class="cg-input" @change="analyze" />
      <label class="cg-label">用户位置（纬度）</label>
      <input v-model.number="userLat" type="number" step="0.01" class="cg-input" @change="analyze" />
      <div v-if="recommendations.length" class="cg-result">
        <p>最优接入节点：<strong>{{ recommendations[0].id }}</strong></p>
        <p>预估延迟：<strong>{{ recommendations[0].latencyMs.toFixed(1) }} ms</strong></p>
      </div>
    </SimPanel>
    <SimPanel title="延迟等值线" hint="LM-1 以用户端为原点的延迟等级区域">
      <label class="cg-switch">
        <input type="checkbox" v-model="showIsobands" @change="toggleIsobands" />
        <span>显示连续延迟等值带</span>
      </label>
      <p class="cg-hint">基于各节点到用户端的估计延迟做 IDW 插值，实时拖拽用户位置即重算。</p>
    </SimPanel>
    <SimPanel title="延迟告警" hint="LM-4 超阈值">
      <label class="cg-label">告警阈值（ms）</label>
      <input v-model.number="thresholdMs" type="number" class="cg-input" @change="analyze" />
      <div v-if="alerts.length" class="cg-result">
        <div v-for="a in alerts" :key="a.linkId" class="cg-alert">
          <span class="cg-alert-dot" :style="{ background: a.level === 'critical' ? '#ef4444' : '#f59e0b' }" ></span>
          <span>{{ a.linkId }}：{{ a.latencyMs }}ms</span>
        </div>
      </div>
      <p v-else class="cg-empty">无超阈值告警</p>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.latency-map { position: absolute; inset: 0; }
.tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fef3c7;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.cg-label {
  font-size: 12px;
  color: #94a3b8;
  display: block;
  margin-bottom: 4px;
}
.cg-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
  margin-bottom: 12px;
}
.cg-result {
  padding: 12px;
  background: var(--cg-bg-card, #0f172a);
  border-radius: 10px;
  border: 1px solid var(--cg-border, #1e293b);
}
.cg-result p {
  margin: 4px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-result strong {
  color: #22d3ee;
}
.cg-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cg-empty {
  font-size: 13px;
  color: #94a3b8;
  margin: 4px 0;
}
.iso-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #e2e8f0;
  backdrop-filter: blur(8px);
  font-size: 12px;
}
.iso-legend h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.iso-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}
.iso-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
.cg-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e2e8f0;
  cursor: pointer;
}
.cg-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 8px 0 0;
}
</style>
