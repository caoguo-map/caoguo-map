import { reactive, computed, ref, watch } from 'vue';
import type { DashboardConfig, Scene, ComponentNode, MapLayer, EditorNode } from '../types';
import { createComponent, createLayer, genId } from '../components';
import { useDeviceStore } from './useDeviceStore';

/**
 * 编辑器全局状态 store（单例）
 * 负责管理：当前大屏配置、当前场景、画布缩放/网格、选中 id 等。
 * 注意：本 store 仅维护可序列化的配置；撤销/重做由 useHistory 包裹。
 */

function createEmptyConfig(): DashboardConfig {
  const firstScene: Scene = {
    key: genId('scene'),
    title: '新建场景',
    map: { center: [114.31, 30.59], zoom: 12, tiles: 'tianditu', theme: 'dark' },
    layers: [],
    components: [],
  };
  return {
    version: '1.0',
    theme: 'dark',
    canvas: { width: 1920, height: 1080, background: '#0a0e1a' },
    scenes: [firstScene],
  };
}

const state = reactive({
  config: createEmptyConfig() as DashboardConfig,
  activeSceneKey: '' as string,
  /** 画布缩放比例 0.5 - 2 */
  zoom: 1,
  /** 网格对齐像素 */
  gridSize: 10,
  /** 是否开启网格吸附 */
  snapToGrid: true,
  /** 预览模式 */
  preview: false,
});

/** 场景切换历史栈（用于下钻后的「返回」导航）；栈顶为当前场景下钻来源 */
const sceneHistory: string[] = [];

// 初始化 activeSceneKey
state.activeSceneKey = state.config.scenes[0]?.key ?? '';

const activeScene = computed<Scene | undefined>(() =>
  state.config.scenes.find((s) => s.key === state.activeSceneKey),
);

/** 所有可渲染节点（layers + components），按 z 顺序（数组顺序即 z-index） */
const nodes = computed<EditorNode[]>(() => {
  const scene = activeScene.value;
  if (!scene) return [];
  return [...scene.layers, ...scene.components];
});

/** 选中集合（多选，PRD 3.2 Ctrl+点击/框选）；selectedId 为主选中（最后加入者），保持单选语义兼容 */
const selectedIds = ref<Set<string>>(new Set());
const selectedId = computed<string | null>({
  get: () => {
    let last: string | null = null;
    selectedIds.value.forEach((id) => (last = id));
    return last;
  },
  set: (v) => {
    selectedIds.value = v ? new Set([v]) : new Set();
  },
});
function selectOnly(id: string) {
  selectedIds.value = new Set([id]);
}
function selectToggle(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
}
function setSelection(ids: Iterable<string>) {
  selectedIds.value = new Set(ids);
}
function clearSelection() {
  selectedIds.value = new Set();
}
const selectedNode = computed<EditorNode | undefined>(() => findNode(selectedId.value ?? '')?.node);

/** 递归遍历场景全部节点（含容器 children），回调收到节点与其所在数组 */
function walkScene(cb: (node: EditorNode, arr: EditorNode[]) => void) {
  const scene = activeScene.value;
  if (!scene) return;
  const rec = (arr: EditorNode[]) => {
    for (const n of arr) {
      cb(n, arr);
      if (n.children) rec(n.children as EditorNode[]);
    }
  };
  rec(scene.layers as EditorNode[]);
  rec(scene.components as EditorNode[]);
}

/** 递归查找节点，返回节点与其父数组（用于删除/层级调整） */
function findNode(id: string): { node: EditorNode; arr: EditorNode[] } | undefined {
  if (!id) return undefined;
  let found: { node: EditorNode; arr: EditorNode[] } | undefined;
  walkScene((node, arr) => {
    if (!found && node.id === id) found = { node, arr };
  });
  return found;
}

/** 扁平化所有节点（含 children），用于命中检测等 */
const allNodes = computed<EditorNode[]>(() => {
  const out: EditorNode[] = [];
  walkScene((n) => out.push(n));
  return out;
});

// 选中设备（点击地图 marker / 列表项设置，详情面板联动）
const { store: deviceStore, setSelectedDevice } = useDeviceStore();
const selectedDeviceId = computed(() => deviceStore.selectedDeviceId);

// 设备选中联动（PRD trigger='device-click'）：选中设备 → 显示详情面板；取消选中 → 隐藏
// flush:'sync' 保证选中后立即生效（无渲染帧延迟）
watch(
  selectedDeviceId,
  (id) => {
    const scene = activeScene.value;
    if (!scene) return;
    for (const c of scene.components) {
      if (c.trigger === 'device-click') c.visible = id != null;
    }
  },
  { flush: 'sync' },
);

/** 非持久化 UI 状态：标签页容器当前激活页（key=节点 id） */
const uiTabs = reactive<Record<string, number>>({});
function setTab(nodeId: string, index: number) {
  uiTabs[nodeId] = index;
}

function setConfig(config: DashboardConfig) {
  state.config = config;
  state.activeSceneKey = config.scenes[0]?.key ?? '';
  selectedId.value = null;
}

function switchScene(key: string, record = true) {
  if (key === state.activeSceneKey) return;
  // 仅交互式下钻（record=true）才入栈；轮播/初始化/编辑切换不污染返回链
  if (record && sceneHistory[sceneHistory.length - 1] !== state.activeSceneKey) {
    sceneHistory.push(state.activeSceneKey);
  }
  state.activeSceneKey = key;
  selectedId.value = null;
}

