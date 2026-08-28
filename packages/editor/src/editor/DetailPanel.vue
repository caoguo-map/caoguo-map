<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useEditor } from '../store/useEditor';
import { useDeviceStore } from '../store/useDeviceStore';
import { useDeviceData } from '../store/useDeviceData';
import { deviceIcon, deviceColor, DEVICE_STATUS_LABEL, deviceTrendSeries } from '../devices';
import IconSvg from './IconSvg.vue';
import type { ComponentNode, MapLayer } from '../types';

const props = defineProps<{ node: ComponentNode }>();
const { activeScene } = useEditor();
const { store, getDevices } = useDeviceStore();

// 绑定的设备图层：优先 config.deviceLayerId，否则取场景内第一个 device-layer
const deviceLayerId = computed<string | undefined>(() => {
  const cfg = props.node.config as { deviceLayerId?: string };
  if (cfg.deviceLayerId) return cfg.deviceLayerId;
  return activeScene.value?.layers.find((l) => l.type === 'device-layer')?.id;
});

const devices = computed(() => getDevices(deviceLayerId.value));
const selected = computed(() => devices.value.find((d) => d.id === store.selectedDeviceId));

// 订阅数据源加载/错误状态
const deviceLayer = ref<MapLayer | undefined>(
  activeScene.value?.layers.find((l) => l.id === deviceLayerId.value),
);
const { loading, error } = useDeviceData(toRef(deviceLayer));

const cfg = computed(() => ({
  showTrendChart: true,
  trendColor: '#4ade80',
  ...(props.node.config as Record<string, any>),
}));

// 趋势序列（选中设备时计算）
const trend = computed(() => (selected.value ? deviceTrendSeries(selected.value) : null));

// 把 12 点序列映射到 SVG 折线 path（viewBox 100x40）
const trendPath = computed(() => {
  if (!trend.value) return '';
  const pts = trend.value.points;
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = max - min || 1;
  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 36 - ((v - min) / span) * 32; // 留 4px 上下边距
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
});

// 展示设备原始字段（排除核心字段，仅展示业务字段）
const extraFields = computed<[string, unknown][]>(() => {
  if (!selected.value) return [];
  const skip = new Set(['id', 'name', 'type', 'status', 'lng', 'lat']);
  return Object.entries(selected.value).filter(([k]) => !skip.has(k));
});
</script>

<template>
  <div class="cg-detail-panel">
    <div v-if="loading" class="cg-detail-state">加载中…</div>
    <div v-else-if="error" class="cg-detail-state cg-detail-error">数据错误：{{ error }}</div>
    <template v-else-if="selected">
      <div class="cg-detail-head">
        <IconSvg :name="deviceIcon(selected.type)" :size="22" :style="{ color: deviceColor(selected.status) }" />
        <div class="cg-detail-title">{{ selected.name || selected.id }}</div>
        <span class="cg-detail-badge" :style="{ background: deviceColor(selected.status) + '22', color: deviceColor(selected.status) }">
          {{ DEVICE_STATUS_LABEL[selected.status as keyof typeof DEVICE_STATUS_LABEL] ?? selected.status }}
        </span>
      </div>
      <div class="cg-detail-meta">
        <span>类型：{{ selected.type }}</span>
        <span>坐标：{{ selected.lat?.toFixed(4) }}, {{ selected.lng?.toFixed(4) }}</span>
      </div>
      <div v-if="cfg.showTrendChart && trend" class="cg-detail-trend">
        <div class="cg-trend-head">
          <span class="cg-trend-label">{{ trend.label }}趋势</span>
          <span class="cg-trend-last" :style="{ color: cfg.trendColor }">
            {{ trend.points[trend.points.length - 1] }}{{ trend.unit }}
          </span>
        </div>
        <svg class="cg-trend-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path :d="trendPath" fill="none" :stroke="cfg.trendColor" stroke-width="1.5" vector-effect="non-scaling-stroke" />
        </svg>
      </div>
      <div v-if="extraFields.length" class="cg-detail-fields">
        <div v-for="[k, v] in extraFields" :key="k" class="cg-detail-field">
          <span class="cg-detail-k">{{ k }}</span>
          <span class="cg-detail-v">{{ v }}</span>
        </div>
      </div>
    </template>
    <div v-else class="cg-detail-empty">
      <IconSvg name="device-layer" :size="28" />
      <p>点击地图上的设备查看详情</p>
    </div>
  </div>
</template>

<style scoped>
.cg-detail-panel {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 12px;
  color: var(--cg-text, #e0e6f0);
  font-size: 12px;
  overflow: auto;
}
.cg-detail-state { padding: 24px; text-align: center; color: var(--cg-ph, #5b6478); }
.cg-detail-error { color: #f87171; }
.cg-detail-head { display: flex; align-items: center; gap: 8px; }
.cg-detail-title { font-size: 14px; font-weight: 600; flex: 1; }
.cg-detail-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.cg-detail-meta { display: flex; flex-direction: column; gap: 2px; margin: 10px 0; color: var(--cg-text-sub, #9aa3b8); }
.cg-detail-trend { margin: 10px 0; }
.cg-trend-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
.cg-trend-label { font-size: 11px; color: var(--cg-text-sub, #8b93a7); }
.cg-trend-last { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.cg-trend-svg { width: 100%; height: 40px; display: block; background: var(--cg-panel, rgba(255, 255, 255, 0.03)); border-radius: 6px; }
.cg-detail-fields { display: flex; flex-direction: column; gap: 6px; }
.cg-detail-field {
  display: flex; justify-content: space-between; gap: 8px;
  padding: 6px 8px; background: var(--cg-panel, rgba(255, 255, 255, 0.04)); border-radius: 6px;
}
.cg-detail-k { color: var(--cg-text-sub, #8b93a7); }
.cg-detail-v { color: var(--cg-text, #e0e6f0); }
.cg-detail-empty {
  height: 100%; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; color: var(--cg-ph, #5b6478);
}
.cg-detail-empty p { margin: 0; }
</style>
