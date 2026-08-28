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
  /** 多选平移：本次拖动涉及的全部节点起始位置（key=节点 id） */
  origins: Map<string, { x: number; y: number }>;
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
  origins: new Map(),
});

/** 对齐参考线（拖动时显示，画布坐标）：x=竖线列表，y=横线列表 */
const guides = ref<{ x: number[]; y: number[] }>({ x: [], y: [] });
/** 参考线吸附阈值（画布 px） */
const SNAP_THRESHOLD = 5;

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

/** 画布内按下：开始移动节点（多选集合一起平移） */
export function startMove(ev: MouseEvent, id: string) {
  const { e } = ensure();
  const node = e.findNode(id)?.node;
  if (!node || node.locked) return;
  if (!(ev.ctrlKey || ev.metaKey)) e.selectOnly(id);
  // 收集拖动集合：当前选中 + 被按下节点（去锁）
  const ids = new Set<string>(e.selectedIds.value);
  ids.add(id);
  const origins = new Map<string, { x: number; y: number }>();
  for (const nid of ids) {
    const n = e.findNode(nid)?.node;
    if (n && !n.locked) origins.set(nid, { x: n.position.x, y: n.position.y });
  }
  drag.value = {
    mode: 'move',
    id,
    startX: ev.clientX,
    startY: ev.clientY,
    origX: node.position.x,
    origY: node.position.y,
    origW: node.position.w,
    origH: node.position.h,
    origins,
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
    origins: new Map(),
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', stop);
}

/** 收集候选对齐线（其他顶层节点的左/中/右、上/中/下） */
function collectCandidates(exclude: Set<string>): { vx: number[]; hy: number[] } {
  const { e } = ensure();
  const vx: number[] = [];
  const hy: number[] = [];
  const scene = e.activeScene.value;
  if (!scene) return { vx, hy };
  const add = (n: any) => {
    vx.push(n.position.x, n.position.x + n.position.w / 2, n.position.x + n.position.w);
    hy.push(n.position.y, n.position.y + n.position.h / 2, n.position.y + n.position.h);
  };
  for (const l of scene.layers) if (!exclude.has(l.id)) add(l);
  for (const c of scene.components) if (!exclude.has(c.id)) add(c);
  return { vx, hy };
}

/** 对齐吸附：返回吸附后的坐标与命中的参考线 */
function snapAxis(
  values: { v: number }[],
  candidates: number[],
): { v: number; line: number | null } {
  let best: { v: number; line: number | null; diff: number } | null = null;
  for (const { v } of values) {
    for (const c of candidates) {
      const diff = Math.abs(v - c);
      if (diff <= SNAP_THRESHOLD && (!best || diff < best.diff)) {
        best = { v: c, line: c, diff };
      }
    }
  }
  return best ? { v: best.v, line: best.line } : { v: values[0].v, line: null };
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
    const g = { x: [] as number[], y: [] as number[] };
    if (d.origins.size > 0) {
      // 对齐参考线吸附（对齐优先于网格吸附；仅单选拖动时启用，多选保持整体平移手感）
      if (d.origins.size === 1) {
        const w = d.origW;
        const h = d.origH;
        const { vx, hy } = collectCandidates(new Set(d.origins.keys()));
        const sx = snapAxis([{ v: nx }, { v: nx + w / 2 }, { v: nx + w }], vx);
        const sy = snapAxis([{ v: ny }, { v: ny + h / 2 }, { v: ny + h }], hy);
        if (sx.line != null) { nx = sx.v; g.x.push(sx.line); }
        if (sy.line != null) { ny = sy.v; g.y.push(sy.line); }
      }
      if (!g.x.length && e.state.snapToGrid) {
        const gs = e.state.gridSize;
        nx = Math.round(nx / gs) * gs;
      }
      if (!g.y.length && e.state.snapToGrid) {
        const gs = e.state.gridSize;
        ny = Math.round(ny / gs) * gs;
      }
      // 整体平移：主节点吸附后的偏移应用到全部选中节点
      const ddx = nx - d.origX;
      const ddy = ny - d.origY;
      for (const [nid, o] of d.origins) {
        e.updatePosition(nid, { x: o.x + ddx, y: o.y + ddy });
      }
      guides.value = g;
      return;
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
  guides.value = { x: [], y: [] };
  drag.value = { mode: null, id: null, startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0, origins: new Map() };
}

export function useDragDrop() {
  return { drag, guides, onPanelDragStart, onCanvasDrop, startMove, startResize };
}
