---
title: T2 网络健康度面板
---

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NetworkHealth, type OnlineRateStats, type StationAlert } from '@caoguo/maplibre-telecom';
import { wuhanTelecom } from '../data/wuhan-telecom';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const health = ref<NetworkHealth | null>(null);
const rateByCarrier = ref<OnlineRateStats[]>([]);
const rateByType = ref<OnlineRateStats[]>([]);
const alerts = ref<StationAlert[]>([]);

onMounted(() => {
  const h = new NetworkHealth({ dataset: wuhanTelecom });
  health.value = h;
  rateByCarrier.value = h.onlineRateByCarrier();
  rateByType.value = h.onlineRateByType();
  alerts.value = h.faultAlerts();
});

function ratePercent(r: number): string {
  return (r * 100).toFixed(0) + '%';
}
</script>

<DemoLayout
  title="T2 · 网络健康度面板"
  subtitle="caoguo-telecom：基站在线率统计（NH-1）+ 故障告警（NH-2）+ 根因分析（NH-4）。"
>
  <template #map>
    <div class="health-panel">
      <div class="hp-head">
        <h2>网络健康度总览</h2>
        <p>按运营商 / 类型统计基站在线率，识别故障根因</p>
      </div>
      <div class="hp-section">
        <h3>运营商在线率（NH-1）</h3>
        <div class="hp-list">
          <div v-for="r in rateByCarrier" :key="r.group" class="hp-row">
            <span class="hp-name">{{ r.group }}</span>
            <div class="hp-bar">
              <div class="hp-bar-fill" :style="{ width: ratePercent(r.onlineRate), background: r.onlineRate >= 0.8 ? '#4ade80' : r.onlineRate >= 0.5 ? '#fbbf24' : '#ef4444' }" />
            </div>
            <span class="hp-val">{{ r.online }}/{{ r.total }} · {{ ratePercent(r.onlineRate) }}</span>
          </div>
        </div>
      </div>
      <div class="hp-section">
        <h3>故障告警（NH-2 / NH-4）</h3>
        <div v-if="alerts.length" class="hp-alerts">
          <div v-for="a in alerts" :key="a.station.id" class="hp-alert">
            <span class="hp-alert-dot" />
            <div>
              <p class="hp-alert-name">{{ a.station.name }}（{{ a.station.carrier }}）</p>
              <p class="hp-alert-reason">疑似原因：{{ a.reason }}</p>
            </div>
          </div>
        </div>
        <p v-else class="hp-empty">无故障基站</p>
      </div>
    </div>
  </template>
  <template #panel>
    <SimPanel title="按类型统计" hint="NH-1">
      <div v-for="r in rateByType" :key="r.group" class="cg-row">
        <span>{{ r.group }}</span>
        <span>{{ r.online }}/{{ r.total }}</span>
        <span class="cg-rate" :style="{ color: r.onlineRate >= 0.8 ? '#4ade80' : '#ef4444' }">{{ ratePercent(r.onlineRate) }}</span>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.health-panel {
  height: 100%;
  min-height: 480px;
  padding: 24px;
  background: var(--cg-bg, #0b1320);
  overflow-y: auto;
}
.hp-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
}
.hp-head p {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--cg-text-muted);
}
.hp-section {
  margin-bottom: 24px;
}
.hp-section h3 {
  font-size: 15px;
  margin: 0 0 12px;
}
.hp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.hp-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.hp-name {
  width: 80px;
  font-size: 13px;
  flex-shrink: 0;
}
.hp-bar {
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: #1e293b;
  overflow: hidden;
}
.hp-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
}
.hp-val {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}
.hp-alerts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.hp-alert {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
.hp-alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  margin-top: 6px;
  flex-shrink: 0;
}
.hp-alert-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.hp-alert-reason {
  margin: 2px 0 0;
  font-size: 12px;
  color: #fca5a5;
}
.hp-empty {
  font-size: 13px;
  color: #94a3b8;
}
.cg-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-rate {
  font-weight: 600;
}
</style>
