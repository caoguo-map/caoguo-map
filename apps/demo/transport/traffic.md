---
title: T2 交通流量可视化
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { TrafficFlow, type CongestionPrediction } from '@caoguo/maplibre-transport';
import { wuhanTransport, transportEdgeIds } from '../data/wuhan-transport';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const flow = ref<TrafficFlow | null>(null);

const selectedEdge = ref<string>('r02');
const minutesAhead = ref<number>(30);
const prediction = ref<CongestionPrediction | null>(null);
const spreadEdges = ref<string[]>([]);

function runPredict() {
  if (!flow.value) return;
  prediction.value = flow.value.predict(selectedEdge.value, minutesAhead.value);
  spreadEdges.value = flow.value.congestSpread(selectedEdge.value, 3);
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const f = new TrafficFlow({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanTransport, layerPrefix: 'cg-flow' });
    flow.value = f;
    runPredict();
  });
});

onUnmounted(() => {
  flow.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="T2 · 交通流量可视化"
  subtitle="caoguo-transport：拥堵预测（历史同时段 + 实时趋势）+ 拥堵传播分析。"
>
  <template #map>
    <div ref="mapEl" class="flow-map" ></div>
    <div v-if="prediction" class="pred-tag">
      预测 {{ minutesAhead }}min 后：{{ prediction.speed.toFixed(0) }} km/h · {{ prediction.congestionLevel }}
    </div>
  </template>
  <template #panel>
    <SimPanel title="拥堵预测" hint="PRD §3.2.2">
      <label class="cg-label">选择路段</label>
      <select v-model="selectedEdge" class="cg-select" @change="runPredict">
        <option v-for="id in transportEdgeIds" :key="id" :value="id">{{ id }}</option>
      </select>
      <label class="cg-label">预测时长（分钟）</label>
      <div class="cg-tabs">
        <button
          v-for="t in [15, 30, 60]"
          :key="t"
          class="cg-tab"
          :class="{ active: minutesAhead === t }"
          @click="minutesAhead = t; runPredict()"
        >
          {{ t }}min
        </button>
      </div>
      <div v-if="prediction" class="cg-result">
        <p>预测速度：<strong>{{ prediction.speed.toFixed(1) }} km/h</strong></p>
        <p>拥堵等级：<strong>{{ prediction.congestionLevel }}</strong></p>
        <p>置信度：<strong>{{ (prediction.confidence * 100).toFixed(0) }}%</strong></p>
        <p>拥堵传播路段：<strong>{{ spreadEdges.length }}</strong> 条</p>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.flow-map { position: absolute; inset: 0; }
.pred-tag {
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
.cg-select {
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
  margin-top: 12px;
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
  color: #fbbf24;
}
</style>
