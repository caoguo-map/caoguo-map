<script setup lang="ts">
import { computed } from 'vue';
import { useEditor } from '../store/useEditor';
import { findComponentDef } from '../components';
import { useHistory } from '../store/useHistory';

const { nodes, selectedId, toggleVisible, toggleLocked, bringForward, sendBackward, removeNode, setAllVisible, setAllLocked } = useEditor();
const { commit } = useHistory();

// 图层列表：z 高者显示在上方，所以反转展示
const list = computed(() => [...nodes.value].reverse());

function icon(type: string) { return findComponentDef(type)?.icon ?? '▫️'; }
function label(type: string) { return findComponentDef(type)?.label ?? type; }

function onDel(id: string) { commit(); removeNode(id); }
function showAll() { commit(); setAllVisible(true); }
function hideAll() { commit(); setAllVisible(false); }
function lockAll() { commit(); setAllLocked(true); }
function unlockAll() { commit(); setAllLocked(false); }
</script>

<template>
  <div class="cg-layer-bar">
    <div class="cg-layer-head">
      <span>图层 ({{ nodes.length }})</span>
    </div>
    <div class="cg-layer-actions">
      <button title="全部显示" @click="showAll">全显</button>
      <button title="全部隐藏" @click="hideAll">全隐</button>
      <button title="全部锁定" @click="lockAll">全锁</button>
      <button title="全部解锁" @click="unlockAll">全解</button>
    </div>
    <div class="cg-layer-list">
      <div
        v-for="node in list"
        :key="node.id"
        class="cg-layer-item"
        :class="{ active: node.id === selectedId }"
        @click="selectedId = node.id"
      >
        <button class="cg-eye" :title="node.visible ? '隐藏' : '显示'" @click.stop="commit(); toggleVisible(node.id)">{{ node.visible ? '显' : '隐' }}</button>
        <button class="cg-lock" :title="node.locked ? '解锁' : '锁定'" @click.stop="commit(); toggleLocked(node.id)">{{ node.locked ? '锁' : '解' }}</button>
        <span class="cg-layer-icon">{{ icon(node.type) }}</span>
        <span class="cg-layer-name">{{ label(node.type) }}</span>
        <div class="cg-layer-ops">
          <button title="上移" @click.stop="commit(); bringForward(node.id)">↑</button>
          <button title="下移" @click.stop="commit(); sendBackward(node.id)">↓</button>
          <button title="删除" @click.stop="onDel(node.id)">🗑️</button>
        </div>
      </div>
      <div v-if="!nodes.length" class="cg-layer-empty">暂无图层，从左侧拖入组件</div>
    </div>
  </div>
</template>

<style scoped>
.cg-layer-bar { height: 100%; display: flex; flex-direction: column; }
.cg-layer-head { height: 36px; display: flex; align-items: center; padding: 0 12px; font-size: 12px; font-weight: 600; color: #e0e6f0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.cg-layer-actions { display: flex; gap: 4px; padding: 6px 6px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.cg-layer-actions button {
  flex: 1; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.03); color: #b8c0d4;
  font-size: 11px; padding: 4px 0; border-radius: 5px; cursor: pointer; transition: all 0.15s;
}
.cg-layer-actions button:hover { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.4); color: #e0e6f0; }
.cg-layer-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.cg-layer-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; font-size: 13px;
  background: rgba(255, 255, 255, 0.02); color: #b8c0d4; cursor: pointer; border: 1px solid transparent;
}
.cg-layer-item:hover { background: rgba(255, 255, 255, 0.05); }
.cg-layer-item.active { background: rgba(74, 222, 128, 0.12); border-color: rgba(74, 222, 128, 0.4); }
.cg-layer-icon { font-size: 15px; }
.cg-layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cg-layer-ops { display: flex; gap: 4px; }
.cg-layer-ops button, .cg-eye, .cg-lock {
  background: transparent; border: none; color: #8b93a7; cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: 4px;
}
.cg-layer-ops button:hover, .cg-eye:hover, .cg-lock:hover { background: rgba(255, 255, 255, 0.08); color: #e0e6f0; }
.cg-layer-empty { color: #4b5563; font-size: 12px; text-align: center; padding: 20px; }
</style>
