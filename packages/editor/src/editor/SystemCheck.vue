<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useEditor } from '../store/useEditor';
import { useDataSources } from '../store/useDataSources';
import type { DataSource, EditorNode, MapLayer, Scene } from '../types';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { state } = useEditor();
const ds = useDataSources();

type CheckLevel = 'error' | 'warn' | 'info' | 'ok';
interface CheckItem {
  level: CheckLevel;
  group: string;
  title: string;
  detail?: string;
}

const items = ref<CheckItem[]>([]);
const checking = ref(false);
const connItems = ref<CheckItem[]>([]);
const connChecking = ref(false);

function isDataBound(n: { dataSourceId?: string; dataSource?: unknown }): boolean {
  return !!(n.dataSourceId || n.dataSource);
}
function hasFetchable(src: DataSource | undefined): boolean {
  if (!src) return false;
  return (
    src.staticData !== undefined ||
    !!src.url ||
    !!src.query ||
    !!src.source ||
    !!src.host ||
    src.type === 'postmessage' ||
    src.type === 'websocket'
  );
}

/** 静态体检：配置完整性 / 节点越界 / 数据源绑定一致性（不发起网络） */
function runStaticCheck() {
  const list: CheckItem[] = [];
  const cfg = state.config;
  const cw = cfg.canvas?.width ?? 1920;
  const ch = cfg.canvas?.height ?? 1080;
  const managed = ds.list.value;

  if (!Array.isArray(cfg.scenes) || cfg.scenes.length === 0) {
    list.push({ level: 'error', group: '配置', title: '没有场景', detail: '至少需有一个场景才能投放大屏。' });
  }

  let totalNodes = 0;
  const idSeen = new Map<string, string>();
  const danglingRefs: string[] = [];

  function walk(node: EditorNode, sceneTitle: string) {
    totalNodes++;
    // 重复 id
    if (idSeen.has(node.id)) {
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `重复节点 id：${node.id}`,
        detail: `同时出现在「${idSeen.get(node.id)}」与「${sceneTitle}」`,
      });
    } else {
      idSeen.set(node.id, sceneTitle);
    }
    // 越界
    const p = node.position || ({} as any);
    const x = p.x ?? 0;
    const y = p.y ?? 0;
    const w = p.w ?? 0;
    const h = p.h ?? 0;
    if (x < 0 || y < 0 || x + w > cw + 1 || y + h > ch + 1) {
      list.push({
        level: 'warn',
        group: '场景·' + sceneTitle,
        title: `节点越界：${node.type}（${node.id}）`,
        detail: `位置 ${Math.round(x)},${Math.round(y)} 尺寸 ${Math.round(w)}×${Math.round(h)}，画布 ${cw}×${ch}`,
      });
    }
    // 悬空数据源引用
    if (node.dataSourceId && !managed.some((m) => m.id === node.dataSourceId)) {
      danglingRefs.push(`${node.id}`);
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `悬空数据源引用：${node.type}`,
        detail: `节点 ${node.id} 引用 dataSourceId="${node.dataSourceId}"，但全局数据源中不存在`,
      });
    }
    // 有数据源但无可取数配置（内联）
    if (!node.dataSourceId && node.dataSource && !hasFetchable(node.dataSource)) {
      list.push({
        level: 'warn',
        group: '场景·' + sceneTitle,
        title: `数据源未配置：${node.type}`,
        detail: `节点 ${node.id} 的内联数据源缺少可取数内容（url/query/staticData 等）`,
      });
    }
    if (node.children) node.children.forEach((c) => walk(c, sceneTitle));
  }
  function walkLayer(l: MapLayer, sceneTitle: string) {
    totalNodes++;
    if (l.dataSourceId && !managed.some((m) => m.id === l.dataSourceId)) {
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `悬空数据源引用（图层）：${l.type}`,
        detail: `图层 ${l.id} 引用 dataSourceId="${l.dataSourceId}"，但全局数据源中不存在`,
      });
    }
    if (!l.dataSourceId && l.dataSource && !hasFetchable(l.dataSource)) {
      list.push({
        level: 'warn',
        group: '场景·' + sceneTitle,
        title: `数据源未配置（图层）：${l.type}`,
        detail: `图层 ${l.id} 的内联数据源缺少可取数内容`,
      });
    }
  }

  for (const s of cfg.scenes as Scene[]) {
    s.components?.forEach((c) => walk(c, s.title));
    s.layers?.forEach((l) => walkLayer(l, s.title));
    if (s.map?.tiles === 'tianditu') {
      list.push({
        level: 'info',
        group: '场景·' + s.title,
        title: '使用天地图底图',
        detail: '未配置天地图 Token 时底图会回退到内置暗色底图（可在「底图设置」中配置）。',
      });
    }
  }

  // 顶层统计
  list.unshift({
    level: 'ok',
    group: '概览',
    title: `共 ${cfg.scenes?.length ?? 0} 个场景 · ${totalNodes} 个节点 · ${managed.length} 个数据源`,
  });
  if (managed.length === 0) {
    list.push({ level: 'info', group: '配置', title: '尚未创建任何数据源', detail: '需要实时数据的组件请先通过「数据源」面板创建。' });
  }

  items.value = list;
}

