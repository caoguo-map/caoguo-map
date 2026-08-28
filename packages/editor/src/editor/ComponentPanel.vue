<script setup lang="ts">
import { ref, computed } from 'vue';
import { CATEGORY_ORDER, CATEGORY_LABELS, getComponentsByCategory } from '../components';
import { onPanelDragStart } from '../store/useDragDrop';
import IconSvg from './IconSvg.vue';

const grouped = getComponentsByCategory();
const keyword = ref('');

// 按名称/类型过滤组件
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const result: Record<string, typeof grouped.basic> = {};
  for (const cat of CATEGORY_ORDER) {
    const items = kw
      ? grouped[cat].filter((d) => d.label.toLowerCase().includes(kw) || d.type.toLowerCase().includes(kw))
      : grouped[cat];
    if (items.length) result[cat] = items;
  }
  return result;
});
</script>

<template>
  <aside class="cg-comp-panel">
    <div class="cg-comp-header">组件面板</div>
    <div class="cg-comp-search">
      <input v-model="keyword" class="cg-search-input" type="text" placeholder="搜索组件…" />
    </div>
    <div class="cg-comp-body">
      <div v-for="cat in CATEGORY_ORDER" :key="cat" v-show="filtered[cat]" class="cg-cat">
        <div class="cg-cat-title">{{ CATEGORY_LABELS[cat] }}</div>
        <div class="cg-comp-grid">
          <div
            v-for="def in filtered[cat]"
            :key="def.type"
            class="cg-comp-item"
            draggable="true"
            :title="def.label"
            @dragstart="onPanelDragStart($event, def.type)"
          >
            <IconSvg :name="def.icon" :size="22" class="cg-comp-icon" />
            <span class="cg-comp-label">{{ def.label }}</span>
          </div>
        </div>
      </div>
      <div v-if="!Object.keys(filtered).length" class="cg-comp-empty">无匹配组件</div>
    </div>
  </aside>
</template>

<style scoped>
.cg-comp-panel {
  width: 100%; background: #0d1220;
  display: flex; flex-direction: column; height: 100%;
}
.cg-comp-header {
  height: 36px; display: flex; align-items: center; padding: 0 14px; font-size: 13px; font-weight: 600;
  color: #e0e6f0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: #111a2e;
}
.cg-comp-search { padding: 8px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.cg-search-input {
  width: 100%; box-sizing: border-box; height: 30px; padding: 0 10px; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1); background: #0a0f1c; color: #e0e6f0; font-size: 12px; outline: none;
}
.cg-search-input:focus { border-color: rgba(74, 222, 128, 0.5); }
.cg-comp-body { flex: 1; overflow-y: auto; padding: 10px; }
.cg-cat { margin-bottom: 14px; }
.cg-cat-title { font-size: 11px; color: #8b93a7; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px; }
.cg-comp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cg-comp-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
  cursor: grab; transition: all 0.15s; user-select: none;
}
.cg-comp-item:hover { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.4); transform: translateY(-1px); }
.cg-comp-item:active { cursor: grabbing; transform: scale(0.95); }
.cg-comp-icon { font-size: 20px; }
.cg-comp-label { font-size: 11px; color: #b8c0d4; text-align: center; }
.cg-comp-empty { color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; }
</style>
