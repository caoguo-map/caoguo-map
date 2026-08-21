---
title: P2 爆管推演
---

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { BurstSimulator, type BurstResult } from '@caoguo/maplibre-pipeline';
import { wuhanPipeline } from '../data/wuhan-pipeline';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const sim = ref<BurstSimulator | null>(null);

const selectedPipe = ref<string>('p04');
const scenario = ref<'gas' | 'water' | 'drainage' | 'heating'>('water');
const result = ref<BurstResult | null>(null);
const durationMs = ref<number>(0);

function run() {
  if (!sim.value) return;
  const r = sim.value.simulate(selectedPipe.value, { scenario: scenario.value });
  result.value = r;
  durationMs.value = r.durationMs;
  // 同时 fly 到影响区域中心
  const center = resultCenter(r);
  if (center) {
    const m = map.value as unknown as { instance: { flyTo: (opts: unknown) => void } };
    m.instance?.flyTo({ center, zoom: 12.5 });
  }
}

function clear() {
  sim.value?.clear();
  result.value = null;
}

function resultCenter(r: BurstResult): [number, number] | null {
  if (r.affectedNodes.length === 0) return null;
  let lng = 0;
  let lat = 0;
  for (const n of r.affectedNodes) {
    lng += n.lng;
    lat += n.lat;
  }
  return [lng / r.affectedNodes.length, lat / r.affectedNodes.length];
}

const importantUserDesc = computed(() => {
  if (!result.value || result.value.importantUsers.length === 0) return '无';
  return result.value.importantUsers.map((u) => u.name).join('、');
});

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    const s = new BurstSimulator({
      map: m as unknown as InstanceType<typeof CaoguoMap>,
      dataset: wuhanPipeline,
      scenario: 'water',
      layerPrefix: 'cg-pipe-burst',
    });
    sim.value = s;
  });
});

onUnmounted(() => {
  sim.value?.destroy();
});
</script>

<DemoLayout
  title="P2 · 爆管推演"
  subtitle="故障管段 → 自动找隔离阀门 → 推演受影响范围 → 识别重要用户。"
>
  <template #map>
    <div ref="mapEl" class="pipeline-map" ></div>
  </template>
  <template #panel>
    <SimPanel title="爆管参数" hint="选择故障管段 + 场景">
      <label class="cg-label">故障管段</label>
      <select v-model="selectedPipe" class="cg-select">
        <option v-for="p in wuhanPipeline.pipes" :key="p.id" :value="p.id">
          {{ p.id }} — {{ p.properties?.diameter }}mm
        </option>
      </select>
      <label class="cg-label" style="margin-top: 14px;">场景</label>
      <div class="cg-tabs">
        <button
          v-for="s in (['gas','water','drainage','heating'] as const)"
          :key="s"
          class="cg-tab"
          :class="{ active: scenario === s }"
          @click="scenario = s"
        >
          {{ s === 'gas' ? '燃气' : s === 'water' ? '供水' : s === 'drainage' ? '排水' : '供热' }}
        </button>
      </div>
      <div class="cg-actions">
        <button class="cg-btn cg-btn-primary" @click="run">触发爆管推演</button>
        <button class="cg-btn" @click="clear">清除</button>
      </div>
    </SimPanel>

    <SimPanel v-if="result" title="推演结果" hint="纯函数 · 端到端毫秒级">
      <div class="cg-stat-row">
        <div class="cg-stat">
          <div class="cg-stat-label">受影响节点</div>
          <div class="cg-stat-value">{{ result.affectedNodes.length }}</div>
        </div>
        <div class="cg-stat">
          <div class="cg-stat-label">受影响管段</div>
          <div class="cg-stat-value">{{ result.affectedPipes.length }}</div>
        </div>
        <div class="cg-stat">
          <div class="cg-stat-label">受影响用户</div>
          <div class="cg-stat-value">{{ result.affectedUserCount }}</div>
        </div>
      </div>

      <h4 class="cg-h4">隔离方案</h4>
      <div class="cg-summary">{{ result.valvePlan.summary }}</div>
      <div v-if="result.valvePlan.closeValves.length" class="cg-valve-list">
        <strong>关闭：</strong>
        <span
          v-for="v in result.valvePlan.closeValves"
          :key="v.id"
          class="cg-valve cg-valve-close"
        >
          {{ v.properties?.code ?? v.id }}
        </span>
      </div>
      <div v-if="result.valvePlan.openValves.length" class="cg-valve-list">
        <strong>打开：</strong>
        <span
          v-for="v in result.valvePlan.openValves"
          :key="v.id"
          class="cg-valve cg-valve-open"
        >
          {{ v.properties?.code ?? v.id }}
        </span>
      </div>

      <h4 class="cg-h4">重要用户</h4>
      <div class="cg-important">{{ importantUserDesc }}</div>

      <h4 class="cg-h4">性能</h4>
      <div class="cg-perf">推演耗时 {{ durationMs.toFixed(1) }} ms</div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.pipeline-map { position: absolute; inset: 0; }
.cg-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
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
.cg-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}
.cg-stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 10px 0;
}
.cg-stat {
  padding: 10px;
  border-radius: 8px;
  background: var(--cg-bg-card, #0f172a);
  border: 1px solid var(--cg-border, #1e293b);
  text-align: center;
}
.cg-stat-label {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cg-stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #fef3c7;
  margin-top: 4px;
}
.cg-h4 {
  margin: 12px 0 6px;
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cg-summary {
  padding: 10px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.6;
}
.cg-valve-list {
  margin-top: 8px;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-valve {
  display: inline-block;
  margin: 4px 6px 0 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}
.cg-valve-close {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid #ef4444;
}
.cg-valve-open {
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
  border: 1px solid #f59e0b;
}
.cg-important {
  font-size: 13px;
  color: #fda4af;
  font-weight: 500;
}
.cg-perf {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #38bdf8;
}
</style>
