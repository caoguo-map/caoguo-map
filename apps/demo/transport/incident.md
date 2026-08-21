---
title: T3 事件响应图
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { IncidentMap, type IncidentImpact, type IncidentTimelineStep } from '@caoguo/maplibre-transport';
import { wuhanTransport } from '../data/wuhan-transport';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const incidentMap = ref<IncidentMap | null>(null);

const selectedIncidentId = ref<string>('inc01');
const impact = ref<IncidentImpact | null>(null);
const timeline = ref<IncidentTimelineStep[]>([]);

function analyze() {
  if (!incidentMap.value) return;
  const inc = wuhanTransport.incidents?.find((i) => i.id === selectedIncidentId.value);
  if (!inc) return;
  impact.value = incidentMap.value.analyze(inc);
  timeline.value = incidentMap.value.timeline(inc);
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const im = new IncidentMap({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanTransport, layerPrefix: 'cg-inc' });
    im.renderIncidents(wuhanTransport.incidents ?? []);
    incidentMap.value = im;
    analyze();
  });
});

onUnmounted(() => {
  incidentMap.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="T3 · 事件响应图"
  subtitle="caoguo-transport：事件标记 + 影响范围 + 附近资源 + 绕行方案 + 事件时间线。"
>
  <template #map>
    <div ref="mapEl" class="inc-map" ></div>
  </template>
  <template #panel>
    <SimPanel title="事件选择" hint="IM-1 事件标记">
      <select v-model="selectedIncidentId" class="cg-select" @change="analyze">
        <option v-for="inc in wuhanTransport.incidents" :key="inc.id" :value="inc.id">
          {{ inc.properties?.title ?? inc.id }}
        </option>
      </select>
    </SimPanel>

    <SimPanel v-if="impact" title="影响分析" hint="IM-2/IM-3/IM-4">
      <div class="cg-result">
        <p>影响路段：<strong>{{ impact.affectedEdges.length }}</strong> 条</p>
        <p>影响半径：<strong>{{ (impact.radiusMeters / 1000).toFixed(1) }} km</strong></p>
        <p>附近摄像头：<strong>{{ impact.nearbyResources.cameras.length }}</strong></p>
        <p>附近救援站：<strong>{{ impact.nearbyResources.rescue.length }}</strong></p>
        <p>附近医院：<strong>{{ impact.nearbyResources.hospitals.length }}</strong></p>
        <p v-if="impact.detour">
          绕行方案：
          <strong>{{ impact.detour.found ? `可用（${impact.detour.path.length} 节点）` : '无替代路径' }}</strong>
        </p>
      </div>
    </SimPanel>

    <SimPanel v-if="timeline.length" title="事件时间线" hint="IM-5">
      <div class="cg-timeline">
        <div v-for="(step, i) in timeline" :key="i" class="cg-tl-step">
          <span class="cg-tl-dot" ></span>
          <div>
            <p class="cg-tl-label">{{ step.label }}</p>
            <p v-if="step.time" class="cg-tl-time">{{ step.time }}</p>
          </div>
        </div>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.inc-map { position: absolute; inset: 0; }
.cg-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
}
.cg-result {
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
.cg-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cg-tl-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.cg-tl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  margin-top: 6px;
  flex-shrink: 0;
}
.cg-tl-label {
  margin: 0;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-tl-time {
  margin: 2px 0 0;
  font-size: 11px;
  color: #94a3b8;
}
</style>
