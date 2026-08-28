<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Toolbar from './Toolbar.vue';
import LeftPanel from './LeftPanel.vue';
import Canvas from './Canvas.vue';
import PropertyPanel from './PropertyPanel.vue';
import AlertPanel from './AlertPanel.vue';
import { useEditor } from '../store/useEditor';
import { useHistory } from '../store/useHistory';
import { genId } from '../components';
import type { ComponentNode } from '../types';

const { state, selectedIds, removeNode, activeScene, findNode, setSelection } = useEditor();
const { undo, redo, commit } = useHistory();

// ── 复制 / 粘贴（Ctrl+C / Ctrl+V）：深拷贝节点并重新生成 id（含嵌套 children），支持多选 ──
let clipboard: ComponentNode[] = [];
function cloneWithNewIds(node: ComponentNode): ComponentNode {
  const copy = JSON.parse(JSON.stringify(node)) as ComponentNode;
  const reId = (n: ComponentNode) => {
    n.id = genId(n.type);
    (n.children ?? []).forEach(reId);
  };
  reId(copy);
  return copy;
}

function onKey(ev: KeyboardEvent) {
  const target = ev.target as HTMLElement;
  // 在输入框 / 文本编辑中时不拦截
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;

  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if (selectedIds.value.size) {
      ev.preventDefault();
      commit();
      for (const id of [...selectedIds.value]) removeNode(id);
    }
  } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'c') {
    if (selectedIds.value.size) {
      ev.preventDefault();
      clipboard = [];
      for (const id of selectedIds.value) {
        const node = findNode(id)?.node;
        if (node) clipboard.push(JSON.parse(JSON.stringify(node)) as ComponentNode);
      }
    }
  } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'v') {
    const scene = activeScene.value;
    if (clipboard.length && scene) {
      ev.preventDefault();
      commit();
      const pasted: string[] = [];
      for (const src of clipboard) {
        const copy = cloneWithNewIds(src);
        copy.position.x += 20;
        copy.position.y += 20;
        scene.components.push(copy);
        pasted.push(copy.id);
      }
      setSelection(pasted);
    }
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
      <AlertPanel />
    </div>
  </div>
</template>

<style scoped>
.cg-editor { display: flex; flex-direction: column; height: 100%; width: 100%; background: #060912; color: #e0e6f0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.cg-main { flex: 1; display: flex; min-height: 0; }
.cg-center { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.cg-preview { flex: 1; min-height: 0; }
</style>
