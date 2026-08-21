---
title: R1 水系拓扑图
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import {
  RiverSystem,
  buildWaterLegend,
  type WaterColorByMode,
  type RiverLevel,
} from '@caoguo/maplibre-water';
import { wuhanWater, waterFeatureIds } from '../data/wuhan-water';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const river = ref<RiverSystem | null>(null);

const colorMode = ref<WaterColorByMode>('flow');
const modes: { value: WaterColorByMode; label: string }[] = [
  { value: 'flow', label: '按流量' },
  { value: 'storage', label: '按蓄水率' },
  { value: 'dike', label: '按堤防安全' },
  { value: 'level', label: '按河流层级' },
];

const currentLevel = ref<RiverLevel | null>(null);
const levels: { value: RiverLevel | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 'basin', label: '流域' },
  { value: 'mainstream', label: '干流' },
  { value: 'tributary', label: '支流' },
  { value: 'reach', label: '河段' },
];

const traceId = ref<string | null>(null);
const traceResult = ref<Set<string> | null>(null);

const legend = computed(() => buildWaterLegend(colorMode.value));

function switchColor(mode: WaterColorByMode) {
  colorMode.value = mode;
  river.value?.setColorBy(mode);
}

function switchLevel(level: RiverLevel | null) {
  currentLevel.value = level;
  river.value?.setLevel(level);
}

function runTrace(id: string | null, direction: 'upstream' | 'downstream') {
  traceId.value = id;
  if (!river.value || !id) {
    traceResult.value = null;
    return;
  }
  traceResult.value = river.value.traceFlow(id, direction);
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.0 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const r = new RiverSystem({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanWater, colorBy: colorMode.value, layerPrefix: 'cg-river' });
    r.render();
    river.value = r;
  });
});

onUnmounted(() => {
  river.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="R1 · 水系拓扑图"
  subtitle="caoguo-water：流域→干流→支流→河段层级渲染，按流量/蓄水率/堤防安全着色。"
>
  <template #map>
    <div ref="mapEl" class="river-map" ></div>
    <div v-if="traceResult" class="trace-tag">
      关联要素：{{ traceResult.size }}
    </div>
  </template>
  <template #panel>
    <SimPanel title="着色模式" hint="实时切换">
      <div class="cg-tabs">
        <button
          v-for="m in modes"
          :key="m.value"
          class="cg-tab"
          :class="{ active: colorMode === m.value }"
          @click="switchColor(m.value)"
        >
          {{ m.label }}
        </button>
      </div>
      <div class="cg-legend">
        <h4>{{ legend.title }}</h4>
        <div v-for="(item, i) in legend.items" :key="i" class="cg-legend-item">
          <span class="cg-legend-swatch" :style="{ background: item.color }" ></span>
          <span class="cg-legend-label">{{ item.label }}</span>
        </div>
      </div>
    </SimPanel>
    <SimPanel title="层级钻取" hint="流域→干流→支流→河段">
      <div class="cg-tabs">
        <button
          v-for="l in levels"
          :key="String(l.value)"
          class="cg-tab"
          :class="{ active: currentLevel === l.value }"
          @click="switchLevel(l.value)"
        >
          {{ l.label }}
        </button>
      </div>
    </SimPanel>
    <SimPanel title="顺流 / 逆流钻取" hint="沿水系追踪">
      <p class="cg-hint">选择一个要素，沿上下游追踪</p>
      <select v-model="traceId" class="cg-select">
        <option :value="null">— 取消 —</option>
        <option v-for="id in waterFeatureIds" :key="id" :value="id">{{ id }}</option>
      </select>
      <div class="trace-btns">
        <button class="cg-btn" @click="runTrace(traceId, 'upstream')">逆流</button>
        <button class="cg-btn" @click="runTrace(traceId, 'downstream')">顺流</button>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.river-map { position: absolute; inset: 0; }
.trace-tag {
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
.cg-legend {
  margin-top: 14px;
  padding: 10px 12px;
  background: var(--cg-bg-card, #0f172a);
  border-radius: 10px;
  border: 1px solid var(--cg-border, #1e293b);
}
.cg-legend h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cg-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-legend-swatch {
  width: 28px;
  height: 8px;
  border-radius: 2px;
}
.cg-hint { margin: 6px 0 8px; font-size: 12px; color: #94a3b8; }
.cg-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
}
.trace-btns { display: flex; gap: 8px; margin-top: 10px; }
.cg-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
  cursor: pointer;
}
.cg-btn:hover { border-color: var(--cg-primary-3, #3b82f6); }
</style>