/** 从下钻目标返回上一级场景（栈顶）。无历史时回到首个场景。 */
function goBackScene(): string | null {
  if (sceneHistory.length === 0) return null;
  const prev = sceneHistory.pop()!;
  state.activeSceneKey = prev;
  selectedId.value = null;
  return prev;
}

/** 当前是否存在可返回的上级场景 */
const canGoBack = () => sceneHistory.length > 0;

function addScene(title = '新场景') {
  const scene: Scene = {
    key: genId('scene'),
    title,
    map: { center: [114.31, 30.59], zoom: 12, tiles: 'tianditu', theme: 'dark' },
    layers: [],
    components: [],
  };
  state.config.scenes.push(scene);
  state.activeSceneKey = scene.key;
  return scene;
}

/** 拖入组件；parentId 非空则嵌套进容器（x/y 为相对容器坐标） */
function addComponent(type: string, x: number, y: number, parentId?: string): ComponentNode | null {
  const scene = activeScene.value;
  if (!scene) return null;
  const node = createComponent(type, x, y);
  if (!node) return null;
  if (parentId) {
    const parent = findNode(parentId)?.node;
    if (parent) {
      (parent.children ||= []).push(node);
      selectedId.value = node.id;
      return node;
    }
  }
  scene.components.push(node);
  selectedId.value = node.id;
  return node;
}

/** 拖入图层 */
function addLayer(type: string): MapLayer | null {
  const scene = activeScene.value;
  if (!scene) return null;
  const layer = createLayer(type);
  if (!layer) return null;
  scene.layers.push(layer);
  selectedId.value = layer.id;
  return layer;
}

/** 删除节点（递归：场景层/组件或任意容器内的子组件） */
function removeNode(id: string) {
  const scene = activeScene.value;
  if (!scene) return;
  scene.layers = scene.layers.filter((l) => l.id !== id);
  scene.components = scene.components.filter((c) => c.id !== id);
  walkScene((node, arr) => {
    if (node.children) node.children = node.children.filter((c) => c.id !== id);
  });
  if (selectedIds.value.has(id)) {
    const next = new Set(selectedIds.value);
    next.delete(id);
    selectedIds.value = next;
  }
}

/** 更新节点位置（递归查找，兼容嵌套子组件） */
function updatePosition(id: string, pos: Partial<{ x: number; y: number; w: number; h: number }>) {
  const node = findNode(id)?.node;
  if (!node) return;
  Object.assign(node.position, pos);
}

/** 层级上移（往父数组末尾方向移动，z 更高） */
function bringForward(id: string) {
  const hit = findNode(id);
  if (!hit) return;
  const arr = hit.arr;
  const idx = arr.findIndex((n) => n.id === id);
  if (idx >= 0 && idx < arr.length - 1) {
    const [n] = arr.splice(idx, 1);
    arr.splice(idx + 1, 0, n);
  }
}

/** 层级下移 */
function sendBackward(id: string) {
  const hit = findNode(id);
  if (!hit) return;
  const arr = hit.arr;
  const idx = arr.findIndex((n) => n.id === id);
  if (idx > 0) {
    const [n] = arr.splice(idx, 1);
    arr.splice(idx - 1, 0, n);
  }
}

function toggleVisible(id: string) {
  const node = findNode(id)?.node;
  if (node) node.visible = !node.visible;
}

function toggleLocked(id: string) {
  const node = findNode(id)?.node;
  if (node) node.locked = !node.locked;
}

/** 批量设置所有节点显隐 */
function setAllVisible(visible: boolean) {
  walkScene((n) => (n.visible = visible));
}
/** 批量设置所有节点锁定 */
function setAllLocked(locked: boolean) {
  walkScene((n) => (n.locked = locked));
}

/** 导出/投放产物中必须剔除的敏感字段（数据库密码等不进入大屏 JSON） */
const SENSITIVE_SOURCE_KEYS = ['password'] as const;

/** 剔除数据源中的敏感字段（不改动原对象） */
function sanitizeDataSource<T>(ds: T): T {
  if (!ds || typeof ds !== 'object' || !('password' in ds)) return ds;
  const { password, ...rest } = ds as T & Record<string, unknown>;
  void password;
  return rest as T;
}

/**
 * 导出 JSON 字符串。
 * - 默认剔除运行时配置（proxyBase）与敏感字段（数据库密码），避免泄漏到大屏产物；
 * - `includeSecrets: true` 保留敏感字段（仅供编辑器本地草稿使用，注意 localStorage 安全边界）。
 */
function exportJSON(options: { includeSecrets?: boolean } = {}): string {
  const { proxyBase, ...clean } = state.config as DashboardConfig & { proxyBase?: string };
  void proxyBase;
  if (!options.includeSecrets && Array.isArray(clean.dataSources)) {
    clean.dataSources = clean.dataSources.map((d) => sanitizeDataSource(d));
  }
  return JSON.stringify(clean, null, 2);
}

/** 缩放控制 */
function setZoom(z: number) {
  state.zoom = Math.min(2, Math.max(0.5, z));
}

export function useEditor() {
  return {
    state,
    activeScene,
    nodes,
    allNodes,
    selectedId,
    selectedIds,
    selectedNode,
    selectOnly,
    selectToggle,
    setSelection,
    clearSelection,
    selectedDeviceId,
    findNode,
    setSelectedDevice,
    setConfig,
    switchScene,
    goBackScene,
    canGoBack,
    sceneHistory,
    addScene,
    addComponent,
    addLayer,
    removeNode,
    updatePosition,
    bringForward,
    sendBackward,
    toggleVisible,
    toggleLocked,
    setAllVisible,
    setAllLocked,
    exportJSON,
    setZoom,
    uiTabs,
    setTab,
    createEmptyConfig,
  };
}
