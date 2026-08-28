---
title: T4 公共交通客流 OD
---

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { TransitHeatmap, aggregateOd, predictOd, suggestLineOptimization, odKey } from '@caoguo/maplibre-transport';
import type { OdRecord, TransitStation } from '@caoguo/maplibre-transport';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

type MapInstance = InstanceType<typeof CaoguoMap>;

/** 武汉主要轨道/公交枢纽（合成数据，仅用于演示） */
const stations: TransitStation[] = [
  { id: 'st-hk', name: '汉口火车站', lng: 114.25, lat: 30.62, line: '2号线' },
  { id: 'st-wh', name: '武昌火车站', lng: 114.32, lat: 30.53, line: '4号线' },
  { id: 'st-gg', name: '光谷广场', lng: 114.40, lat: 30.51, line: '2号线' },
  { id: 'st-jh', name: '江汉路', lng: 114.29, lat: 30.58, line: '2号线' },
  { id: 'st-xd', name: '街道口', lng: 114.35, lat: 30.53, line: '2号线' },
  { id: 'st-zs', name: '中山公园', lng: 114.27, lat: 30.59, line: '1号线' },
  { id: 'st-wj', name: '王家湾', lng: 114.22, lat: 30.56, line: '3号线' },
  { id: 'st-cd', name: '楚河汉街', lng: 114.33, lat: 30.56, line: '4号线' },
];

/** 早高峰 OD 客流（人/时段） */
const odRecords: OdRecord[] = [
  { origin: 'st-hk', dest: 'st-gg', volume: 3200 },
  { origin: 'st-hk', dest: 'st-xd', volume: 1800 },
  { origin: 'st-wh', dest: 'st-jh', volume: 2400 },
  { origin: 'st-wh', dest: 'st-zs', volume: 900 },
  { origin: 'st-gg', dest: 'st-hk', volume: 2900 },
  { origin: 'st-gg', dest: 'st-jh', volume: 1500 },
  { origin: 'st-wj', dest: 'st-gg', volume: 2100 },
  { origin: 'st-wj', dest: 'st-xd', volume: 760 },
  { origin: 'st-zs', dest: 'st-cd', volume: 1250 },
  { origin: 'st-jh', dest: 'st-cd', volume: 1680 },
  { origin: 'st-xd', dest: 'st-wh', volume: 1420 },
  { origin: 'st-cd', dest: 'st-hk', volume: 1100 },
];

/** 已开通直达的 OD 对（用于线路优化建议的差集计算） */
const directPairs = new Set([odKey('st-hk', 'st-gg'), odKey('st-gg', 'st-hk'), odKey('st-wh', 'st-jh')]);

const mapEl = ref<HTMLElement | null>(null);
const map = ref<MapInstance | null>(null);
const heat = ref<TransitHeatmap | null>(null);
const growthRate = ref(0.1);
const showPredicted = ref(false);

const agg = computed(() => aggregateOd(odRecords));
const prediction = computed(() => predictOd(agg.value.odWeights, growthRate.value));
const suggestions = computed(() => suggestLineOptimization(odRecords, directPairs, 1200));

const topStations = computed(() =>
  Object.values(agg.value.throughput)
    .map((t) => ({ ...t, total: t.board + t.alight, name: stations.find((s) => s.id === t.stationId)?.name ?? t.stationId }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
);

const topOd = computed(() =>
  Object.entries(agg.value.odWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, volume]) => {
      const [from, to] = key.split('->');
      return { key, from: stations.find((s) => s.id === from)?.name ?? from, to: stations.find((s) => s.id === to)?.name ?? to, volume };
    })
);

function render() {
  if (!heat.value) return;
  heat.value.render(odRecords);
  if (showPredicted.value) heat.value.renderPredicted(odRecords, prediction.value.odWeights);
}

