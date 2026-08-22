---
title: T2 网络健康度面板
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map, WUHAN_CENTER, WUHAN_ZOOM } from '@caoguo/maplibre';
import {
  NetworkHealth,
  CapacityHeatmap,
  type OnlineRateStats,
  type StationAlert,
} from '@caoguo/maplibre-telecom';
import { wuhanTelecom } from '../data/wuhan-telecom';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLDivElement | null>(null);
let map: Map | null = null;

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

  if (!mapEl.value) return;
  map = new Map({
    container: mapEl.value,
    center: WUHAN_CENTER,
    zoom: WUHAN_ZOOM,
  });

  map.on('load', () => {
    if (!map) return;
    // 基站散点图层
    const stationGeoJSON = {
      type: 'FeatureCollection' as const,
      features: wuhanTelecom.baseStations.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { id: s.id, name: s.name, carrier: s.carrier, status: s.properties?.status ?? 'online' },
      })),
    };
    map.addSource('health-stations', stationGeoJSON);
    map.addLayer({
      id: 'health-station-pt',
      type: 'circle',
      source: 'health-stations',
      paint: {
        'circle-radius': 7,
        'circle-color': '#38bdf8',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0ea5e9',
      },
    });

    // CH-3 容量预警地图高亮：利用率 > 80% 的基站渲染为红色描边圆点
    const heatmap = new CapacityHeatmap({ map, dataset: wuhanTelecom });
    heatmap.renderAlerts(0.8);
  });
});

onUnmounted(() => {
  map?.remove();
  map = null;
});

function ratePercent(r: number): string {
  return (r * 100).toFixed(0) + '%';
}
</script>

<DemoLayout
  title="T2 · 网络健康度面板"
  subtitle="caoguo-telecom：基站在线率统计（NH-1）+ 故障告警（NH-2）+ 容量预警地图高亮（CH-3）。"
>
  <template #map>
    <div ref="mapEl" class="health-map"></div>
  </template>
  <template #panel>
    <SimPanel title="运营商在线率" hint="NH-1">
      <div v-for="r in rateByCarrier" :key="r.group" class="cg-row">
        <span>{{ r.group }}</span>
        <span>{{ r.online }}/{{ r.total }}</span>
        <span class="cg-rate" :style="{ color: r.onlineRate >= 0.8 ? '#4ade80' : '#ef4444' }">{{ ratePercent(r.onlineRate) }}</span>
      </div>
    </SimPanel>
    <SimPanel title="故障告警" hint="NH-2 / NH-4" style="margin-top: 16px;">
      <div v-if="alerts.length" class="hp-alerts">
        <div v-for="a in alerts" :key="a.station.id" class="hp-alert">
          <span class="hp-alert-dot"></span>
          <div>
            <p class="hp-alert-name">{{ a.station.name }}（{{ a.station.carrier }}）</p>
            <p class="hp-alert-reason">疑似原因：{{ a.reason }}</p>
          </div>
        </div>
      </div>
      <p v-else class="hp-empty">无故障基站</p>
    </SimPanel>
    <SimPanel title="按类型统计" hint="NH-1" style="margin-top: 16px;">
      <div v-for="r in rateByType" :key="r.group" class="cg-row">
        <span>{{ r.group }}</span>
        <span>{{ r.online }}/{{ r.total }}</span>
        <span class="cg-rate" :style="{ color: r.onlineRate >= 0.8 ? '#4ade80' : '#ef4444' }">{{ ratePercent(r.onlineRate) }}</span>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.health-map {
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: #0a0f1e;
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
</style>
