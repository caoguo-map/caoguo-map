<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditor } from '../store/useEditor';
import { onCanvasDrop } from '../store/useDragDrop';
import NodeView from './NodeView.vue';

const { state, nodes, selectedId } = useEditor();
const canvasRef = ref<HTMLElement | null>(null);

const canvasStyle = computed(() => ({
  width: state.config.canvas.width + 'px',
  height: state.config.canvas.height + 'px',
  background: state.config.canvas.background,
  transform: `scale(${state.zoom})`,
  transformOrigin: 'top left',
}));

const gridStyle = computed(() => {
  if (!state.snapToGrid) return {};
  const g = state.gridSize * state.zoom;
  return {
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: `${g}px ${g}px`,
  };
});

function handleDrop(ev: DragEvent) {
  if (canvasRef.value) onCanvasDrop(ev, canvasRef.value);
}

// 预览/大屏模式：点击空白不清除选中（保留联动）
function onCanvasClick() {
  if (state.preview) return;
  selectedId.value = null;
}
</script>

<template>
  <div class="cg-canvas-wrap" :class="{ preview: state.preview }" @dragover.prevent="!state.preview" @drop="handleDrop">
    <div class="cg-canvas-scale" v-if="!state.preview">
      <button @click="state.zoom = Math.max(0.5, +(state.zoom - 0.1).toFixed(2))">−</button>
      <span>{{ Math.round(state.zoom * 100) }}%</span>
      <button @click="state.zoom = Math.min(2, +(state.zoom + 0.1).toFixed(2))">+</button>
      <label class="cg-snap"><input type="checkbox" v-model="state.snapToGrid" /> 网格</label>
    </div>

    <div class="cg-canvas-viewport">
      <div ref="canvasRef" class="cg-canvas" :style="[canvasStyle, gridStyle]" @click="onCanvasClick">
        <NodeView v-for="node in nodes" :key="node.id" :node="node" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cg-canvas-wrap { flex: 1; position: relative; overflow: auto; background: #060912; display: flex; flex-direction: column; }
.cg-canvas-scale {
  position: absolute; top: 12px; right: 16px; z-index: 10; display: flex; align-items: center; gap: 8px;
  background: rgba(13, 18, 32, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 4px 8px;
  font-size: 12px; color: #b8c0d4;
}
.cg-canvas-scale button {
  width: 22px; height: 22px; border-radius: 5px; border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04); color: #e0e6f0; cursor: pointer; font-size: 14px; line-height: 1;
}
.cg-canvas-scale button:hover { background: rgba(74, 222, 128, 0.15); }
.cg-snap { display: flex; align-items: center; gap: 4px; margin-left: 6px; }
.cg-canvas-viewport { flex: 1; padding: 40px; display: flex; }
.cg-canvas-wrap.preview .cg-canvas-viewport { padding: 0; }
.cg-canvas-wrap.preview { background: #04070f; }
.cg-canvas { position: relative; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 10px 40px rgba(0, 0, 0, 0.5); }
.cg-canvas-wrap.preview .cg-canvas { box-shadow: none; }
</style>
