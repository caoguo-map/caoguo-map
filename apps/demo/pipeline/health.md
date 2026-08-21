---
title: P3 健康评估
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { PipelineHealth, type HealthResult } from '@caoguo/maplibre-pipeline';
import { wuhanPipeline } from '../data/wuhan-pipeline';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const health = ref<PipelineHealth | null>(null);
const result = ref<HealthResult | null>(null);

function run() {
  if (!health.value) return;
  result.value = health.value.evaluate();
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const h = new PipelineHealth({
      map: m as unknown as InstanceType<typeof CaoguoMap>,
      dataset: wuhanPipeline,
      cellSize: 400,
      layerPrefix: 'cg-pipe-health',
    });
    health.value = h;
    run();
  });
});

onUnmounted(() => {
  health.value?.destroy();
});
</script>

<DemoLayout title="P3 管网健康评估" subtitle="6 维加权评分 - 年龄 25%, 材质 20%, 土壤 15%, 历史 20%, 压力 10%, 阴保 10%">
  <template #map>
    <div ref="mapEl" class="pipeline-map"></div>
  </template>
  <template #panel>
    <SimPanel title="健康评估概览" hint="网格聚合 + 热力图">
      <p class="cg-desc">基于管线 6 维评分 (年龄/材质/土壤/历史/压力/阴保) + 状态处罚 (损坏 x 0.5, 维修 x 0.7, 废弃 = 0)</p>
      <button class="cg-btn cg-btn-primary" @click="run">重新评估</button>
      <div v-if="result" class="cg-result">
        <div class="cg-stat-row">
          <div class="cg-stat">
            <div class="cg-stat-label">管线总数</div>
            <div class="cg-stat-value">{{ result.scores.length }}</div>
          </div>
          <div class="cg-stat">
            <div class="cg-stat-label">网格数</div>
            <div class="cg-stat-value">{{ result.heatmap.length }}</div>
          </div>
          <div class="cg-stat">
            <div class="cg-stat-label">优先维护</div>
            <div class="cg-stat-value cg-stat-warn">{{ result.maintenance.length }}</div>
          </div>
        </div>
        <h4 class="cg-h4">优先维护列表 (健康分最低 Top 10)</h4>
        <div class="cg-maint-list">
          <div v-for="m in result.maintenance" :key="m.id" class="cg-maint-item">
            <span class="cg-maint-id">{{ m.id }}</span>
            <span class="cg-maint-score">{{ m.healthScore }}</span>
          </div>
        </div>
        <div class="cg-perf">耗时 {{ result.durationMs.toFixed(1) }} ms</div>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.pipeline-map { position: absolute; inset: 0; }
.cg-desc { font-size: 13px; color: #cbd5e1; line-height: 1.6; margin: 0 0 10px; }
.cg-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
.cg-stat { padding: 10px; border-radius: 8px; background: var(--cg-bg-card, #0f172a); border: 1px solid var(--cg-border, #1e293b); text-align: center; }
.cg-stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
.cg-stat-value { font-size: 22px; font-weight: 600; color: #fef3c7; margin-top: 4px; }
.cg-stat-warn { color: #fb923c; }
.cg-h4 { margin: 12px 0 6px; font-size: 12px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.06em; }
.cg-maint-list { display: flex; flex-direction: column; gap: 4px; }
.cg-maint-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 6px; background: var(--cg-bg-card, #0f172a); font-size: 12px; }
.cg-maint-id { color: #e2e8f0; font-family: ui-monospace, monospace; }
.cg-maint-score { color: #fb923c; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: rgba(251, 146, 60, 0.18); }
.cg-perf { margin-top: 12px; font-family: ui-monospace, monospace; font-size: 12px; color: #38bdf8; }
</style>
