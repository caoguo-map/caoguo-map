<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { useEditor } from '../store/useEditor';
import { onCanvasDrop, useDragDrop } from '../store/useDragDrop';
import NodeView from './NodeView.vue';

const { state, nodes, selectedId, selectedIds, setSelection, clearSelection } = useEditor();
const { guides } = useDragDrop();
const canvasRef = ref<HTMLElement | null>(null);

const canvasStyle = computed(() => ({
  width: state.config.canvas.width + 'px',
  height: state.config.canvas.height + 'px',
  // 亮色主题且用户未自定义背景时，自动切换为浅色底（否则保留用户配置）
  background:
    state.config.theme === 'light' && state.config.canvas.background === '#0a0e1a'
      ? '#f1f5f9'
      : state.config.canvas.background,
  transform: `scale(${state.zoom})`,
  transformOrigin: 'top left',
}));

// 亮色主题：为画布内组件提供 CSS 变量 token（ComponentView/NodeView 消费）
const themeClass = computed(() => (state.config.theme === 'light' ? 'light' : ''));

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

// ── 框选（marquee）：空白处按下拖动画矩形，选中矩形相交的顶层节点 ──
const marquee = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
let marqueeAppend = false;
let marqueeStartDist = 0;

function onCanvasMouseDown(ev: MouseEvent) {
  if (state.preview || ev.button !== 0 || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const zoom = state.zoom;
  const x = (ev.clientX - rect.left) / zoom;
  const y = (ev.clientY - rect.top) / zoom;
  marqueeAppend = ev.ctrlKey || ev.metaKey || ev.shiftKey;
  marquee.value = { x0: x, y0: y, x1: x, y1: y };
  marqueeStartDist = 0;
  if (!marqueeAppend) clearSelection();
  window.addEventListener('mousemove', onMarqueeMove);
  window.addEventListener('mouseup', onMarqueeUp);
}

function onMarqueeMove(ev: MouseEvent) {
  if (!marquee.value || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const zoom = state.zoom;
  marquee.value.x1 = (ev.clientX - rect.left) / zoom;
  marquee.value.y1 = (ev.clientY - rect.top) / zoom;
  marqueeStartDist = Math.max(
    Math.abs(marquee.value.x1 - marquee.value.x0),
    Math.abs(marquee.value.y1 - marquee.value.y0),
  );
}

function onMarqueeUp() {
  window.removeEventListener('mousemove', onMarqueeMove);
  window.removeEventListener('mouseup', onMarqueeUp);
  const m = marquee.value;
  marquee.value = null;
  // 位移过小视为点击空白（已清除选中），不做框选
  if (!m || marqueeStartDist < 4) return;
  const left = Math.min(m.x0, m.x1);
  const right = Math.max(m.x0, m.x1);
  const top = Math.min(m.y0, m.y1);
  const bottom = Math.max(m.y0, m.y1);
  const hit: string[] = [];
  for (const n of nodes.value) {
    if (n.locked || n.visible === false) continue;
    if (n.position.x < right && n.position.x + n.position.w > left && n.position.y < bottom && n.position.y + n.position.h > top) {
      hit.push(n.id);
    }
  }
  const base = marqueeAppend ? new Set(selectedIds.value) : new Set<string>();
  for (const id of hit) base.add(id);
  setSelection(base);
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMarqueeMove);
  window.removeEventListener('mouseup', onMarqueeUp);
});
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
      <div
        ref="canvasRef"
        class="cg-canvas"
        :class="themeClass"
        :style="[canvasStyle, gridStyle]"
        @click="onCanvasClick"
        @mousedown="onCanvasMouseDown"
      >
        <NodeView v-for="node in nodes" :key="node.id" :node="node" />
        <!-- 对齐参考线（拖动时） -->
        <template v-if="!state.preview">
          <div v-for="(x, i) in guides.x" :key="'gx' + i" class="cg-guide cg-guide-v" :style="{ left: x + 'px' }" />
          <div v-for="(y, i) in guides.y" :key="'gy' + i" class="cg-guide cg-guide-h" :style="{ top: y + 'px' }" />
        </template>
        <!-- 框选矩形 -->
        <div
          v-if="marquee && !state.preview"
          class="cg-marquee"
          :style="{
            left: Math.min(marquee.x0, marquee.x1) + 'px',
            top: Math.min(marquee.y0, marquee.y1) + 'px',
            width: Math.abs(marquee.x1 - marquee.x0) + 'px',
            height: Math.abs(marquee.y1 - marquee.y0) + 'px',
          }"
        />
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
.cg-canvas {
  position: relative; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 10px 40px rgba(0, 0, 0, 0.5);
  /* 主题 token：画布内组件统一消费（亮色由 .light 覆盖） */
  --cg-panel: rgba(255, 255, 255, 0.03);
  --cg-panel-border: rgba(255, 255, 255, 0.12);
  --cg-text: #e0e6f0;
  --cg-text-sub: #8b93a7;
  --cg-ph: #6b7280;
  --cg-grid: rgba(255, 255, 255, 0.08);
  --cg-chrome: rgba(255, 255, 255, 0.18);
}
.cg-canvas.light {
  --cg-panel: rgba(15, 23, 42, 0.04);
  --cg-panel-border: rgba(15, 23, 42, 0.16);
  --cg-text: #1e293b;
  --cg-text-sub: #64748b;
  --cg-ph: #94a3b8;
  --cg-grid: rgba(15, 23, 42, 0.12);
  --cg-chrome: rgba(15, 23, 42, 0.25);
}
.cg-canvas-wrap.preview .cg-canvas { box-shadow: none; }
/* 框选矩形 */
.cg-marquee {
  position: absolute; z-index: 40; pointer-events: none;
  border: 1px solid rgba(74, 222, 128, 0.9); background: rgba(74, 222, 128, 0.12);
}
/* 对齐参考线 */
.cg-guide { position: absolute; z-index: 41; pointer-events: none; background: #f472b6; }
.cg-guide-v { top: 0; bottom: 0; width: 1px; margin-left: -0.5px; }
.cg-guide-h { left: 0; right: 0; height: 1px; margin-top: -0.5px; }
</style>
