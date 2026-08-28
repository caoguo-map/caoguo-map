<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useEditor } from '../store/useEditor';
import { useHistory } from '../store/useHistory';
import { TEMPLATES } from '../templates';
import { setGlobalConfig, getGlobalConfig } from '@caoguo/maplibre';
import type { DashboardConfig } from '../types';
import DataSourceManager from './DataSourceManager.vue';
import SystemCheck from './SystemCheck.vue';

const { state, activeScene, switchScene, addScene, exportJSON, setConfig, addLayer } = useEditor();
const { undo, redo, canUndo, canRedo, commit } = useHistory();

// ── 自动保存：编辑操作实时写入 localStorage，并启动时恢复草稿 ──
const DRAFT_KEY = 'caoguo-dashboard-draft';
const lastSaved = ref<string | null>(null);
let saveTimer: number | undefined;
function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
function persistNow() {
  try {
    localStorage.setItem(DRAFT_KEY, exportJSON({ includeSecrets: true }));
    const d = new Date();
    lastSaved.value = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    /* 存储失败忽略 */
  }
}
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persistNow, 600);
}
function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const cfg = JSON.parse(raw) as DashboardConfig;
    if (cfg && Array.isArray(cfg.scenes) && cfg.scenes.length) {
      setConfig(cfg);
      const d = new Date();
      lastSaved.value = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  } catch {
    /* 草稿损坏忽略 */
  }
}
onMounted(() => {
  restoreDraft();
  persistNow(); // 确保存在草稿基线，刷新即可恢复
  // deep watch 最可靠地追踪任意嵌套改动（含 children）
  watch(() => state.config, scheduleSave, { deep: true });
  window.addEventListener('beforeunload', persistNow);
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', persistNow));


// 数据源管理抽屉
const showDataSources = ref(false);
// 系统检查抽屉
const showSystemCheck = ref(false);

// 天地图 token 设置弹窗
const showToken = ref(false);
const tokenInput = ref(getGlobalConfig()?.tiandituToken ?? '');
function onOpenToken() {
  tokenInput.value = getGlobalConfig()?.tiandituToken ?? '';
  showToken.value = true;
}
function onSaveToken() {
  setGlobalConfig({ tiandituToken: tokenInput.value.trim() || undefined });
  showToken.value = false;
}

function onUseTemplate(key: string) {
  const tpl = TEMPLATES.find((t) => t.key === key);
  if (!tpl) return;
  if (!confirm(`使用模板「${tpl.title}」将替换当前画布内容，确定？`)) return;
  commit();
  setConfig(tpl.build());
}

const fileInput = ref<HTMLInputElement | null>(null);

function onExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-${activeScene.value?.key ?? 'config'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 投放大屏：导出配置为 base64，新窗口打开独立大屏页（无编辑 chrome）
function onCast() {
  const json = exportJSON();
  const b64 = window.btoa(unescape(encodeURIComponent(json)));
  const url = `${location.pathname}?screen=1&data=${encodeURIComponent(b64)}`;
  window.open(url, '_blank');
}

function onImportClick() { fileInput.value?.click(); }
function onImport(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const cfg = JSON.parse(String(reader.result)) as DashboardConfig;
      commit();
      setConfig(cfg);
    } catch (e) {
      alert('JSON 解析失败：' + (e as Error).message);
    }
  };
  reader.readAsText(file);
  (ev.target as HTMLInputElement).value = '';
}

function onSave() {
  // 本地保存（localStorage，保留密钥）+ 触发导出（脱敏产物）
  localStorage.setItem('caoguo-dashboard-draft', exportJSON({ includeSecrets: true }));
  onExport();
}

function onUndo() { undo(); }
function onRedo() { redo(); }
function onPreview() { state.preview = !state.preview; }
function onAddScene() { const t = prompt('场景名称', '新场景'); if (t) addScene(t); }
function onAddMapLayer() { commit(); addLayer('map'); }
</script>

<template>
  <header class="cg-toolbar">
    <div class="cg-brand">🗺️ 草果地图编辑器</div>

    <select class="cg-scene-sel" :value="state.activeSceneKey" @change="switchScene(($event.target as HTMLSelectElement).value)">
      <option v-for="s in state.config.scenes" :key="s.key" :value="s.key">{{ s.title }}</option>
    </select>
    <button class="cg-btn" @click="onAddScene">+ 场景</button>
    <button class="cg-btn" @click="onAddMapLayer">+ 地图</button>
    <select class="cg-scene-sel" @change="onUseTemplate(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
      <option value="">使用模板…</option>
      <option v-for="t in TEMPLATES" :key="t.key" :value="t.key">{{ t.icon }} {{ t.title }}</option>
    </select>

    <div class="cg-spacer"></div>

    <button class="cg-btn" :disabled="!canUndo()" @click="onUndo">↶ 撤销</button>
    <button class="cg-btn" :disabled="!canRedo()" @click="onRedo">↷ 重做</button>
    <button class="cg-btn" @click="onImportClick">导入</button>
    <button class="cg-btn" @click="onExport">导出JSON</button>
    <button class="cg-btn primary" @click="onSave">保存</button>
    <span class="cg-autosave" :title="lastSaved ? '已自动保存到本地：' + lastSaved : '操作将自动保存'">
      <span class="cg-autosave-dot"></span>{{ lastSaved ? '已自动保存 ' + lastSaved : '自动保存中…' }}
    </span>
    <button class="cg-btn" :class="{ active: state.preview }" @click="onPreview">{{ state.preview ? '退出预览' : '预览' }}</button>
    <button class="cg-btn primary" @click="onCast">投放大屏</button>
    <button class="cg-btn" @click="onOpenToken">底图设置</button>
    <button class="cg-btn" :class="{ active: showDataSources }" @click="showDataSources = true">🗄️ 数据源</button>
    <button class="cg-btn" :class="{ active: showSystemCheck }" @click="showSystemCheck = true">✅ 系统检查</button>

    <input ref="fileInput" type="file" accept="application/json" style="display: none" @change="onImport" />
    <DataSourceManager :open="showDataSources" @close="showDataSources = false" />
    <SystemCheck :open="showSystemCheck" @close="showSystemCheck = false" />

    <div v-if="showToken" class="cg-modal-mask" @click.self="showToken = false">
      <div class="cg-modal">
        <div class="cg-modal-title">天地图 Token 设置</div>
        <p class="cg-modal-desc">
          用于渲染天地图底图（国内权威底图）。未配置时地图底图将回退到内置本地暗色底图（无需 token）。
          Token 仅保存在浏览器内存中，不会上传。
        </p>
        <input v-model="tokenInput" class="cg-token-input" placeholder="粘贴天地图 Token" />
        <div class="cg-modal-actions">
          <button class="cg-btn" @click="showToken = false">取消</button>
          <button class="cg-btn primary" @click="onSaveToken">保存</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.cg-toolbar {
  height: 48px; flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 0 14px;
  background: #111a2e; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.cg-brand { font-size: 14px; font-weight: 700; color: #4ade80; margin-right: 8px; white-space: nowrap; }
.cg-scene-sel {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); color: #e0e6f0;
  border-radius: 6px; padding: 5px 8px; font-size: 12px; outline: none; max-width: 160px;
}
.cg-spacer { flex: 1; }
.cg-btn {
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #cdd5e8;
  border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.cg-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); color: #fff; }
.cg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cg-btn.primary { background: #4ade80; color: #06281a; border-color: #4ade80; font-weight: 600; }
.cg-btn.primary:hover { background: #34d399; }
.cg-btn.active { background: #4ade80; color: #06281a; border-color: #4ade80; }
.cg-modal-mask {
  position: fixed; inset: 0; z-index: 1000; background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
}
.cg-modal {
  width: 360px; background: #111a2e; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px; padding: 18px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.cg-modal-title { font-size: 14px; font-weight: 600; color: #e0e6f0; margin-bottom: 8px; }
.cg-modal-desc { font-size: 12px; color: #8b93a7; line-height: 1.6; margin: 0 0 12px; }
.cg-token-input {
  width: 100%; box-sizing: border-box; background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12); color: #e0e6f0; border-radius: 6px;
  padding: 8px 10px; font-size: 12px; outline: none;
}
.cg-token-input:focus { border-color: #4ade80; }
.cg-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.cg-autosave {
  display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #8b93a7;
  white-space: nowrap; user-select: none;
}
.cg-autosave-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px #4ade80;
}
</style>
