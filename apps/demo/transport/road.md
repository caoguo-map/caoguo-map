---
title: T1 路网编辑器
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import {
  RoadNetwork,
  buildRoadLegend,
  type RoadColorBy,
} from '@caoguo/maplibre-transport';
import { wuhanTransport } from '../data/wuhan-transport';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const road = ref<RoadNetwork | null>(null);

const colorMode = ref<RoadColorBy>('roadClass');
const modes: { value: RoadColorBy; label: string }[] = [
  { value: 'roadClass', label: '按道路等级' },
  { value: 'speed', label: '按实时速度' },
  { value: 'status', label: '按状态' },
];

const stats = ref({ edges: wuhanTransport.edges.length, nodes: wuhanTransport.nodes.length });

const legend = computed(() => buildRoadLegend(colorMode.value));

function switchColor(mode: RoadColorBy) {
  colorMode.value = mode;
  if (mode === 'speed') {
    // 切到速度模式时注入实时速度
    road.value?.setSpeeds(wuhanTransport.speeds ?? []);
  }
  road.value?.setColorBy(mode);
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const r = new RoadNetwork({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanTransport, colorBy: colorMode.value, layerPrefix: 'cg-road' });
    r.render();
    road.value = r;
  });
});

onUnmounted(() => {
  road.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="T1 · 路网编辑器"
  subtitle="caoguo-transport：按道路等级/实时速度/状态着色，设施（收费站/服务区/停车场）标注。"
>
  <template #map>
    <div ref="mapEl" class="road-map" />
    <div class="stats-tag">
      {{ stats.edges }} 路段 · {{ stats.nodes }} 节点
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
          <span class="cg-legend-swatch" :style="{ background: item.color }" />
          <span class="cg-legend-label">{{ item.label }}</span>
        </div>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.road-map { position: absolute; inset: 0; }
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
  width: 28px;
  height: 8px;
  border-radius: 2px;
}
</style>
