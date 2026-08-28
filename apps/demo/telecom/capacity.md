---
title: T3 容量热力图
---

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { CapacityHeatmap, stationCapacityStat, stationCapacityStats } from '@caoguo/maplibre-telecom';
import type { CapacityWeight, TelecomTopologyDataset } from '@caoguo/maplibre-telecom';
import { wuhanTelecom } from '../data/wuhan-telecom';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

type MapInstance = InstanceType<typeof CaoguoMap>;

/**
 * 演示数据补齐额定容量：原始数据只有吞吐/用户数，
 * 容量利用率 = throughputMbps / capacityMbps，需先有额定容量。
 */
const RATED_CAPACITY: Record<string, { capacityMbps: number; capacityUserCount: number }> = {
  'bs-m1': { capacityMbps: 800, capacityUserCount: 240 },
  'bs-m2': { capacityMbps: 700, capacityUserCount: 260 },
  'bs-u1': { capacityMbps: 600, capacityUserCount: 200 },
  'bs-t1': { capacityMbps: 750, capacityUserCount: 220 },
  'bs-g1': { capacityMbps: 150, capacityUserCount: 80 },
};

const capacityDataset: TelecomTopologyDataset = {
  ...wuhanTelecom,
  baseStations: wuhanTelecom.baseStations.map((s) => ({
    ...s,
    properties: { ...s.properties, ...(RATED_CAPACITY[s.id] ?? {}) },
  })),
};

const mapEl = ref<HTMLElement | null>(null);
const map = ref<MapInstance | null>(null);
const heat = ref<CapacityHeatmap | null>(null);
const kind = ref<CapacityWeight>('utilization');
const threshold = ref(0.8);

const summary = computed(() => stationCapacityStats(capacityDataset.baseStations));

const rows = computed(() =>
  capacityDataset.baseStations.map((s) => {
    const stat = stationCapacityStat(s);
    return {
      id: s.id,
      name: s.name ?? s.id,
      utilization: stat.utilization ?? 0,
      overloaded: stat.overloaded,
    };
  })
);

function render() {
  heat.value?.render(kind.value);
  heat.value?.renderAlerts(threshold.value);
}

function setKind(k: CapacityWeight) {
  kind.value = k;
  render();
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11 });
  m.on('load', () => {
    map.value = m;
    heat.value = new CapacityHeatmap({ map: m, dataset: capacityDataset, layerPrefix: 'cg-cap' });
    render();
  });
});

onUnmounted(() => {
  heat.value?.destroy();
  heat.value = null;
  map.value = null;
});
</script>

<DemoLayout
  title="T3 · 容量热力图"
  subtitle="基站吞吐/额定容量 → 容量利用率热点图，超载（>80%）基站高亮预警，可切换为用户负载视角（PRD CH-1～CH-4）。"
>
  <template #map>
    <div ref="mapEl" class="cap-map"></div>
    <div class="cap-tag" v-if="summary.overloadedCount">
      超载基站：{{ summary.overloadedCount }} 个
    </div>
  </template>
  <template #panel>
    <SimPanel title="热力权重" hint="capacityUtilizationPoints(stations, kind)">
      <div class="kind-row">
        <button class="chip" :class="{ active: kind === 'utilization' }" @click="setKind('utilization')">
          容量利用率
        </button>
        <button class="chip" :class="{ active: kind === 'userLoad' }" @click="setKind('userLoad')">
          用户负载
        </button>
      </div>
      <div class="field">
        <label>预警阈值：{{ (threshold * 100).toFixed(0) }}%</label>
        <input v-model.number="threshold" type="range" min="0.5" max="0.95" step="0.05" @change="render" />
      </div>
    </SimPanel>
    <SimPanel title="全网容量汇总" hint="stationCapacityStats(stations)">
      <div class="kv"><span>基站总数</span><b>{{ summary.total }}</b></div>
      <div class="kv"><span>有额定容量</span><b>{{ summary.withCapacity }}</b></div>
      <div class="kv"><span>平均容量利用率</span><b>{{ (summary.avgUtilization * 100).toFixed(1) }}%</b></div>
      <div class="kv"><span>超载基站</span><b class="warn">{{ summary.overloadedCount }}</b></div>
    </SimPanel>
    <SimPanel title="各站利用率" hint="利用率 = throughputMbps / capacityMbps">
      <div class="stat-list">
        <div v-for="r in rows" :key="r.id" class="stat-item" :class="{ bad: r.overloaded }">
          <span class="stat-name">{{ r.name }}</span>
          <span class="stat-bar">
            <span class="stat-fill" :style="{ width: `${Math.min(100, r.utilization * 100)}%` }"></span>
          </span>
          <span class="stat-val">{{ (r.utilization * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.cap-map { position: absolute; inset: 0; }
.cap-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fca5a5;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.kind-row { display: flex; gap: 6px; }
.chip {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}
.chip.active { border-color: #34d399; color: #d1fae5; background: rgba(52, 211, 153, 0.12); }
.field { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.field label { font-size: 12px; color: #94a3b8; }
.kv { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #94a3b8; }
.kv b { color: #e2e8f0; }
.kv b.warn { color: #fbbf24; }
.stat-list { display: flex; flex-direction: column; gap: 6px; }
.stat-item { display: grid; grid-template-columns: 110px 1fr 38px; align-items: center; gap: 6px; font-size: 12px; color: #cbd5e1; }
.stat-item.bad .stat-val { color: #f87171; }
.stat-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stat-bar { height: 6px; border-radius: 3px; background: rgba(148, 163, 184, 0.2); overflow: hidden; }
.stat-fill { display: block; height: 100%; background: linear-gradient(90deg, #4ade80, #fbbf24, #ef4444); }
.stat-val { text-align: right; font-weight: 700; }
</style>
