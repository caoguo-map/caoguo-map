---
title: T1 基站覆盖地图
---

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Map as CaoguoMap, WUHAN_CENTER } from '@caoguo/maplibre';
import {
  CellCoverage,
  detectCoverageGaps,
  buildTelecomLegend,
  buildCarrierThemeStyle,
  type StationColorBy,
  type CoverageGap,
  type Carrier,
  type ScreenMode,
} from '@caoguo/maplibre-telecom';
import { wuhanTelecom, wuhanSignalSamples } from '../data/wuhan-telecom';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

const mapEl = ref<HTMLElement | null>(null);
const map = ref<InstanceType<typeof CaoguoMap> | null>(null);
const coverage = ref<CellCoverage | null>(null);

const colorMode = ref<StationColorBy>('carrier');
const modes: { value: StationColorBy; label: string }[] = [
  { value: 'carrier', label: '按运营商' },
  { value: 'technology', label: '按技术制式' },
  { value: 'status', label: '按状态' },
];

const carrier = ref<Carrier | null>(null);
const screenMode = ref<ScreenMode>('night');
const carriers: Carrier[] = ['中国移动', '中国联通', '中国电信', '中国广电'];

const gaps = ref<CoverageGap[]>([]);
const stats = ref({ stations: wuhanTelecom.baseStations.length, areas: wuhanTelecom.coverageAreas.length });

const legend = computed(() => buildTelecomLegend(colorMode.value));

function buildCoverage() {
  if (!map.value) return;
  const dataset = { ...wuhanTelecom, signalSamples: wuhanSignalSamples };
  const c = new CellCoverage({ map: map.value, dataset, colorBy: colorMode.value, layerPrefix: 'cg-cell' });
  c.render();
  coverage.value = c;
}

function switchColor(mode: StationColorBy) {
  colorMode.value = mode;
  coverage.value?.setColorBy(mode);
}

function detectGaps() {
  gaps.value = detectCoverageGaps(wuhanSignalSamples, wuhanTelecom.coverageAreas);
  // CC-4 地图盲区渲染：在已发布的 CellCoverage 上叠加盲区点层（红=无覆盖/橙=弱覆盖）
  coverage.value?.renderCoverageGaps(gaps.value);
}

/** 品牌大屏切换（PRD §5.3）：切换底图背景为运营商主色，重渲染覆盖层 */
function applyCarrierTheme() {
  if (!map.value || !carrier.value) return;
  const base = map.value.instance.getStyle() as never;
  const styled = buildCarrierThemeStyle(base, carrier.value, screenMode.value) as never;
  map.value.instance.setStyle(styled);
  map.value.instance.once('styledata', () => {
    if (!map.value) return;
    buildCoverage();
    detectGaps();
  });
}

onMounted(() => {
  if (!mapEl.value) return;
  const m = new CaoguoMap({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
  m.on('load', () => {
    map.value = m as unknown as InstanceType<typeof CaoguoMap>;
    buildCoverage();
    detectGaps();
  });
});

onUnmounted(() => {
  coverage.value?.destroy();
  map.value = null;
});
</script>

<DemoLayout
  title="T1 · 基站覆盖地图"
  subtitle="caoguo-telecom：基站着色 + 覆盖区域叠加 + 盲区识别（CC-4）+ 品牌大屏切换（PRD §5.3）。"
>
  <template #map>
    <div ref="mapEl" class="cell-map" ></div>
    <div class="stats-tag">
      {{ stats.stations }} 基站 · {{ stats.areas }} 覆盖区域
    </div>
    <div class="heat-tag">
      CC-3 信号强度热力图（{{ wuhanSignalSamples.length }} 路测采样点）
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
          <span class="cg-legend-swatch" :style="{ background: item.color, borderRadius: '50%', width: '10px', height: '10px' }" ></span>
          <span class="cg-legend-label">{{ item.label }}</span>
        </div>
      </div>
    </SimPanel>
    <SimPanel title="品牌大屏切换" hint="PRD §5.3">
      <div class="cg-field">
        <label class="cg-label">运营商</label>
        <div class="cg-tabs">
          <button
            v-for="c in carriers"
            :key="c"
            class="cg-tab"
            :class="{ active: carrier === c }"
            @click="carrier = c"
          >
            {{ c }}
          </button>
        </div>
      </div>
      <div class="cg-field">
        <label class="cg-label">昼夜模式</label>
        <div class="cg-tabs">
          <button class="cg-tab" :class="{ active: screenMode === 'night' }" @click="screenMode = 'night'">夜间</button>
          <button class="cg-tab" :class="{ active: screenMode === 'day' }" @click="screenMode = 'day'">白天</button>
        </div>
      </div>
      <button class="cg-btn" :disabled="!carrier" @click="applyCarrierTheme">应用品牌大屏</button>
    </SimPanel>
    <SimPanel title="覆盖盲区识别" hint="CC-4">
      <button class="cg-btn" @click="detectGaps">重新检测</button>
      <div v-if="gaps.length" class="cg-result">
        <p>检测到 <strong>{{ gaps.length }}</strong> 个盲区点</p>
        <div v-for="(g, i) in gaps" :key="i" class="cg-gap-item">
          <span class="cg-gap-dot" :style="{ background: g.level === 'none' ? '#ef4444' : '#f59e0b' }" ></span>
          <span>{{ g.level === 'none' ? '无覆盖' : '弱覆盖' }} ({{ g.rsrp }} dBm)</span>
        </div>
      </div>
      <p v-else class="cg-empty">未检测到盲区</p>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.cell-map { position: absolute; inset: 0; }
.stats-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fef3c7;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.heat-tag {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #a7f3d0;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.cg-field {
  margin-bottom: 14px;
}
.cg-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
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
  flex-shrink: 0;
  display: inline-block;
}
.cg-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--cg-border, #1e293b);
  background: var(--cg-gradient-soft);
  color: #e2e8f0;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 10px;
}
.cg-result {
  padding: 12px;
  background: var(--cg-bg-card, #0f172a);
  border-radius: 10px;
  border: 1px solid var(--cg-border, #1e293b);
}
.cg-result p {
  margin: 4px 0;
  font-size: 13px;
  color: #e2e8f0;
}
.cg-result strong {
  color: #fbbf24;
}
.cg-gap-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  color: #e2e8f0;
}
.cg-gap-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cg-empty {
  font-size: 13px;
  color: #94a3b8;
  margin: 4px 0;
}
</style>
