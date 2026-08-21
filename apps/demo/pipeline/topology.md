---
title: P1 管网拓扑可视化
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import {
  PipelineTopology,
  buildLegend,
  type ColorByMode,
} from '@caoguo/maplibre-pipeline';
import { wuhanPipeline, pipeIds } from '../data/wuhan-pipeline';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const topo = ref<PipelineTopology | null>(null);

const colorMode = ref<ColorByMode>('type');
const modes: { value: ColorByMode; label: string }[] = [
  { value: 'type', label: '按管线大类' },
  { value: 'diameter', label: '按管径' },
  { value: 'status', label: '按状态' },
  { value: 'material', label: '按材质' },
];

const highlightPipeId = ref<string | null>(null);
const connectivityNodes = ref<Set<string>>(new Set());
const stats = ref({ nodes: wuhanPipeline.nodes.length, pipes: wuhanPipeline.pipes.length, users: (wuhanPipeline.users ?? []).length });

function switchColor(mode: ColorByMode) {
  colorMode.value = mode;
  topo.value?.setColorBy(mode);
}

function highlightConnectivity(pipeId: string | null) {
  highlightPipeId.value = pipeId;
  if (!topo.value || !pipeId) {
    connectivityNodes.value = new Set();
    return;
  }
  const pipe = wuhanPipeline.pipes.find((p) => p.id === pipeId);
  if (!pipe) return;
  // 取下游端点
  const start = pipe.toNode;
  const set = topo.value.highlightConnectivity(start);
  connectivityNodes.value = set;
}

const legend = computed(() => {
  return buildLegend(colorMode.value);
});

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const t = new PipelineTopology({
      map: m as unknown as InstanceType<typeof CaoguoMap>,
      dataset: wuhanPipeline,
      colorBy: colorMode.value,
      pipelineType: 'water',
      layerPrefix: 'cg-pipe-topo',
    });
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
  title="P1 · 管网拓扑可视化"
  subtitle="caoguo-pipeline：按类型/管径/状态/材质着色，互通共用 caoguo-dark 主题。"
>
  <template #map>
    <div ref="mapEl" class="pipeline-map" />
    <div v-if="connectivityNodes.size > 0" class="connectivity-tag">
      连通节点：{{ connectivityNodes.size }}
    </div>
  </template>
  <template #panel>
    <SimPanel title="视图模式" hint="实时切换">
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
          <span class="cg-legend-swatch" :style="{ background: item.color, ...(item.style === 'dashed' ? { background: `repeating-linear-gradient(90deg,${item.color} 0 4px,transparent 4px 8px)` } : {}) }" />
          <span class="cg-legend-label">{{ item.label }}</span>
        </div>
      </div>
      <div class="cg-divider" />
      <h4>连通性高亮</h4>
      <p class="cg-hint">选择一根管段，高亮其下游连通子图</p>
      <select v-model="highlightPipeId" class="cg-select">
        <option :value="null">— 取消高亮 —</option>
        <option v-for="id in pipeIds" :key="id" :value="id">{{ id }}</option>
      </select>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.pipeline-map { position: absolute; inset: 0; }
.connectivity-tag {
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
.cg-divider {
  margin: 16px 0;
  border-top: 1px dashed var(--cg-border, #1e293b);
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