function togglePredicted() {
  showPredicted.value = !showPredicted.value;
  render();
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11 });
  m.on('load', () => {
    map.value = m;
    heat.value = new TransitHeatmap({ map: m, stations, layerPrefix: 'cg-transit' });
    heat.value.render(odRecords);
  });
});

onUnmounted(() => {
  heat.value?.destroy();
  heat.value = null;
  map.value = null;
});
</script>

<DemoLayout
  title="T4 · 公共交通客流 OD"
  subtitle="站点吞吐热力 + OD 连线（线宽按客流归一化）+ 客流预测 + 线路优化建议（PRD §3.4 TNS-1～TNS-4）。"
>
  <template #map>
    <div ref="mapEl" class="transit-map"></div>
    <div class="transit-tag">
      {{ stations.length }} 站点 · {{ odRecords.length }} 条 OD · 全网站吞吐 {{ Object.values(agg.throughput).reduce((s, t) => s + t.board + t.alight, 0) }} 人次
    </div>
  </template>
  <template #panel>
    <SimPanel title="客流预测" hint="predictOd(odWeights, growthRate)">
      <div class="field">
        <label>增长率：{{ (growthRate * 100).toFixed(0) }}%（置信度 {{ (prediction.confidence * 100).toFixed(0) }}%）</label>
        <input v-model.number="growthRate" type="range" min="-0.2" max="0.5" step="0.05" @change="render" />
      </div>
      <button class="chip wide" :class="{ active: showPredicted }" @click="togglePredicted">
        {{ showPredicted ? '关闭预测图层（紫色）' : '叠加预测客流图层' }}
      </button>
    </SimPanel>
    <SimPanel title="站点吞吐 Top 5" hint="aggregateOd().throughput">
      <div class="rank-list">
        <div v-for="(s, i) in topStations" :key="s.stationId" class="rank-item">
          <span class="rank-no">{{ i + 1 }}</span>
          <span class="rank-name">{{ s.name }}</span>
          <span class="rank-val">{{ s.total }}</span>
        </div>
      </div>
    </SimPanel>
    <SimPanel title="OD 流量 Top 5" hint="线宽按流量归一化">
      <div class="rank-list">
        <div v-for="o in topOd" :key="o.key" class="rank-item">
          <span class="rank-name small">{{ o.from }} → {{ o.to }}</span>
          <span class="rank-val">{{ o.volume }}</span>
        </div>
      </div>
    </SimPanel>
    <SimPanel title="线路优化建议" hint="高 OD 且无直达（阈值 1200）">
      <div v-if="suggestions.length" class="sug-list">
        <div v-for="s in suggestions" :key="s.from + s.to" class="sug-item">
          <span class="sug-pair">{{ stations.find((x) => x.id === s.from)?.name ?? s.from }} ↔ {{ stations.find((x) => x.id === s.to)?.name ?? s.to }}</span>
          <span class="sug-vol">{{ s.unservedVolume }} 人/时段</span>
        </div>
      </div>
      <p v-else class="cg-hint">当前无满足阈值的缺口</p>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.transit-map { position: absolute; inset: 0; }
.transit-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #a5b4fc;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: #94a3b8; }
.chip {
  margin-top: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}
.chip.wide { width: 100%; }
.chip.active { border-color: #a78bfa; color: #ede9fe; background: rgba(167, 139, 250, 0.15); }
.rank-list { display: flex; flex-direction: column; gap: 6px; }
.rank-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #cbd5e1; }
.rank-no {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.18);
  color: #94a3b8;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rank-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-name.small { font-size: 12px; }
.rank-val { font-weight: 700; color: #e2e8f0; }
.sug-list { display: flex; flex-direction: column; gap: 6px; }
.sug-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.08);
  font-size: 12px;
  color: #fde68a;
}
.sug-vol { color: #fbbf24; font-weight: 700; }
.cg-hint { margin: 6px 0; font-size: 12px; color: #94a3b8; }
</style>
