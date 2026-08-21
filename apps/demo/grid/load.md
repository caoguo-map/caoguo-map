---
title: G3 负荷热力图
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { LoadHeatmap, predictLoadSeries, overloadedDevices } from '@caoguo/maplibre-grid';
import { wuhanGrid } from '../data/wuhan-grid';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const heatmap = ref<LoadHeatmap | null>(null);

const baseLoad = ref(100);
const temperature = ref(32);
const isHoliday = ref(false);

const overloaded = computed(() => overloadedDevices(wuhanGrid));

const forecast = computed(() => {
  // 未来 24h 气温曲线（简化：正弦）
  const temps = Array.from({ length: 24 }, (_, i) => temperature.value + 4 * Math.sin(((i - 8) / 24) * Math.PI * 2));
  return predictLoadSeries(baseLoad.value, temps, isHoliday.value);
});

const peakForecast = computed(() => Math.max(...forecast.value));

function refresh() {
  heatmap.value?.render();
  heatmap.value?.highlightOverload();
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.2 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    heatmap.value = new LoadHeatmap({
      map: m as unknown as InstanceType<typeof CaoguoMap>,
      dataset: wuhanGrid,
      layerPrefix: 'cg-load',
    });
    refresh();
  });
});

onUnmounted(() => {
  heatmap.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="G3 · 负荷热力图"
  subtitle="台区/线路负荷着色（绿→黄→红）+ 过载预警（负荷率 ≥80%）+ 24h 负荷预测。"
>
  <template #map>
    <div ref="mapEl" class="load-map" />
    <div v-if="overloaded.length" class="overload-tag">
      过载设备：{{ overloaded.length }} 个
    </div>
  </template>
  <template #panel>
    <SimPanel title="过载预警" hint="负荷率 ≥ 80%">
      <div v-if="overloaded.length" class="overload-list">
        <div v-for="d in overloaded" :key="d.id" class="overload-item">
          <span class="overload-dot" />
          <span>{{ d.name ?? d.id }}</span>
          <span class="overload-rate">{{ ((d.properties?.loadRate ?? 0) * 100).toFixed(0) }}%</span>
        </div>
      </div>
      <p v-else class="cg-hint">当前无过载设备</p>
    </SimPanel>

    <SimPanel title="负荷预测" hint="24h 简化模型">
      <div class="field">
        <label>基准负荷（MW）</label>
        <input v-model.number="baseLoad" type="number" class="cg-input" />
      </div>
      <div class="field">
        <label>气温（℃）</label>
        <input v-model.number="temperature" type="number" class="cg-input" />
      </div>
      <label class="checkbox">
        <input v-model="isHoliday" type="checkbox" />
        <span>节假日（负荷 ×0.7）</span>
      </label>
      <div class="forecast-summary">
        <span>预测峰值：</span>
        <b>{{ peakForecast.toFixed(1) }} MW</b>
      </div>
      <div class="forecast-bars">
        <div
          v-for="(v, i) in forecast"
          :key="i"
          class="forecast-bar"
          :style="{ height: `${(v / peakForecast) * 100}%` }"
          :title="`${i}:00 → ${v.toFixed(1)} MW`"
        />
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.load-map { position: absolute; inset: 0; }
.overload-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fecaca;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.overload-list { display: flex; flex-direction: column; gap: 6px; }
.overload-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.overload-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}
.overload-rate {
  margin-left: auto;
  font-weight: 700;
  color: #ef4444;
}
.cg-hint { margin: 6px 0; font-size: 12px; color: #94a3b8; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12px; color: #94a3b8; }
.cg-input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #e2e8f0;
}
.forecast-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
}
.forecast-summary b { font-size: 16px; color: #fbbf24; }
.forecast-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
  margin-top: 8px;
}
.forecast-bar {
  flex: 1;
  min-height: 2px;
  background: linear-gradient(to top, #4ade80, #fbbf24, #ef4444);
  border-radius: 2px 2px 0 0;
}
</style>
