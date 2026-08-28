<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditor } from '../store/useEditor';
import ConfigForm from './properties/ConfigForm.vue';
import DataSourceForm from './properties/DataSourceForm.vue';
import CommonProps from './properties/CommonProps.vue';
import { findComponentDef } from '../components';

const { selectedNode } = useEditor();

const def = computed(() => selectedNode.value ? findComponentDef(selectedNode.value.type) : undefined);
const title = computed(() => def.value ? `${def.value.icon} ${def.value.label}` : '属性');

// 属性面板 tabs：样式 / 数据 / 通用
type PropTab = 'style' | 'data' | 'common';
const tab = ref<PropTab>('style');
</script>

<template>
  <aside class="cg-prop-panel">
    <div class="cg-prop-header">
      <span class="cg-prop-title">{{ title }}</span>
      <div v-if="selectedNode" class="cg-prop-tabs">
        <button class="cg-prop-tab" :class="{ active: tab === 'style' }" @click="tab = 'style'">样式</button>
        <button class="cg-prop-tab" :class="{ active: tab === 'data' }" @click="tab = 'data'">数据</button>
        <button class="cg-prop-tab" :class="{ active: tab === 'common' }" @click="tab = 'common'">通用</button>
      </div>
    </div>
    <div class="cg-prop-body">
      <div v-if="!selectedNode" class="cg-empty">未选中组件<br /><span>请选择一个组件进行编辑</span></div>
      <template v-else>
        <ConfigForm v-show="tab === 'style'" :node="selectedNode" />
        <DataSourceForm v-show="tab === 'data'" :node="selectedNode" />
        <CommonProps v-show="tab === 'common'" :node="selectedNode" />
      </template>
    </div>
  </aside>
</template>

<style scoped>
.cg-prop-panel {
  width: 300px; flex-shrink: 0; background: #0d1220; border-left: 1px solid rgba(255, 255, 255, 0.06);
  display: flex; flex-direction: column; height: 100%;
}
.cg-prop-header {
  height: 44px; display: flex; align-items: center; padding: 0 14px; font-size: 13px; font-weight: 600;
  color: #e0e6f0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: #111a2e;
}
.cg-prop-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cg-prop-tabs { display: flex; gap: 4px; }
.cg-prop-tab {
  border: 1px solid rgba(255, 255, 255, 0.1); background: transparent; color: #8b93a7; font-size: 11px;
  padding: 3px 8px; border-radius: 10px; cursor: pointer; transition: all 0.15s;
}
.cg-prop-tab:hover { color: #e0e6f0; border-color: rgba(74, 222, 128, 0.4); }
.cg-prop-tab.active { background: #4ade80; color: #06281a; border-color: #4ade80; }
.cg-prop-body { flex: 1; overflow-y: auto; padding: 12px 14px; }
.cg-empty { color: #6b7280; font-size: 13px; text-align: center; margin-top: 40px; line-height: 1.8; }
.cg-empty span { font-size: 12px; color: #4b5563; }
</style>
