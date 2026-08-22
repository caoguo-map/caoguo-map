---
title: R1 水系拓扑图
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER, WebGLUnavailableError } from '@caoguo/maplibre';
import {
  RiverSystem,
  buildWaterLegend,
  type WaterColorByMode,
  type RiverLevel,
} from '@caoguo/maplibre-water';
import { wuhanWater, waterFeatureIds } from '../data/wuhan-water';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const river = ref<RiverSystem | null>(null);

const colorMode = ref<WaterColorByMode>('flow');
const modes: { value: WaterColorByMode; label: string }[] = [
  { value: 'flow', label: '按流量' },
  { value: 'storage', label: '按蓄水率' },
  { value: 'dike', label: '按堤防安全' },
  { value: 'level', label: '按河流层级' },
];

const currentLevel = ref<RiverLevel | null>(null);
const levels: { value: RiverLevel | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 'basin', label: '流域' },
  { value: 'mainstream', label: '干流' },
  { value: 'tributary', label: '支流' },
  { value: 'reach', label: '河段' },
];

const traceId = ref<string | null>(null);
const traceResult = ref<Set<string> | null>(null);
const webglError = ref(false);
const traceHint = ref('');

const legend = computed(() => buildWaterLegend(colorMode.value));

function switchColor(mode: WaterColorByMode) {
  colorMode.value = mode;
  if (!river.value) {
    traceHint.value = '地图尚未就绪，请稍候重试';
    return;
  }
  river.value.setColorBy(mode);
}

function switchLevel(level: RiverLevel | null) {
  currentLevel.value = level;
  if (!river.value) {
    traceHint.value = '地图尚未就绪，请稍候重试';
    return;
  }
  river.value.setLevel(level);
}

function runTrace(id: string | null, direction: 'upstream' | 'downstream') {
  traceId.value = id;
  traceResult.value = null;
  traceHint.value = '';
  if (!id) {
    traceHint.value = '请先在上方选择一个要素';
    return;
  }
  if (!river.value || !map.value) {
    traceHint.value = '地图尚未就绪，请稍候重试';
    return;
  }
  const ids = river.value.traceFlow(id, direction);
  traceResult.value = ids;

  const ml = (map.value as unknown as { instance: MlMapLike }).instance;
  const prefix = 'cg-river-trace';
  // 移除上一次的高亮层与源
  for (const suffix of ['hl-lines', 'hl-points']) {
    const lid = `${prefix}-${suffix}`;
    if (ml.getLayer(lid)) ml.removeLayer(lid);
  }
  for (const suffix of ['hl-lines-src', 'hl-points-src']) {
    const sid = `${prefix}-${suffix}`;
    try {
      ml.removeSource(sid);
    } catch {
      // ignore
    }
  }
  const idList = [...ids];
  if (idList.length === 0) {
    traceHint.value = '未找到可追踪的关联要素';
    return;
  }
  // 用独立源高亮（不受层级切换清除的影响）
  const lineFeats = wuhanWater.features.filter(
    (f) => ids.has(f.id) && ['mainstream', 'tributary', 'reach', 'dike'].includes(f.kind)
  );
  const pointFeats = wuhanWater.features.filter(
    (f) => ids.has(f.id) && ['reservoir', 'gate', 'rainStation', 'waterStation', 'basin'].includes(f.kind)
  );
  if (lineFeats.length > 0) {
    ml.addSource(`${prefix}-hl-lines-src`, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: lineFeats.flatMap((f) => {
          const coords = f.geometry && f.geometry.length >= 2 ? f.geometry : [[f.lng, f.lat]] as [number, number][];
          if (coords.length < 2) return [];
          return [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { featureId: f.id } }];
        }),
      } as never,
    } as never);
    ml.addLayer({
      id: `${prefix}-hl-lines`,
      type: 'line',
      source: `${prefix}-hl-lines-src`,
      paint: { 'line-color': '#f43f5e', 'line-width': 5, 'line-opacity': 1, 'line-blur': 0.4 },
    } as never);
  }
  if (pointFeats.length > 0) {
    ml.addSource(`${prefix}-hl-points-src`, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: pointFeats.map((f) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
          properties: { featureId: f.id },
        })),
      } as never,
    } as never);
    ml.addLayer({
      id: `${prefix}-hl-points`,
      type: 'circle',
      source: `${prefix}-hl-points-src`,
      paint: {
        'circle-radius': 9,
        'circle-color': '#f43f5e',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    } as never);
  }
  // 飞行到关联要素范围
  const feats = wuhanWater.features.filter((f) => ids.has(f.id));
  const coords: [number, number][] = feats.flatMap((f) => {
    if (f.geometry && f.geometry.length >= 2) return f.geometry as [number, number][];
    return [[f.lng, f.lat]];
  });
  if (coords.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of coords) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    ml.fitBounds([[minX, minY], [maxX, maxY]], { padding: 80, duration: 800, maxZoom: 13 });
  }
}

