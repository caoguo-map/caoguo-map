import { ref } from 'vue';
import { useEditor } from './useEditor';
import { useHistory } from './useHistory';

/**
 * 拖拽 composable
 * - 从组件面板拖入画布：dragstart 设置 dataTransfer 的组件 type
 * - 画布内移动 / 缩放：mousedown 记录起点，mousemove 计算增量（除以 zoom）
 */

export interface DragState {
  mode: 'move' | 'resize' | null;
  id: string | null;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

const drag = ref<DragState>({
  mode: null,
  id: null,
  startX: 0,
  startY: 0,
  origX: 0,
  origY: 0,
  origW: 0,
  origH: 0,
});

let editor: ReturnType<typeof useEditor> | null = null;
let history: ReturnType<typeof useHistory> | null = null;

function ensure() {
  if (!editor) editor = useEditor();
  if (!history) history = useHistory();
  return { e: editor, h: history };
}

/** 从面板拖拽开始（原生 HTML5 drag） */
export function onPanelDragStart(ev: DragEvent, type: string) {
  ev.dataTransfer?.setData('application/x-caoguo-component', type);
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
}

function isContainerType(t: string) {
  return ['card-container', 'transparent-container', 'tab-container'].includes(t);
}

/** 命中测试：返回包含 (x,y) 且面积最小（最内层）的容器节点及其全局坐标 */
function findContainerAt(x: number, y: number): { node: any; gx: number; gy: number } | null {
  const e = editor!;
  let best: { node: any; gx: number; gy: number } | null = null;
  const rec = (arr: any[], ox: number, oy: number) => {
    for (const n of arr) {
      const gx = ox + n.position.x;
      const gy = oy + n.position.y;
      if (
        isContainerType(n.type) &&
        !n.locked &&
        x >= gx && y >= gy && x <= gx + n.position.w && y <= gy + n.position.h
      ) {
        const area = n.position.w * n.position.h;
        if (!best || area < best.node.position.w * best.node.position.h) best = { node: n, gx, gy };
      }
      if (n.children) rec(n.children, gx, gy);
    }
  };
  const scene = e.activeScene.value;
  if (scene) {
    rec(scene.layers as any[], 0, 0);
    rec(scene.components as any[], 0, 0);
  }
  return best;
}

/** 画布接收拖放 */
export function onCanvasDrop(ev: DragEvent, canvasEl: HTMLElement) {
  const { e, h } = ensure();
  const type = ev.dataTransfer?.getData('application/x-caoguo-component');
  if (!type) return;
  const rect = canvasEl.getBoundingClientRect();
  // 屏幕坐标 → 画布坐标（除以 zoom，z 为画布内容相对容器的偏移）
  const zoom = e.state.zoom;
  let x = (ev.clientX - rect.left) / zoom;
  let y = (ev.clientY - rect.top) / zoom;
  if (e.state.snapToGrid) {
    const g = e.state.gridSize;
    x = Math.round(x / g) * g;
    y = Math.round(y / g) * g;
  }
  const hit = findContainerAt(x, y);
  h.commit();
  if (hit) e.addComponent(type, x - hit.gx, y - hit.gy, hit.node.id);
  else e.addComponent(type, x, y);
}

/** 画布内按下：开始移动节点 */
export function startMove(ev: MouseEvent, id: string) {
  const { e } = ensure();
  const node = e.findNode(id)?.node;
  if (!node || node.locked) return;
  e.selectedId.value = id;
  drag.value = {
    mode: 'move',
    id,
    startX: ev.clientX,
    startY: ev.clientY,
    origX: node.position.x,
    origY: node.position.y,
    origW: node.position.w,
    origH: node.position.h,
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', stop);
}

/** 画布内按下：开始缩放节点 */
export function startResize(ev: MouseEvent, id: string) {
  ev.stopPropagation();
  const { e } = ensure();
  const node = e.findNode(id)?.node;
  if (!node || node.locked) return;
  drag.value = {
    mode: 'resize',
    id,
    startX: ev.clientX,
    startY: ev.clientY,
    origX: node.position.x,
    origY: node.position.y,
    origW: node.position.w,
    origH: node.position.h,
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', stop);
}

function onMove(ev: MouseEvent) {
  const { e } = ensure();
  const d = drag.value;
  if (!d.mode || !d.id) return;
  const zoom = e.state.zoom;
  const dx = (ev.clientX - d.startX) / zoom;
  const dy = (ev.clientY - d.startY) / zoom;
  if (d.mode === 'move') {
    let nx = d.origX + dx;
    let ny = d.origY + dy;
    if (e.state.snapToGrid) {
      const g = e.state.gridSize;
      nx = Math.round(nx / g) * g;
      ny = Math.round(ny / g) * g;
    }
    e.updatePosition(d.id, { x: nx, y: ny });
  } else if (d.mode === 'resize') {
    e.updatePosition(d.id, {
      w: Math.max(20, d.origW + dx),
      h: Math.max(20, d.origH + dy),
    });
  }
}

let committed = false;
function stop() {
  const { h } = ensure();
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('mouseup', stop);
  if (drag.value.mode && !committed) {
    h.commit();
  }
  committed = false;
  drag.value = { mode: null, id: null, startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0 };
}

export function useDragDrop() {
  return { drag, onPanelDragStart, onCanvasDrop, startMove, startResize };
}
