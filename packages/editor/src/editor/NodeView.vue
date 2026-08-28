<script setup lang="ts">
import { computed, toRef } from 'vue';
import type { ComponentNode } from '../types';
import { useEditor } from '../store/useEditor';
import { useDragDrop } from '../store/useDragDrop';
import { useDeviceData } from '../store/useDeviceData';
import MapNode from './MapNode.vue';
import DetailPanel from './DetailPanel.vue';
import DeviceList from './DeviceList.vue';
import FilterTabs from './FilterTabs.vue';
import StatusBar from './StatusBar.vue';
import ComponentView from './ComponentView.vue';

const props = defineProps<{ node: ComponentNode; depth?: number }>();

const { state, selectedIds, selectToggle, selectOnly } = useEditor();
const { startMove, startResize } = useDragDrop();
const isSelected = (id: string) => selectedIds.value.has(id);

// 取数状态灯：非地图节点由 NodeView 统一订阅连接池暴露的 loading/error（地图节点由 MapNode 自身显示）
const { loading: dataLoading, error: dataError } = useDeviceData(toRef(props, 'node') as any);
const showStatusDot = computed(() => props.node.type !== 'map' && (dataLoading.value || !!dataError.value));

function isContainerType(t: string) {
  return ['card-container', 'transparent-container', 'tab-container'].includes(t);
}
const isContainer = computed(() => isContainerType(props.node.type));

// 容器可见子组件：tab-container 按「归属 Tab」过滤（child.tab 缺省归第 0 页），其余容器全部可见
const { uiTabs } = useEditor();
const visibleChildren = computed(() => {
  const list = props.node.children ?? [];
  if (props.node.type !== 'tab-container') return list;
  const t = uiTabs[props.node.id] ?? 0;
  return list.filter((c) => (c.tab ?? 0) === t);
});

const style = computed(() => ({
  left: props.node.position.x + 'px',
  top: props.node.position.y + 'px',
  width: props.node.position.w + 'px',
  height: props.node.position.h + 'px',
  ...(props.node.style || {}),
}));

function onNodeMouseDown(ev: MouseEvent, id: string) {
  if (state.preview) return;
  // Ctrl/Cmd + 按下：切换选中（多选），不启动拖动
  if (ev.ctrlKey || ev.metaKey) {
    ev.stopPropagation();
    selectToggle(id);
    return;
  }
  startMove(ev, id);
}
function onNodeClick(ev: MouseEvent, id: string) {
  // Ctrl 切换已在 mousedown 处理，click 不再覆盖选择
  if (ev.ctrlKey || ev.metaKey) return;
  selectOnly(id);
}

// 越界检测：节点超出画布范围（编辑态高亮，便于在画布上直接发现）
const canvasSize = computed(() => state.config.canvas ?? { width: 1920, height: 1080 });
const outOfBounds = computed(() => {
  if (state.preview) return false;
  const p = props.node.position;
  return p.x < -0.5 || p.y < -0.5 || p.x + p.w > canvasSize.value.width + 0.5 || p.y + p.h > canvasSize.value.height + 0.5;
});
</script>

<template>
  <div
    class="cg-node"
    :data-node-id="node.id"
    :class="{
      selected: isSelected(node.id),
      hidden: node.visible === false,
      locked: node.locked,
      'cg-node-container': isContainer,
      'cg-node-oob': outOfBounds,
    }"
    :style="style"
    @click.stop="onNodeClick($event, node.id)"
    @mousedown.stop="onNodeMouseDown($event, node.id)"
  >
    <MapNode v-if="node.type === 'map'" :node="node" />
    <DetailPanel v-else-if="node.type === 'detail-panel'" :node="node" />
    <DeviceList v-else-if="node.type === 'device-list'" :node="node" />
    <FilterTabs v-else-if="node.type === 'filter-tabs'" :node="node" />
    <StatusBar v-else-if="node.type === 'status-bar'" :node="node" />
    <!-- 设备图层：标记由地图节点统一渲染，此处仅编辑态占位（可选中配置），不再落到「待实现」兜底 -->
    <div v-else-if="node.type === 'device-layer' && !state.preview" class="cg-dl-placeholder">
      <span>设备图层 · 标记渲染于地图</span>
    </div>
    <ComponentView v-else :node="node" />

    <!-- 取数状态灯（仅非地图节点；地图节点由 MapNode 自管） -->
    <div
      v-if="showStatusDot"
      class="cg-node-status"
      :class="{ err: dataError, load: dataLoading }"
      :title="dataError || (dataLoading ? '数据加载中…' : '')"
    ></div>

    <!-- 容器子组件：相对容器绝对定位；标签页容器按归属 Tab 过滤 -->
    <template v-if="isContainer">
      <NodeView
        v-for="child in visibleChildren"
        :key="child.id"
        :node="child"
        :depth="(depth ?? 0) + 1"
      />
    </template>

    <div
      v-if="isSelected(node.id) && selectedIds.size === 1 && !node.locked && !state.preview"
      class="cg-resize-handle"
      @mousedown.stop="startResize($event, node.id)"
    ></div>
  </div>
</template>

<style scoped>
.cg-node {
  position: absolute; box-sizing: border-box; border: 1px dashed var(--cg-chrome, rgba(255, 255, 255, 0.18));
  border-radius: 4px; cursor: move; display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: border-color 0.15s;
}
.cg-node:hover { border-color: rgba(74, 222, 128, 0.5); }
.cg-node.selected { border: 2px solid #4ade80; box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.25); }
.cg-node.hidden { opacity: 0.35; }
.cg-node.locked { cursor: not-allowed; }
.cg-node-oob { border-color: #f87171 !important; box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.5), 0 0 10px rgba(248, 113, 113, 0.3); }
/* 容器：裁切子组件在卡片范围内；作为子组件定位上下文 */
.cg-node-container { overflow: hidden; }
.cg-resize-handle {
  position: absolute; right: -4px; bottom: -4px; width: 12px; height: 12px; background: #4ade80;
  border-radius: 3px; cursor: nwse-resize; border: 2px solid #060912;
}
/* 取数状态灯：右上角小角标 */
.cg-node-status {
  position: absolute; top: 4px; right: 4px; z-index: 30; width: 9px; height: 9px; border-radius: 50%;
  pointer-events: none; box-shadow: 0 0 6px currentColor;
}
.cg-node-status.load { background: #38bdf8; color: #38bdf8; animation: cg-blink 1s infinite; }
.cg-node-status.err { background: #f87171; color: #f87171; }
/* 设备图层编辑态占位：虚线框 + 弱提示 */
.cg-dl-placeholder {
  width: 100%; height: 100%; border: 1px dashed rgba(96, 165, 250, 0.28); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.cg-dl-placeholder span { font-size: 12px; color: #3f5a80; pointer-events: none; }
@keyframes cg-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
</style>
