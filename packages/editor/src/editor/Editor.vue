<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Toolbar from './Toolbar.vue';
import LeftPanel from './LeftPanel.vue';
import Canvas from './Canvas.vue';
import PropertyPanel from './PropertyPanel.vue';
import { useEditor } from '../store/useEditor';
import { useHistory } from '../store/useHistory';

const { state, selectedId, removeNode } = useEditor();
const { undo, redo, commit } = useHistory();

function onKey(ev: KeyboardEvent) {
  const target = ev.target as HTMLElement;
  // 在输入框中时不拦截
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;

  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if (selectedId.value) { ev.preventDefault(); commit(); removeNode(selectedId.value); }
  } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
    ev.preventDefault(); if (ev.shiftKey) redo(); else undo();
  } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') {
    ev.preventDefault(); redo();
  } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
    ev.preventDefault(); // 保存由 Toolbar 处理
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="cg-editor" :class="{ 'is-preview': state.preview }">
    <Toolbar v-show="!state.preview" />
    <div class="cg-main" v-show="!state.preview">
      <LeftPanel />
      <div class="cg-center">
        <Canvas />
      </div>
      <PropertyPanel />
    </div>
    <!-- 预览模式：仅画布，全屏可交互 -->
    <div v-if="state.preview" class="cg-preview">
      <Canvas />
    </div>
  </div>
</template>

<style scoped>
.cg-editor { display: flex; flex-direction: column; height: 100%; width: 100%; background: #060912; color: #e0e6f0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.cg-main { flex: 1; display: flex; min-height: 0; }
.cg-center { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.cg-preview { flex: 1; min-height: 0; }
</style>
