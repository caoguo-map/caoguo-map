---
title: F1 洪水淹没模拟
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { simulateFlood, depthColor, type FloodResult } from '@caoguo/maplibre-water';
import { wuhanWater } from '../data/wuhan-water';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);

const rainfall = ref(120);
const curveNumber = ref(75);
const result = ref<FloodResult | null>(null);

// 简化 DEM（武汉府河附近，20×20 栅格，海拔 20-32m）
const DEM_SIZE = 20;
const dem = Array.from({ length: DEM_SIZE }, (_, r) =>
  Array.from({ length: DEM_SIZE }, (_, c) => {
    // 中心低洼（河道），四周渐高
    const distToCenter = Math.hypot(r - 10, c - 10);
    return 22 + distToCenter * 0.6;
  })
);

const cellSize = 0.003; // 约 300m/格

const polygonCoords = computed(() => {
  if (!result.value) return [];
  return result.value.inundationPolygon.map(([c, r]) => [
    114.30 + (c - DEM_SIZE / 2) * cellSize,
    30.60 + (r - DEM_SIZE / 2) * cellSize,
  ]);
});

const stats = computed(() => {
  if (!result.value) return null;
  return {
    runoff: result.value.runoff.toFixed(1),
    peakFlow: result.value.peakFlow.toFixed(1),
    maxDepth: result.value.maxDepth.toFixed(2),
    area: result.value.inundatedArea,
    duration: result.value.durationMs.toFixed(1),
  };
});

function runSim() {
  result.value = simulateFlood(wuhanWater, dem, { rainfall: rainfall.value, curveNumber: curveNumber.value }, [10, 10]);
  renderInundation();
}

function renderInundation() {
  if (!map.value || !result.value) return;
  const mlMap = (map.value as unknown as { instance: { addSource: (id: string, s: unknown) => void; addLayer: (l: unknown) => void; getSource: (id: string) => unknown } }).instance;
  const coords = polygonCoords.value;
  if (coords.length < 3) return;

  const id = 'cg-flood-polygon';
  if (mlMap.getSource(`${id}-src`)) {
    (mlMap.getSource(`${id}-src`) as { setData: (d: unknown) => void }).setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] }, properties: {} }],
    });
    return;
  }

  mlMap.addSource(`${id}-src`, {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] }, properties: {} }],
  });
  mlMap.addLayer({
    id,
    type: 'fill',
    source: `${id}-src`,
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0.35,
      'fill-outline-color': '#60a5fa',
    },
  });
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    runSim();
  });
});

onUnmounted(() => {
  map.value = null;
});
</script>

<DemoLayout
  title="F1 · 洪水淹没模拟"
  subtitle="SCS-CN 径流 + 推理公式洪峰 + flood fill 淹没范围提取（简化 DEM）。"
>
  <template #map>
    <div ref="mapEl" class="flood-map" ></div>
    <div v-if="stats" class="flood-tag">
      淹没 {{ stats.area }} 格 · 最大水深 {{ stats.maxDepth }}m · {{ stats.duration }}ms
    </div>
  </template>
  <template #panel>
    <SimPanel title="参数面板" hint="降雨量/径流系数">
      <div class="field">
        <label>降雨量（mm）</label>
        <input v-model.number="rainfall" type="number" class="cg-input" />
      </div>
      <div class="field">
        <label>径流系数 CN（55-95）</label>
        <input v-model.number="curveNumber" type="number" class="cg-input" />
      </div>
      <button class="cg-run" @click="runSim">重新模拟</button>
    </SimPanel>
    <SimPanel v-if="stats" title="模拟结果" :hint="`${stats.duration}ms`">
      <div class="result-grid">
        <div class="result-cell"><b>{{ stats.runoff }}</b><span>径流量 mm</span></div>
        <div class="result-cell"><b>{{ stats.peakFlow }}</b><span>洪峰 m³/s</span></div>
        <div class="result-cell"><b>{{ stats.maxDepth }}</b><span>最大水深 m</span></div>
        <div class="result-cell"><b>{{ stats.area }}</b><span>淹没网格</span></div>
      </div>
      <div class="depth-legend">
        <h4>水深色谱</h4>
        <div class="depth-bar" ></div>
        <div class="depth-labels">
          <span>浅</span>
          <span>深</span>
        </div>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.flood-map { position: absolute; inset: 0; }
.flood-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #bae6fd;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
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
.cg-run {
  margin-top: 6px;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: var(--cg-primary-3, #3b82f6);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.cg-run:hover { opacity: 0.9; }
.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.result-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  background: var(--cg-bg-card, #0f172a);
  border-radius: 8px;
}
.result-cell b { font-size: 20px; color: #60a5fa; }
.result-cell span { font-size: 11px; color: #94a3b8; }
.depth-legend { margin-top: 14px; }
.depth-legend h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.depth-bar {
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(to right, #93c5fd, #3b82f6, #f97316, #ef4444, #7f1d1d);
}
.depth-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
}
</style>
