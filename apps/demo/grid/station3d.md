---
title: G4 三维变电站
---

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import { Station3D, switchStationView, focusOnStation } from '@caoguo/maplibre-grid';
import type { StationViewMode } from '@caoguo/maplibre-grid';
import { wuhanGrid } from '../data/wuhan-grid';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

type MapInstance = InstanceType<typeof CaoguoMap>;

const VIEW_MODES: Array<{ mode: StationViewMode; label: string; hint: string }> = [
  { mode: '2d-top', label: '平面俯视', hint: 'zoom 12 / pitch 0' },
  { mode: '3d-perspective', label: '3D 透视', hint: 'zoom 14 / pitch 60' },
  { mode: '3d-low-orbit', label: '低空环绕', hint: 'zoom 15 / pitch 75' },
  { mode: 'isometric', label: '等距视角', hint: 'zoom 14 / pitch 45' },
];

const mapEl = ref<HTMLElement | null>(null);
const map = ref<MapInstance | null>(null);
const s3d = ref<Station3D | null>(null);
const viewMode = ref<StationViewMode>('3d-perspective');
const renderAccessories = ref(true);

const substations = computed(() => wuhanGrid.devices.filter((d) => d.kind === 'substation'));

function render() {
  if (!map.value) return;
  s3d.value?.destroy();
  s3d.value = new Station3D({
    map: map.value,
    dataset: wuhanGrid,
    layerPrefix: 'cg-s3d',
    renderAccessories: renderAccessories.value,
  });
  s3d.value.render();
}

function applyView(mode: StationViewMode) {
  viewMode.value = mode;
  if (map.value) switchStationView(map.value, mode, { center: WUHAN_CENTER, animateMs: 800 });
}

function focus(id: string) {
  const s = substations.value.find((d) => d.id === id);
  if (!s || !map.value) return;
  focusOnStation(map.value, { center: [s.lng, s.lat], animateMs: 1000 });
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
  m.on('load', () => {
    map.value = m;
    render();
    applyView(viewMode.value);
  });
});

onUnmounted(() => {
  s3d.value?.destroy();
  s3d.value = null;
  map.value = null;
});
</script>

<DemoLayout
  title="G4 · 三维变电站"
  subtitle="变电站渲染为 fill-extrusion 体块 + 附属设备（铁塔/配变/用户）叠加，支持 4 种视角预设（PRD G-6）。"
>
  <template #map>
    <div ref="mapEl" class="s3d-map"></div>
  </template>
  <template #panel>
    <SimPanel title="视角预设" hint="switchStationView(map, mode)">
      <div class="view-grid">
        <button
          v-for="v in VIEW_MODES"
          :key="v.mode"
          class="view-btn"
          :class="{ active: viewMode === v.mode }"
          @click="applyView(v.mode)"
        >
          <span class="view-label">{{ v.label }}</span>
          <span class="view-hint">{{ v.hint }}</span>
        </button>
      </div>
    </SimPanel>
    <SimPanel title="渲染选项" hint="附属设备 = 与变电站直连的非变电站设备">
      <label class="checkbox">
        <input v-model="renderAccessories" type="checkbox" @change="render" />
        <span>叠加附属设备</span>
      </label>
    </SimPanel>
    <SimPanel title="变电站聚焦" hint="点击切换到 3D 透视并飞行定位">
      <div class="station-list">
        <button
          v-for="s in substations"
          :key="s.id"
          class="station-item"
          @click="focus(s.id)"
        >
          <span class="station-name">{{ s.name }}</span>
          <span class="station-meta">{{ s.properties?.voltage ?? '-' }} kV · {{ s.properties?.capacity ?? '-' }} MVA</span>
        </button>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.s3d-map { position: absolute; inset: 0; }
.view-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.view-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #cbd5e1;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.view-btn:hover { border-color: #38bdf8; }
.view-btn.active { border-color: #38bdf8; background: rgba(56, 189, 248, 0.12); color: #e0f2fe; }
.view-hint { font-size: 11px; color: #64748b; }
.checkbox { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #e2e8f0; }
.station-list { display: flex; flex-direction: column; gap: 6px; }
.station-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.station-item:hover { border-color: #f59e0b; }
.station-meta { font-size: 11px; color: #64748b; }
</style>
