---
title: C3 算力供需预测
---

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { predictSupplyDemand, type ComputeGap } from '@caoguo/maplibre-compute';
import { wuhanCompute } from '../data/wuhan-compute';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const daysAhead = ref<number>(7);
const growthRate = ref<number>(0.05);
const gaps = ref<ComputeGap[]>([]);

function run() {
  gaps.value = predictSupplyDemand(wuhanCompute, {
    daysAhead: daysAhead.value,
    growthRate: growthRate.value,
  });
}

onMounted(() => {
  run();
});

const gapLevelLabel: Record<string, string> = {
  none: '无缺口',
  low: '轻度缺口',
  medium: '中度缺口',
  high: '重度缺口',
};

const gapLevelColor: Record<string, string> = {
  none: '#4ade80',
  low: '#fbbf24',
  medium: '#f59e0b',
  high: '#ef4444',
};
</script>

<DemoLayout
  title="C3 · 算力供需预测"
  subtitle="caoguo-compute：未来 N 天各区域算力缺口预测（PRD §4.1.2 C-5）。"
>
  <template #map>
    <div class="predict-panel">
      <div class="pp-head">
        <h2>区域算力缺口预测</h2>
        <p>复合增长率模型，预测 {{ daysAhead }} 天后的利用率</p>
      </div>
      <div class="pp-grid">
        <div v-for="g in gaps" :key="g.region" class="pp-card" :class="{ 'pp-gap': g.isGap }">
          <div class="pp-region">{{ g.region }}</div>
          <div class="pp-bar">
            <div class="pp-bar-fill" :style="{ width: `${(g.predictedUtilization * 100).toFixed(0)}%`, background: gapLevelColor[g.gapLevel] }" ></div>
          </div>
          <div class="pp-meta">
            <span>当前 {{ (g.currentUtilization * 100).toFixed(0) }}%</span>
            <span>→ 预测 {{ (g.predictedUtilization * 100).toFixed(0) }}%</span>
          </div>
          <div class="pp-level" :style="{ color: gapLevelColor[g.gapLevel] }">
            {{ gapLevelLabel[g.gapLevel] }}
          </div>
        </div>
      </div>
    </div>
  </template>
  <template #panel>
    <SimPanel title="预测参数" hint="C-5 供需预测">
      <label class="cg-label">预测天数</label>
      <div class="cg-tabs">
        <button
          v-for="d in [1, 7, 14, 30]"
          :key="d"
          class="cg-tab"
          :class="{ active: daysAhead === d }"
          @click="daysAhead = d; run()"
        >
          {{ d }}天
        </button>
      </div>
      <label class="cg-label">日增长率（{{ (growthRate * 100).toFixed(0) }}%）</label>
      <input v-model.number="growthRate" type="range" min="0.01" max="0.2" step="0.01" class="cg-range" @input="run" />
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.predict-panel {
  height: 100%;
  min-height: 480px;
  padding: 24px;
  background: var(--cg-bg, #0b1320);
  overflow-y: auto;
}
.pp-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
}
.pp-head p {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--cg-text-muted);
}
.pp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.pp-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg-card, #0f172a);
}
.pp-gap {
  border-color: #ef4444;
}
.pp-region {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
}
.pp-bar {
  height: 10px;
  border-radius: 5px;
  background: #1e293b;
  overflow: hidden;
}
.pp-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
}
.pp-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}
.pp-level {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
}
.cg-label {
  font-size: 12px;
  color: #94a3b8;
  display: block;
  margin-bottom: 4px;
}
.cg-range {
  width: 100%;
  margin-bottom: 8px;
}
@media (max-width: 960px) {
  .pp-grid { grid-template-columns: 1fr; }
}
</style>
