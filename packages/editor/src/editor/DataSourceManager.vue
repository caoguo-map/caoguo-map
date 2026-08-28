<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDataSources } from '../store/useDataSources';
import { useHistory } from '../store/useHistory';
import { useEditor } from '../store/useEditor';
import type { DataSource, DataSourceType, ManagedDataSource } from '../types';
import DataSourceFields from './properties/DataSourceFields.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const ds = useDataSources();
const { commit } = useHistory();
const { state, setConfig } = useEditor();

const selectedId = ref<string | null>(null);
const editName = ref('');
const testResult = ref<{ ok: boolean; message: string } | null>(null);
const whMsg = ref<{ ok: boolean; text: string } | null>(null);

// 后端数据代理基地址（全局设置）
const proxyBaseInput = ref(state.config.proxyBase || 'http://localhost:8787');
function onSaveProxyBase() {
  const v = proxyBaseInput.value.trim();
  setConfig({ ...state.config, proxyBase: v || undefined });
  commit();
}

const selected = computed<ManagedDataSource | undefined>(() =>
  selectedId.value ? ds.get(selectedId.value) : undefined,
);

const typeLabel: Record<DataSourceType, string> = {
  static: 'JSON',
  excel: 'Excel',
  csv: 'CSV',
  rest: 'REST',
  websocket: 'WS',
  webhook: 'Hook',
  postmessage: 'PM',
  mysql: 'MySQL',
  dameng: '达梦',
  influxdb: 'Influx',
  oceanbase: 'OB',
  clickhouse: 'CK',
  binding: '绑定',
};

function onSelect(id: string) {
  selectedId.value = id;
  testResult.value = null;
  const item = ds.get(id);
  if (item) editName.value = item.name;
}

function onNew() {
  const name = '数据源 ' + (ds.list.value.length + 1);
  const created = ds.create(name, { type: 'static' });
  selectedId.value = created.id;
  editName.value = name;
  testResult.value = null;
}

function onNameChange() {
  if (selectedId.value) ds.update(selectedId.value, { name: editName.value });
}

/** Webhook：一键向后端登记接收端点，回填到 url */
async function onFetchWebhook() {
  if (!selectedId.value) return;
  whMsg.value = { ok: false, text: '获取中…' };
  const url = await ds.fetchWebhookUrl(selected.value?.name);
  if (url) {
    ds.update(selectedId.value, { url });
    whMsg.value = { ok: true, text: '已获取：' + url };
  } else {
    whMsg.value = { ok: false, text: '获取失败（后端未启动或不可达）' };
  }
}

function onPatch(part: Partial<DataSource>) {
  if (selectedId.value) ds.update(selectedId.value, part);
}

function onDelete() {
  if (!selectedId.value) return;
  if (!confirm('删除该数据源？引用它的组件将回退到内联配置。')) return;
  ds.remove(selectedId.value);
  selectedId.value = null;
  testResult.value = null;
}

async function onTest() {
  if (!selected.value) return;
  testResult.value = { ok: false, message: '测试中…' };
  testResult.value = await ds.test(selected.value);
}

function onClose() {
  emit('close');
}
</script>

