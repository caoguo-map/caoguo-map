---
title: G2 停电分析器
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { OutageAnalyzer, type OutageResult } from '@caoguo/maplibre-grid';
import { wuhanGrid, gridDeviceIds, gridLineIds } from '../data/wuhan-grid';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const analyzer = ref<OutageAnalyzer | null>(null);
const faultId = ref<string>('sub-center');
const result = ref<OutageResult | null>(null);
const targetType = ref<'device' | 'line'>('device');

function runAnalysis() {
  if (!analyzer.value || !faultId.value) return;
  result.value = analyzer.value.analyze(faultId.value);
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.2 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    analyzer.value = new OutageAnalyzer({
      map: m as unknown as InstanceType<typeof CaoguoMap>,
      dataset: wuhanGrid,
      layerPrefix: 'cg-outage',
    });
    runAnalysis();
  });
});

onUnmounted(() => {
  analyzer.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="G2 · 停电分析器"
  subtitle="选择故障设备 → 下游遍历 → 受影响用户统计 + 重要用户标注 + 备用路径。"
>
  <template #map>
    <div ref="mapEl" class="outage-map" ></div>
    <div v-if="result" class="outage-tag">
      受影响 {{ result.affectedDevices.length }} 设备 · {{ result.affectedUsers.total }} 用户 · {{ result.durationMs.toFixed(1) }}ms
    </div>
  </template>
  <template #panel>
    <SimPanel title="故障设备" hint="一键停电分析">
      <div class="cg-tabs">
        <button class="cg-tab" :class="{ active: targetType === 'device' }" @click="targetType = 'device'">设备</button>
        <button class="cg-tab" :class="{ active: targetType === 'line' }" @click="targetType = 'line'">线路</button>
      </div>
      <select v-model="faultId" class="cg-select" @change="runAnalysis">
        <option v-for="id in (targetType === 'device' ? gridDeviceIds : gridLineIds)" :key="id" :value="id">{{ id }}</option>
      </select>
    </SimPanel>

    <SimPanel v-if="result" title="分析结果" :hint="`${result.durationMs.toFixed(1)}ms`">
      <div class="stat-row">
        <span class="stat-label">受影响用户</span>
        <span class="stat-value">{{ result.affectedUsers.total }}</span>
      </div>
      <div class="stat-grid">
        <div class="stat-cell"><b>{{ result.affectedUsers.residential }}</b><span>居民</span></div>
        <div class="stat-cell"><b>{{ result.affectedUsers.commercial }}</b><span>商业</span></div>
        <div class="stat-cell"><b>{{ result.affectedUsers.industrial }}</b><span>工业</span></div>
        <div class="stat-cell"><b>{{ result.affectedUsers.important.length }}</b><span>重要</span></div>
      </div>

      <div v-if="result.affectedUsers.important.length" class="important-list">
        <h4>重要用户</h4>
        <div v-for="u in result.affectedUsers.important" :key="u.id" class="important-item">
          <span class="important-dot" ></span>
          <span>{{ u.name }}</span>
          <span class="important-reason">{{ u.reason }}</span>
        </div>
      </div>

      <div class="cg-divider" ></div>

      <h4>恢复方案</h4>
      <p class="cg-hint">预计恢复时间：{{ result.restoration.estimatedTime }}</p>
      <ul class="steps-list">
        <li v-for="(s, i) in result.restoration.steps" :key="i">{{ s }}</li>
      </ul>
      <p v-if="result.restoration.alternativePaths.length" class="cg-hint alt">
        发现 {{ result.restoration.alternativePaths.length }} 条备用供电路径
      </p>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.outage-map { position: absolute; inset: 0; }
.outage-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fecaca;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}
.stat-label { font-size: 13px; color: #94a3b8; }
.stat-value { font-size: 24px; font-weight: 700; color: #ef4444; }
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 6px;
}
.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: var(--cg-bg-card, #0f172a);
  border-radius: 8px;
}
.stat-cell b { font-size: 18px; color: #e2e8f0; }
.stat-cell span { font-size: 11px; color: #94a3b8; }
.important-list { margin-top: 12px; }
.important-list h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.important-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.important-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fbbf24;
}
.important-reason {
  margin-left: auto;
  font-size: 11px;
  color: #fbbf24;
}
.cg-divider {
  margin: 14px 0;
  border-top: 1px dashed var(--cg-border, #1e293b);
}
.steps-list {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: #e2e8f0;
}
.steps-list li { padding: 3px 0; }
.cg-hint { margin: 6px 0; font-size: 12px; color: #94a3b8; }
.cg-hint.alt { color: #4ade80; }
.cg-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.cg-tab {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
}
.cg-tab.active {
  background: var(--cg-primary-3, #3b82f6);
  color: #fff;
}
.cg-select {
  width: 100%;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
}
</style>
