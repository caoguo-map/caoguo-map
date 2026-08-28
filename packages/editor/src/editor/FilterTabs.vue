<script setup lang="ts">
import { computed } from 'vue';
import { useEditor } from '../store/useEditor';
import { useDeviceStore } from '../store/useDeviceStore';
import { DEVICE_STATUS_LABEL, type DeviceStatus } from '../devices';
import type { ComponentNode } from '../types';

const props = defineProps<{ node: ComponentNode }>();
const { activeScene } = useEditor();
const { getDevices, store: deviceStore, setFilterStatus } = useDeviceStore();

const deviceLayerId = computed<string | undefined>(() => {
  const cfg = props.node.config as { deviceLayerId?: string };
  if (cfg.deviceLayerId) return cfg.deviceLayerId;
  return activeScene.value?.layers.find((l) => l.type === 'device-layer')?.id;
});

const devices = computed(() => getDevices(deviceLayerId.value));

const tabs = computed<{ key: string; label: string; count: number }[]>(() => {
  const all = devices.value;
  const statuses: DeviceStatus[] = ['online', 'warning', 'fault', 'offline'];
  const result = [{ key: 'all', label: '全部', count: all.length }];
  for (const s of statuses) {
    result.push({ key: s, label: DEVICE_STATUS_LABEL[s], count: all.filter((d) => d.status === s).length });
  }
  return result;
});

const activeTab = computed<string>(() => deviceStore.filterStatus);

function onTab(key: string) {
  setFilterStatus(key);
}
</script>

<template>
  <div class="cg-filter-tabs">
    <button
      v-for="t in tabs"
      :key="t.key"
      class="cg-tab"
      :class="{ active: activeTab === t.key }"
      @click="onTab(t.key)"
    >
      {{ t.label }}<span class="cg-tab-count">{{ t.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.cg-filter-tabs { display: flex; gap: 6px; padding: 6px; height: 100%; box-sizing: border-box; align-items: center; flex-wrap: wrap; }
.cg-tab {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px;
  background: rgba(255, 255, 255, 0.03); color: #c7cee0; font-size: 12px; cursor: pointer;
}
.cg-tab:hover { border-color: rgba(74, 222, 128, 0.5); }
.cg-tab.active { background: #4ade80; color: #06281a; border-color: #4ade80; }
.cg-tab-count { font-size: 10px; opacity: 0.7; }
</style>