<template>
  <div v-if="open" class="cg-ds-mask" @click.self="onClose">
    <aside class="cg-ds-drawer">
      <div class="cg-ds-head">
        <span class="cg-ds-title">🗄️ 数据源管理</span>
        <button class="cg-ds-close" @click="onClose">×</button>
      </div>

      <!-- 后端代理基地址（全局） -->
      <div class="cg-ds-proxy">
        <span class="cg-ds-proxy-label">后端代理</span>
        <input class="cg-ds-proxy-input" :value="proxyBaseInput" placeholder="http://localhost:8787" @input="proxyBaseInput = ($event.target as HTMLInputElement).value" />
        <button class="cg-ds-proxy-save" @click="onSaveProxyBase">保存</button>
      </div>

      <div class="cg-ds-body">
        <!-- 列表 -->
        <div class="cg-ds-list">
          <div class="cg-ds-list-head">
            <span>全部数据源 ({{ ds.list.value.length }})</span>
            <button class="cg-ds-add" @click="onNew">+ 新建</button>
          </div>
          <div v-if="ds.list.value.length === 0" class="cg-ds-empty">
            暂无数据源，点击「新建」添加。
          </div>
          <button
            v-for="item in ds.list.value"
            :key="item.id"
            class="cg-ds-item"
            :class="{ active: item.id === selectedId }"
            @click="onSelect(item.id)"
          >
            <span class="cg-ds-dot" :class="'t-' + item.type" />
            <span class="cg-ds-item-name">{{ item.name }}</span>
            <span class="cg-ds-badge">{{ typeLabel[item.type] }}</span>
          </button>
        </div>

        <!-- 编辑 -->
        <div class="cg-ds-edit">
          <template v-if="selected">
            <label class="cg-ds-name">
              <span>名称</span>
              <input :value="editName" @input="editName = ($event.target as HTMLInputElement).value; onNameChange()" />
            </label>

            <DataSourceFields :model-value="selected" @update:model-value="onPatch" />

            <!-- Webhook：一键获取接收地址 -->
            <div v-if="selected.type === 'webhook'" class="cg-ds-wh">
              <button class="cg-ds-wh-btn" @click="onFetchWebhook">🔗 一键获取接收地址</button>
              <span v-if="whMsg" class="cg-ds-wh-msg" :class="{ ok: whMsg.ok, bad: !whMsg.ok }">{{ whMsg.text }}</span>
              <div class="cg-ds-wh-hint">将生成的地址填到「Webhook 注册地址」，外部系统 POST 设备数组到此端点，组件自动轮询刷新。</div>
            </div>

            <div class="cg-ds-actions">
              <button class="cg-ds-btn" @click="onTest">测试连接</button>
              <button class="cg-ds-btn danger" @click="onDelete">删除</button>
            </div>

            <div v-if="testResult" class="cg-ds-test" :class="{ ok: testResult.ok, bad: !testResult.ok }">
              {{ testResult.ok ? '✓' : '✗' }} {{ testResult.message }}
            </div>
          </template>
          <div v-else class="cg-ds-empty">从左侧选择数据源，或新建一个。</div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.cg-ds-mask {
  position: fixed; inset: 0; z-index: 900; background: rgba(0, 0, 0, 0.45);
  display: flex; justify-content: flex-end;
}
.cg-ds-drawer {
  width: 640px; max-width: 92vw; height: 100%; background: #0d1220;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex; flex-direction: column; box-shadow: -16px 0 50px rgba(0, 0, 0, 0.5);
  animation: slide-in 0.22s ease;
}
@keyframes slide-in { from { transform: translateX(40px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
.cg-ds-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: #111a2e;
}
.cg-ds-title { font-size: 14px; font-weight: 600; color: #e0e6f0; }
.cg-ds-close { background: none; border: none; color: #8b93a7; font-size: 22px; cursor: pointer; line-height: 1; }
.cg-ds-proxy { display: flex; align-items: center; gap: 8px; padding: 10px 18px; background: #0f1830; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.cg-ds-proxy-label { font-size: 12px; color: #93c5fd; white-space: nowrap; }
.cg-ds-proxy-input { flex: 1; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); color: #e0e6f0; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none; min-width: 0; }
.cg-ds-proxy-save { background: rgba(56, 189, 248, 0.16); border: 1px solid rgba(56, 189, 248, 0.4); color: #7dd3fc; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; white-space: nowrap; }
.cg-ds-proxy-save:hover { background: rgba(56, 189, 248, 0.28); }
.cg-ds-close:hover { color: #fff; }
.cg-ds-body { flex: 1; display: flex; min-height: 0; }
.cg-ds-list { width: 220px; flex-shrink: 0; border-right: 1px solid rgba(255, 255, 255, 0.06); overflow-y: auto; padding: 10px; }
.cg-ds-list-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #8b93a7; margin-bottom: 8px; }
.cg-ds-add { background: #4ade80; color: #06281a; border: none; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; font-weight: 600; }
.cg-ds-item {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  background: transparent; border: 1px solid transparent; color: #cdd5e8;
  border-radius: 8px; padding: 8px 10px; font-size: 12px; cursor: pointer; margin-bottom: 4px; transition: all 0.15s;
}
.cg-ds-item:hover { background: rgba(255, 255, 255, 0.05); }
.cg-ds-item.active { background: rgba(74, 222, 128, 0.12); border-color: rgba(74, 222, 128, 0.4); }
.cg-ds-item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cg-ds-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: #6b7280; }
.cg-ds-dot.t-static { background: #94a3b8; }
.cg-ds-dot.t-rest { background: #4ade80; }
.cg-ds-dot.t-websocket { background: #38bdf8; }
.cg-ds-dot.t-binding { background: #fbbf24; }
.cg-ds-badge { font-size: 10px; color: #8b93a7; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 1px 5px; }
.cg-ds-edit { flex: 1; overflow-y: auto; padding: 16px 18px; }
.cg-ds-name { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; font-size: 12px; color: #b8c0d4; }
.cg-ds-name input {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e6f0; border-radius: 6px; padding: 7px 9px; font-size: 13px; outline: none;
}
.cg-ds-actions { display: flex; gap: 8px; margin-top: 16px; }
.cg-ds-btn { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: #cdd5e8; border-radius: 6px; padding: 7px 14px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
.cg-ds-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
.cg-ds-wh { margin: 14px 0 4px; }
.cg-ds-wh-btn { width: 100%; background: linear-gradient(90deg, #4ade80, #38bdf8); color: #06281a; border: none; border-radius: 8px; padding: 9px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
.cg-ds-wh-btn:hover { opacity: 0.9; }
.cg-ds-wh-msg { display: block; margin-top: 8px; font-size: 11px; word-break: break-all; }
.cg-ds-wh-msg.ok { color: #6ee7a8; }
.cg-ds-wh-msg.bad { color: #fca5a5; }
.cg-ds-wh-hint { margin-top: 8px; font-size: 11px; color: #6b7280; line-height: 1.5; }
.cg-ds-btn.danger { color: #fca5a5; border-color: rgba(248, 113, 113, 0.3); }
.cg-ds-btn.danger:hover { background: rgba(248, 113, 113, 0.15); }
.cg-ds-test { margin-top: 12px; font-size: 12px; padding: 8px 10px; border-radius: 6px; }
.cg-ds-test.ok { background: rgba(74, 222, 128, 0.12); color: #6ee7a8; }
.cg-ds-test.bad { background: rgba(248, 113, 113, 0.12); color: #fca5a5; }
.cg-ds-empty { color: #6b7280; font-size: 12px; padding: 20px 4px; }
</style>
