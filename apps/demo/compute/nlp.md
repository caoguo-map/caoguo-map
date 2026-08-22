---
title: C4 自然语言算力查询
---

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  executeComputeQuery,
  type ComputeQueryExecution,
} from '@caoguo/maplibre-compute';
import { wuhanCompute } from '../data/wuhan-compute';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const cityToNodeId: Record<string, string> = {
  武汉: 'dc-wuhan',
  光谷: 'dc-guanggu',
  汉口: 'edge-hankou',
  武昌: 'edge-wuchang',
  华东: 'cloud-hz',
  备用: 'dc-offline',
};

const query = ref('列出利用率低于 30% 的 GPU 节点');
const result = ref<ComputeQueryExecution | null>(null);

function run() {
  result.value = executeComputeQuery(query.value, {
    dataset: wuhanCompute,
    cityToNodeId,
  });
}

const presets = [
  '列出利用率低于 30% 的 GPU 节点',
  '武汉到华东之间有哪些光缆路由？',
  '预测下个月华东区的算力缺口',
];

const intentLabel: Record<string, string> = {
  low_utilization: '低利用率节点',
  fiber_routes: '光缆路由',
  predict_gap: '算力缺口预测',
  unknown: '未识别',
};

onMounted(() => run());
</script>

<DemoLayout
  title="C4 自然语言算力查询"
  subtitle="caoguo-compute NLPG 识别意图到执行层取数"
>
  <template #map>
    <div class="nlp-result" v-if="result">
      <div class="nlp-head">
        <span class="nlp-intent">{{ intentLabel[result.intent] }}</span>
        <span class="nlp-summary">{{ result.summary }}</span>
      </div>
      <div v-if="result.data.type === 'low_utilization'" class="nlp-list">
        <div v-for="n in result.data.nodes" :key="n.id" class="nlp-row">
          <span class="nlp-name">{{ n.name ?? n.id }}</span>
          <span class="nlp-bar"><span class="nlp-bar-fill" :style="{ width: (n.gpuUtilization * 100).toFixed(0) + '%' }"></span></span>
          <span class="nlp-val">{{ (n.gpuUtilization * 100).toFixed(0) }}%</span>
        </div>
      </div>
      <div v-if="result.data.type === 'fiber_routes'" class="nlp-list">
        <div v-for="(r, i) in result.data.routes" :key="i" class="nlp-route">
          <span class="nlp-route-i">路由 {{ i + 1 }}</span>
          <span class="nlp-route-path">{{ r.path.join(' > ') }}</span>
        </div>
      </div>
      <div v-if="result.data.type === 'predict_gap'" class="nlp-list">
        <div v-for="f in result.data.forecasts" :key="f.region" class="nlp-row" :class="{ 'nlp-gap': f.isGap }">
          <span class="nlp-name">{{ f.region }}</span>
          <span class="nlp-val">{{ (f.predictedUtilization * 100).toFixed(0) }}%</span>
          <span class="nlp-level">{{ f.gapLevel }}</span>
        </div>
      </div>
    </div>
  </template>
  <template #panel>
    <SimPanel title="自然语言输入" hint="C4 NLPG 执行层">
      <label class="cg-label">查询语句</label>
      <input v-model="query" class="cg-input" placeholder="例如：列出利用率低于 30% 的 GPU 节点" @keydown.enter="run" />
      <button class="cg-btn" @click="run">执行查询</button>
      <label class="cg-label" style="margin-top: 16px;">示例</label>
      <button v-for="p in presets" :key="p" class="cg-preset" @click="query = p; run()">{{ p }}</button>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.nlp-result {
  height: 100%;
  min-height: 480px;
  padding: 24px;
  background: var(--cg-bg, #0b1320);
  overflow-y: auto;
}
.nlp-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}
.nlp-intent {
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: #1d4ed8;
  color: #fff;
}
.nlp-summary { font-size: 14px; color: var(--cg-text-muted, #94a3b8); }
.nlp-list { display: flex; flex-direction: column; gap: 10px; }
.nlp-row {
  display: grid;
  grid-template-columns: 140px 1fr 56px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg-card, #0f172a);
}
.nlp-gap { border-color: #ef4444; }
.nlp-name { font-size: 13px; font-weight: 600; }
.nlp-bar { height: 8px; border-radius: 4px; background: #1e293b; overflow: hidden; }
.nlp-bar-fill { display: block; height: 100%; border-radius: 4px; background: #22d3ee; }
.nlp-val { font-size: 13px; text-align: right; color: #e2e8f0; }
.nlp-level { font-size: 11px; color: #fbbf24; }
.nlp-route {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg-card, #0f172a);
}
.nlp-route-i { font-size: 11px; color: var(--cg-text-muted, #94a3b8); }
.nlp-route-path { font-family: monospace; font-size: 13px; color: #e2e8f0; }
.cg-label { font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px; }
.cg-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
}
.cg-btn {
  margin-top: 8px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: #1d4ed8;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.cg-preset {
  display: block;
  width: 100%;
  margin-bottom: 6px;
  padding: 8px 10px;
  border: 1px solid var(--cg-border, #1e293b);
  border-radius: 8px;
  background: #0f172a;
  color: #cbd5e1;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.cg-preset:hover { border-color: #1d4ed8; color: #fff; }
</style>
