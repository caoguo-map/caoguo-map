<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useEditor } from '../store/useEditor';
import { useDeviceStore } from '../store/useDeviceStore';
import { useDeviceData } from '../store/useDeviceData';
import { deviceIcon, deviceColor, DEVICE_STATUS_LABEL } from '../devices';
import IconSvg from './IconSvg.vue';
import type { ComponentNode, MapLayer } from '../types';

const props = defineProps<{ node: ComponentNode }>();
const { activeScene, setSelectedDevice } = useEditor();
const { store, getDevices } = useDeviceStore();

const deviceLayerId = computed<string | undefined>(() => {
  const cfg = props.node.config as { deviceLayerId?: string; showStatusDot?: boolean };
  if (cfg.deviceLayerId) return cfg.deviceLayerId;
  return activeScene.value?.layers.find((l) => l.type === 'device-layer')?.id;
});

// 取对应设备图层对象，订阅其加载/错误状态
const deviceLayer = ref<MapLayer | undefined>(
  activeScene.value?.layers.find((l) => l.id === deviceLayerId.value),
);
const { loading, error } = useDeviceData(toRef(deviceLayer));

const devices = computed(() => {
  const all = getDevices(deviceLayerId.value);
  const f = store.filterStatus;
  return f === 'all' ? all : all.filter((d) => d.status === f);
});

function onClick(id: string) {
  setSelectedDevice(id);
}
</script>

<template>
  <div class="cg-dev-list">
    <div v-if="loading" class="cg-dev-state">加载中…</div>
    <div v-else-if="error" class="cg-dev-state cg-dev-error">数据错误：{{ error }}</div>
    <template v-else>
      <div
        v-for="d in devices"
        :key="d.id"
        class="cg-dev-row"
        :class="{ active: d.id === store.selectedDeviceId }"
        @click="onClick(d.id)"
      >
        <IconSvg :name="deviceIcon(d.type)" :size="18" :style="{ color: deviceColor(d.status) }" />
        <span class="cg-dev-name">{{ d.name || d.id }}</span>
        <span
          class="cg-dev-dot"
          :style="{ background: deviceColor(d.status) }"
          :title="DEVICE_STATUS_LABEL[d.status as keyof typeof DEVICE_STATUS_LABEL] ?? d.status"
        />
      </div>
      <div v-if="!devices.length" class="cg-dev-empty">暂无设备</div>
    </template>
  </div>
</template>

<style scoped>
.cg-dev-list { width: 100%; height: 100%; overflow: auto; padding: 6px; box-sizing: border-box; }
.cg-dev-state { padding: 16px; text-align: center; font-size: 12px; color: var(--cg-ph, #5b6478); }
.cg-dev-error { color: #f87171; }
.cg-dev-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border-radius: 6px; cursor: pointer; color: var(--cg-text, #c7cee0); font-size: 12px;
}
.cg-dev-row:hover { background: var(--cg-panel, rgba(255, 255, 255, 0.05)); }
.cg-dev-row.active { background: rgba(74, 222, 128, 0.12); }
.cg-dev-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cg-dev-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cg-dev-empty { padding: 16px; text-align: center; color: var(--cg-ph, #5b6478); font-size: 12px; }
</style>