/** 数据源连通性体检：逐个发起 test（含网络） */
async function runConnectionCheck() {
  connChecking.value = true;
  connItems.value = [];
  const out: CheckItem[] = [];
  for (const src of ds.list.value) {
    let res: { ok: boolean; message: string; count?: number };
    try {
      res = await ds.test(src);
    } catch (e) {
      res = { ok: false, message: '检查异常：' + (e as Error).message };
    }
    const isDb = (['mysql', 'dameng', 'influxdb', 'oceanbase', 'clickhouse'] as string[]).includes(src.type);
    let level: CheckItem['level'] = res.ok ? 'ok' : 'error';
    let detail = res.message;
    // 数据库类型：代理可达但返回 0 行 —— 可能是查询无结果，也可能是代理未真正执行查询
    if (res.ok && isDb && res.count === 0) {
      level = 'warn';
      detail = res.message + '（代理已响应但未返回数据：请确认查询语句正确，且后端代理确实连库执行而非空响应）';
    }
    out.push({
      level,
      group: '数据源',
      title: `${src.name}（${src.type}）`,
      detail,
    });
  }
  if (ds.list.value.length === 0) {
    out.push({ level: 'info', group: '数据源', title: '无数据源可检查' });
  }
  connItems.value = out;
  connChecking.value = false;
}

function onOpen() {
  runStaticCheck();
  connItems.value = [];
}
function onClose() {
  emit('close');
}

const counts = computed(() => {
  const c = { error: 0, warn: 0, info: 0, ok: 0 };
  for (const it of items.value) c[it.level]++;
  for (const it of connItems.value) c[it.level]++;
  return c;
});
const statusText = computed(() => {
  if (counts.value.error > 0) return { text: `${counts.value.error} 项错误`, cls: 's-error' };
  if (counts.value.warn > 0) return { text: `${counts.value.warn} 项警告`, cls: 's-warn' };
  return { text: '系统健康', cls: 's-ok' };
});

// 打开时自动跑静态检查；打开期间配置变化（增删节点/改数据源/移动越界）debounce 重算，保持结论实时
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCheck() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (props.open) runStaticCheck();
  }, 400);
}
watch(
  () => props.open,
  (v) => {
    if (v) onOpen();
    else if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  },
  { immediate: true }
);
watch(() => state.config, scheduleCheck, { deep: true });
</script>

<template>
  <div v-if="open" class="cg-sc-mask" @click.self="onClose">
    <aside class="cg-sc-drawer">
      <div class="cg-sc-head">
        <span class="cg-sc-title">✅ 系统检查</span>
        <button class="cg-sc-close" @click="onClose">×</button>
      </div>

      <div class="cg-sc-status" :class="statusText.cls">
        <span class="cg-sc-status-dot" />
        总体：{{ statusText.text }}
        <span class="cg-sc-counts">
          <span class="cc err" v-if="counts.error">错误 {{ counts.error }}</span>
          <span class="cc warn" v-if="counts.warn">警告 {{ counts.warn }}</span>
          <span class="cc info" v-if="counts.info">提示 {{ counts.info }}</span>
          <span class="cc ok" v-if="counts.ok">正常 {{ counts.ok }}</span>
        </span>
      </div>

      <div class="cg-sc-body">
        <div class="cg-sc-sec">
          <div class="cg-sc-sec-head">
            <span>配置与绑定体检</span>
            <button class="cg-sc-btn" @click="runStaticCheck">重新检查</button>
          </div>
          <div v-for="(it, i) in items" :key="'s' + i" class="cg-sc-item" :class="'lv-' + it.level">
            <span class="cg-sc-lv">{{ it.level === 'error' ? '✕' : it.level === 'warn' ? '!' : it.level === 'info' ? 'i' : '✓' }}</span>
            <div class="cg-sc-item-body">
              <div class="cg-sc-item-title">{{ it.title }} <span class="cg-sc-group">{{ it.group }}</span></div>
              <div v-if="it.detail" class="cg-sc-item-detail">{{ it.detail }}</div>
            </div>
          </div>
        </div>

        <div class="cg-sc-sec">
          <div class="cg-sc-sec-head">
            <span>数据源连通性</span>
            <button class="cg-sc-btn" :disabled="connChecking" @click="runConnectionCheck">
              {{ connChecking ? '检查中…' : '检查全部连接' }}
            </button>
          </div>
          <div v-if="connItems.length === 0" class="cg-sc-empty">点击「检查全部连接」测试每个数据源的可达性（会发起网络请求）。</div>
          <div v-for="(it, i) in connItems" :key="'c' + i" class="cg-sc-item" :class="'lv-' + it.level">
            <span class="cg-sc-lv">{{ it.level === 'error' ? '✕' : it.level === 'info' ? 'i' : '✓' }}</span>
            <div class="cg-sc-item-body">
              <div class="cg-sc-item-title">{{ it.title }}</div>
              <div v-if="it.detail" class="cg-sc-item-detail">{{ it.detail }}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.cg-sc-mask { position: fixed; inset: 0; z-index: 900; background: rgba(0, 0, 0, 0.4); display: flex; justify-content: flex-end; }
