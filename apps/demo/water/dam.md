---
title: DO1 水库联合调度
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { simulateDamSchedule, type DamScheduleResult } from '@caoguo/maplibre-water';
import { wuhanWater, reservoirIds } from '../data/wuhan-water';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);

const outflows = ref<Record<string, number>>(
  Object.fromEntries(reservoirIds.map((id) => [id, 0]))
);
const result = ref<DamScheduleResult | null>(null);

const reservoirs = computed(() =>
  wuhanWater.features.filter((f) => f.kind === 'reservoir')
);

function runSchedule() {
  result.value = simulateDamSchedule(wuhanWater, { outflows: outflows.value });
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.0 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    runSchedule();
  });
});

onUnmounted(() => {
  map.value = null;
});
</script>

<DemoLayout
  title="DO1 · 水库联合调度"
  subtitle="调整各水库泄量 → 下游水位影响推演 → 多方案对比。"
>
  <template #map>
    <div ref="mapEl" class="dam-map" />
  </template>
  <template #panel>
    <SimPanel title="调度方案编辑器" hint="调整各水库泄量">
      <div v-for="r in reservoirs" :key="r.id" class="res-row">
        <div class="res-info">
          <span class="res-name">{{ r.name }}</span>
          <span class="res-meta">
            蓄水率 {{ ((r.properties?.storageRate ?? 0) * 100).toFixed(0) }}% · 出库 {{ r.properties?.outflow ?? 0 }} m³/s
          </span>
        </div>
        <input
          v-model.number="outflows[r.id]"
          type="number"
          class="cg-input res-input"
          placeholder="泄量调整"
        />
      </div>
      <button class="cg-run" @click="runSchedule">推演下游水位</button>
    </SimPanel>

    <SimPanel v-if="result" title="下游水位影响" :hint="`${result.durationMs.toFixed(1)}ms`">
      <div v-for="ws in result.downstreamLevels" :key="ws.stationId" class="level-row">
        <span class="level-name">{{ ws.stationId }}</span>
        <span class="level-value">
          {{ ws.level.toFixed(2) }}m
          <span :class="ws.levelChange > 0 ? 'up' : ws.levelChange < 0 ? 'down' : ''">
            {{ ws.levelChange > 0 ? '+' : '' }}{{ ws.levelChange.toFixed(2) }}
          </span>
        </span>
      </div>
    </SimPanel>

    <SimPanel v-if="result" title="水库状态变化">
      <div v-for="rs in result.reservoirStates" :key="rs.reservoirId" class="res-state">
        <span class="res-name">{{ rs.reservoirId }}</span>
        <span class="res-status" :class="rs.status">
          {{ rs.status === 'discharging' ? '泄洪' : rs.status === 'storing' ? '蓄水' : '平衡' }}
          {{ (rs.storageRate * 100).toFixed(0) }}%
        </span>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.dam-map { position: absolute; inset: 0; }
.res-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.res-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.res-name { font-size: 13px; color: #e2e8f0; font-weight: 600; }
.res-meta { font-size: 11px; color: #94a3b8; }
.cg-input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
}
.res-input { width: 90px; }
.cg-run {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: var(--cg-primary-3, #3b82f6);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}
.cg-run:hover { opacity: 0.9; }
.level-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}
.level-name { color: #e2e8f0; }
.level-value { color: #60a5fa; font-weight: 600; }
.level-value .up { color: #ef4444; margin-left: 6px; }
.level-value .down { color: #4ade80; margin-left: 6px; }
.res-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}
.res-status { font-weight: 600; }
.res-status.discharging { color: #ef4444; }
.res-status.storing { color: #fbbf24; }
.res-status.balanced { color: #4ade80; }
</style>
