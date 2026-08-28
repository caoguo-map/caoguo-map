<script setup lang="ts">
import { ref } from 'vue';
import ComponentPanel from './ComponentPanel.vue';
import LayerList from './LayerList.vue';

// 左侧栏 tabs：组件 / 图层 切换
const tab = ref<'components' | 'layers'>('components');
</script>

<template>
  <aside class="cg-left-panel">
    <div class="cg-left-tabs">
      <button
        class="cg-left-tab"
        :class="{ active: tab === 'components' }"
        @click="tab = 'components'"
      >
        组件
      </button>
      <button
        class="cg-left-tab"
        :class="{ active: tab === 'layers' }"
        @click="tab = 'layers'"
      >
        图层
      </button>
    </div>
    <div class="cg-left-body">
      <ComponentPanel v-show="tab === 'components'" />
      <LayerList v-show="tab === 'layers'" />
    </div>
  </aside>
</template>

<style scoped>
.cg-left-panel {
  width: 300px; flex-shrink: 0; background: #0d1220; border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex; flex-direction: column; height: 100%;
}
.cg-left-tabs { display: flex; height: 44px; flex-shrink: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: #111a2e; }
.cg-left-tab {
  flex: 1; border: none; background: transparent; color: #8b93a7; font-size: 13px; font-weight: 600;
  cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s;
}
.cg-left-tab:hover { color: #e0e6f0; }
.cg-left-tab.active { color: #4ade80; border-bottom-color: #4ade80; }
.cg-left-body { flex: 1; min-height: 0; display: flex; }
.cg-left-body > * { flex: 1; min-width: 0; }
</style>