interface MlMapLike {
  getLayer: (id: string) => unknown;
  addLayer: (layer: unknown) => void;
  removeLayer: (id: string) => void;
  addSource: (id: string, source: unknown) => void;
  removeSource: (id: string) => void;
  fitBounds: (bounds: [[number, number], [number, number]], opts: Record<string, unknown>) => void;
}

onMounted(() => {
  if (!mapEl.value) return;
  try {
    const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.0 });
    m.on('load', () => {
      map.value = m as unknown as InstanceType<typeof CaoguoMap>;
      try {
        const r = new RiverSystem({ map: m as unknown as InstanceType<typeof CaoguoMap>, dataset: wuhanWater, colorBy: colorMode.value, layerPrefix: 'cg-river' });
        river.value = r;
        r.render();
      } catch (err) {
        console.error('[river] 初始化失败', err);
        traceHint.value = '地图初始化失败，请刷新重试';
      }
    });
  } catch (e) {
    if (e instanceof WebGLUnavailableError) {
      webglError.value = true;
      return;
    }
    throw e;
  }
});

onUnmounted(() => {
  river.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="R1 · 水系拓扑图"
  subtitle="caoguo-water：流域→干流→支流→河段层级渲染，按流量/蓄水率/堤防安全着色。"
>
  <template #map>
    <div class="river-map-wrap">
      <div ref="mapEl" class="river-map" ></div>
      <div v-if="webglError" class="river-fallback">
        <div class="river-fallback-icon">🗺️</div>
        <p class="river-fallback-title">当前环境无法渲染地图</p>
        <p class="river-fallback-desc">
          检测到浏览器未启用 WebGL（常见于沙箱、无头环境或禁用了硬件加速）。
          请在支持 WebGL 的桌面浏览器中打开本页以查看交互式地图。
        </p>
      </div>
      <div v-else-if="traceResult" class="trace-tag">
        关联要素：{{ traceResult.size }}
      </div>
    </div>
  </template>
  <template #panel>
    <SimPanel title="着色模式" hint="实时切换">
      <div class="cg-tabs">
        <button
          v-for="m in modes"
          :key="m.value"
          class="cg-tab"
          :class="{ active: colorMode === m.value }"
          @click="switchColor(m.value)"
        >
          {{ m.label }}
        </button>
      </div>
      <div class="cg-legend">
        <h4>{{ legend.title }}</h4>
        <div v-for="(item, i) in legend.items" :key="i" class="cg-legend-item">
          <span class="cg-legend-swatch" :style="{ background: item.color }" ></span>
          <span class="cg-legend-label">{{ item.label }}</span>
        </div>
      </div>
    </SimPanel>
    <SimPanel title="层级钻取" hint="流域→干流→支流→河段">
      <div class="cg-tabs">
        <button
          v-for="l in levels"
          :key="String(l.value)"
          class="cg-tab"
          :class="{ active: currentLevel === l.value }"
          @click="switchLevel(l.value)"
        >
          {{ l.label }}
        </button>
      </div>
    </SimPanel>
    <SimPanel title="顺流 / 逆流钻取" hint="沿水系追踪">
      <p class="cg-hint">选择一个要素，沿上下游追踪</p>
      <p v-if="traceHint" class="cg-trace-hint">{{ traceHint }}</p>
      <select v-model="traceId" class="cg-select">
        <option :value="null">— 取消 —</option>
        <option v-for="id in waterFeatureIds" :key="id" :value="id">{{ id }}</option>
      </select>
      <div class="trace-btns">
        <button class="cg-btn" @click="runTrace(traceId, 'upstream')">逆流</button>
        <button class="cg-btn" @click="runTrace(traceId, 'downstream')">顺流</button>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.river-map-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; }
.river-map { position: absolute; inset: 0; }
.river-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  background: var(--cg-bg, #0b1320);
  color: #94a3b8;
}
.river-fallback-icon { font-size: 40px; opacity: 0.7; }
.river-fallback-title { margin: 0; font-size: 16px; font-weight: 600; color: #e2e8f0; }
.river-fallback-desc { margin: 0; max-width: 360px; font-size: 13px; line-height: 1.6; }
.cg-trace-hint { margin: 4px 0 0; font-size: 12px; color: #fbbf24; }
.trace-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #bae6fd;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.cg-legend {
  margin-top: 14px;
  padding: 10px 12px;
  background: var(--cg-bg-card, #0f172a);
  border-radius: 10px;
  border: 1px solid var(--cg-border, #1e293b);
}
.cg-legend h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cg-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-legend-swatch {
  width: 28px;
  height: 8px;
  border-radius: 2px;
}
.cg-hint { margin: 6px 0 8px; font-size: 12px; color: #94a3b8; }
.cg-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
}
.trace-btns { display: flex; gap: 8px; margin-top: 10px; }
.cg-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-bg, #0b1320);
  color: #e2e8f0;
  font-size: 13px;
  cursor: pointer;
}
.cg-btn:hover { border-color: var(--cg-primary-3, #3b82f6); }
</style>