.cg-sc-drawer { width: 420px; max-width: 92vw; height: 100%; background: #0c1424; border-left: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; box-shadow: -20px 0 60px rgba(0, 0, 0, 0.5); }
.cg-sc-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.cg-sc-title { font-size: 14px; font-weight: 600; color: #e0e6f0; }
.cg-sc-close { background: none; border: none; color: #8b93a7; font-size: 22px; cursor: pointer; line-height: 1; }
.cg-sc-status { display: flex; align-items: center; gap: 8px; padding: 10px 18px; font-size: 13px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.cg-sc-status.s-ok { color: #4ade80; }
.cg-sc-status.s-warn { color: #fbbf24; }
.cg-sc-status.s-error { color: #f87171; }
.cg-sc-status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.cg-sc-counts { margin-left: auto; display: flex; gap: 6px; font-size: 11px; }
.cg-sc-counts .cc { padding: 2px 6px; border-radius: 4px; }
.cg-sc-counts .err { background: rgba(248, 113, 113, 0.16); color: #f87171; }
.cg-sc-counts .warn { background: rgba(251, 191, 36, 0.16); color: #fbbf24; }
.cg-sc-counts .info { background: rgba(96, 165, 250, 0.16); color: #93c5fd; }
.cg-sc-counts .ok { background: rgba(74, 222, 128, 0.16); color: #4ade80; }
.cg-sc-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
.cg-sc-sec { margin-bottom: 20px; }
.cg-sc-sec-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #93c5fd; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.cg-sc-btn { background: rgba(56, 189, 248, 0.16); border: 1px solid rgba(56, 189, 248, 0.4); color: #7dd3fc; border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
.cg-sc-btn:disabled { opacity: 0.5; cursor: default; }
.cg-sc-btn:hover:not(:disabled) { background: rgba(56, 189, 248, 0.28); }
.cg-sc-item { display: flex; gap: 10px; padding: 9px 10px; border-radius: 8px; margin-bottom: 6px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); }
.cg-sc-item.lv-error { border-color: rgba(248, 113, 113, 0.35); background: rgba(248, 113, 113, 0.06); }
.cg-sc-item.lv-warn { border-color: rgba(251, 191, 36, 0.3); background: rgba(251, 191, 36, 0.05); }
.cg-sc-item.lv-ok { border-color: rgba(74, 222, 128, 0.25); }
.cg-sc-lv { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-top: 1px; }
.cg-sc-item.lv-error .cg-sc-lv { background: #f87171; color: #2a0a0a; }
.cg-sc-item.lv-warn .cg-sc-lv { background: #fbbf24; color: #2a1d00; }
.cg-sc-item.lv-info .cg-sc-lv { background: #60a5fa; color: #04122e; }
.cg-sc-item.lv-ok .cg-sc-lv { background: #4ade80; color: #06281a; }
.cg-sc-item-title { font-size: 13px; color: #e0e6f0; }
.cg-sc-group { font-size: 11px; color: #6b7494; margin-left: 6px; }
.cg-sc-item-detail { font-size: 11px; color: #8b93a7; margin-top: 3px; line-height: 1.5; word-break: break-all; }
.cg-sc-empty { font-size: 12px; color: #6b7494; padding: 8px 2px; }
</style>
