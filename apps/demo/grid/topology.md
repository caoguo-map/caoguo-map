---
title: G1 电网拓扑浏览器
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER, localBasemapStyle } from '@caoguo/maplibre';
import {
  GridTopology,
  buildGridLegend,
  type GridColorByMode,
  type GridLevel,
} from '@caoguo/maplibre-grid';
import { wuhanGrid, gridDeviceIds } from '../data/wuhan-grid';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const topo = ref<GridTopology | null>(null);

const colorMode = ref<GridColorByMode>('voltage');
const modes: { value: GridColorByMode; label: string }[] = [
  { value: 'voltage', label: '按电压等级' },
  { value: 'status', label: '按运行状态' },
  { value: 'load', label: '按负载率' },
  { value: 'year', label: '按投运年份' },
];

const currentLevel = ref<GridLevel | null>(null);
const levels: { value: GridLevel | null; label: string }[] = [
  { value: null, label: '全部层级' },
  { value: 'L1', label: 'L1 发电' },
  { value: 'L2', label: 'L2 输电' },
  { value: 'L3', label: 'L3 变电' },
  { value: 'L4', label: 'L4 配电' },
  { value: 'L5', label: 'L5 用户' },
];

const traceId = ref<string | null>(null);
const traceResult = ref<{ deviceIds: Set<string>; lineIds: Set<string> } | null>(null);

const legend = computed(() => buildGridLegend(colorMode.value));

function switchColor(mode: GridColorByMode) {
  colorMode.value = mode;
  topo.value?.setColorBy(mode);
}

function switchLevel(level: GridLevel | null) {
  currentLevel.value = level;
  topo.value?.setLevel(level);
}

function runTrace(id: string | null) {
  traceId.value = id;
  if (!topo.value || !id) {
    traceResult.value = null;
    return;
  }
  traceResult.value = topo.value.traceSupply(id);
}

onMounted(() => {
  if (!mapEl.value) return;
  // 行业页使用国内可达的 GeoQ 栅格底图（行业配色由 GridTopology 自身 paint 承担）
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.2, style: localBasemapStyle() });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const t = new GridTopology({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanGrid, colorBy: colorMode.value, layerPrefix: 'cg-grid-topo' });
    t.render();
    topo.value = t;
  });
});

onUnmounted(() => {
  topo.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="G1 · 电网拓扑浏览器"
  subtitle="caoguo-grid：5 级钻取（发电→输电→变电→配电→用户），按电压/状态/负荷/年份着色。"
>
  <template #map>
    <div ref="mapEl" class="grid-map" ></div>
    <div v-if="traceResult" class="trace-tag">
      供电路径：{{ traceResult.deviceIds.size }} 设备 · {{ traceResult.lineIds.size }} 线路
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
    <SimPanel title="层级钻取" hint="5 级">
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
    <SimPanel title="供电路径追踪" hint="反向 BFS 到发电侧">
      <p class="cg-hint">选择一个设备，反向追踪到发电侧的完整供电路径</p>
      <select v-model="traceId" class="cg-select" @change="runTrace(traceId)">
        <option :value="null">— 取消追踪 —</option>
        <option v-for="id in gridDeviceIds" :key="id" :value="id">{{ id }}</option>
      </select>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.grid-map { position: absolute; inset: 0; }
.trace-tag {
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
.cg-hint {
  margin: 6px 0 8px;
  font-size: 12px;
  color: #94a3b8;
}
.cg-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
}
</style>
