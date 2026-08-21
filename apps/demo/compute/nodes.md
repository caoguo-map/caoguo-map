---
title: C1 算力节点地图
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import {
  ComputeNodes,
  buildComputeLegend,
  type ComputeNodeColorBy,
} from '@caoguo/maplibre-compute';
import { wuhanCompute } from '../data/wuhan-compute';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const nodes = ref<ComputeNodes | null>(null);

const colorMode = ref<ComputeNodeColorBy>('gpuUtil');
const modes: { value: ComputeNodeColorBy; label: string }[] = [
  { value: 'type', label: '按节点类型' },
  { value: 'gpuUtil', label: '按 GPU 利用率' },
  { value: 'status', label: '按状态' },
];

const stats = ref({ nodes: wuhanCompute.nodes.length, links: wuhanCompute.links.length });

const legend = computed(() => buildComputeLegend(colorMode.value));

function switchColor(mode: ComputeNodeColorBy) {
  colorMode.value = mode;
  nodes.value?.setNodeColorBy(mode);
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.0 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const c = new ComputeNodes({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanCompute, nodeColorBy: colorMode.value, layerPrefix: 'cg-compute' });
    c.render();
    nodes.value = c;
  });
});

onUnmounted(() => {
  nodes.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="C1 · 算力节点地图"
  subtitle="caoguo-compute：节点按类型/GPU 利用率/状态着色 + 光缆按带宽/利用率可视化。"
>
  <template #map>
    <div ref="mapEl" class="compute-map" />
    <div class="stats-tag">
      {{ stats.nodes }} 节点 · {{ stats.links }} 光缆
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
          <span class="cg-legend-swatch" :style="{ background: item.color, borderRadius: item.shape === 'circle' ? '50%' : '2px', width: item.shape === 'circle' ? '10px' : '28px', height: item.shape === 'circle' ? '10px' : '8px' }" />
          <span class="cg-legend-label">{{ item.label }}</span>
        </div>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.compute-map { position: absolute; inset: 0; }
.stats-tag {
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
  flex-shrink: 0;
  display: inline-block;
}
</style>
