---
title: P4 管网 NLPG
---

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { PipelineNlp, type PipelineNlpResult, BurstSimulator } from '@caoguo/maplibre-pipeline';
import { wuhanPipeline, pipeIds } from '../data/wuhan-pipeline';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const sim = ref<BurstSimulator | null>(null);

const query = ref('武昌区爆管');
const result = ref<PipelineNlpResult | null>(null);
const intentLabel = computed(() => {
  if (!result.value) return '';
  const labels: Record<string, string> = {
    burst: '爆管推演',
    valve: '阀门关闭',
    material_age: '材质/年限',
    pressure: '压力筛选',
    nearby: '附近查询',
    alarm_cluster: '报警聚类',
    unknown: '未识别',
  };
  return labels[result.value.intent] ?? result.value.intent;
});

const intentColor = computed(() => {
  if (!result.value) return '#94a3b8';
  const colors: Record<string, string> = {
    burst: '#ef4444',
    valve: '#fbbf24',
    material_age: '#60a5fa',
    pressure: '#a78bfa',
    nearby: '#22c55e',
    alarm_cluster: '#f97316',
    unknown: '#94a3b8',
  };
  return colors[result.value.intent] ?? '#94a3b8';
});

const examples = [
  '武昌区爆管推演',
  '查找 30 年以上的铸铁管',
  '压力低于 0.2MPa 的管段',
  '500 米内的学校',
  '过去一周的报警聚集',
];

function run() {
  if (!nlp.value) return;
  const r = nlp.value.query(query.value);
  result.value = r;
  // 关联 burst 模拟
  if (r.intent === 'burst') {
    // 选第一根管段模拟
    if (pipeIds[0] && sim.value) {
      const chosen = pipeIds[Math.floor(pipeIds.length / 2)] ?? pipeIds[0];
      sim.value.simulate(chosen, { scenario: 'water' });
    }
  }
}

const nlp = ref<PipelineNlp | null>(null);

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const s = new BurstSimulator({
      map: m as unknown as InstanceType<typeof CaoguoMap>,
      dataset: wuhanPipeline,
      scenario: 'water',
      layerPrefix: 'cg-pipe-nlpg',
    });
    sim.value = s;
    nlp.value = new PipelineNlp({ burstSimulator: s });
    // 默认跑一次
    run();
  });
});

onUnmounted(() => {
  sim.value?.destroy();
});
</script>

<DemoLayout
  title="P4 · 管网 NLPG 自然语言查询"
  subtitle="意图识别 + 约束提取 → 联动 burst/topology/health 组件。"
>
  <template #map>
    <div ref="mapEl" class="pipeline-map" ></div>
  </template>
  <template #panel>
    <SimPanel title="查询输入" hint="中文意图识别">
      <textarea v-model="query" class="cg-textarea" rows="3" placeholder="例如：武昌区燃气爆管推演" ></textarea>
      <div class="cg-examples">
        <button v-for="e in examples" :key="e" class="cg-example" @click="query = e; run()">
          {{ e }}
        </button>
      </div>
      <button class="cg-btn cg-btn-primary" style="margin-top: 12px; width: 100%;" @click="run">
        解析
      </button>
    </SimPanel>
    <SimPanel v-if="result" title="解析结果" hint="正则 + 词典法">
      <div class="cg-intent-row">
        <div
          class="cg-intent-badge"
          :style="{ backgroundColor: intentColor }"
        >
          {{ intentLabel }}
        </div>
        <div class="cg-confidence">
          置信度 {{ (result.confidence * 100).toFixed(0) }}%
        </div>
      </div>
      <div class="cg-description">{{ result.description }}</div>
      <h4 class="cg-h4">提取的约束（filters）</h4>
      <pre class="cg-filters">{{ JSON.stringify(result.filters, null, 2) }}</pre>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.pipeline-map { position: absolute; inset: 0; }
.cg-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: var(--cg-text, #e2e8f0);
  font-size: 14px;
  resize: vertical;
}
.cg-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.cg-example {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg-card, #0f172a);
  color: #cbd5e1;
  cursor: pointer;
}
.cg-example:hover {
  color: #fef3c7;
  border-color: #fbbf24;
}
.cg-intent-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.cg-intent-badge {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: #0b1320;
}
.cg-confidence {
  font-size: 13px;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
}
.cg-description {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--cg-bg-card, #0f172a);
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.5;
}
.cg-h4 {
  margin: 14px 0 6px;
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cg-filters {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: #07101f;
  border: 1px solid var(--cg-border, #1e293b);
  font-family: ui-monospace, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: #cbd5e1;
  white-space: pre-wrap;
  max-height: 240px;
  overflow: auto;
}
</style>
