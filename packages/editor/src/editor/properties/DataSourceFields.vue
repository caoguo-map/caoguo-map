<script setup lang="ts">
import { computed } from 'vue';
import type { DataSource, DataSourceType } from '../../types';
import { STATIC_TYPES, API_TYPES, DB_TYPES, PROXY_TYPES } from '../../types';
import { parseDataFile, parseExcelBuffer } from '../../store/parseFile';

const props = defineProps<{ modelValue?: DataSource }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: DataSource): void }>();

const ds = computed<DataSource>({
  get: () => props.modelValue ?? { type: 'static' },
  set: (v) => emit('update:modelValue', v),
});

function patch(part: Partial<DataSource>) {
  ds.value = { ...ds.value, ...part };
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

const isStatic = computed(() => STATIC_TYPES.includes(ds.value.type));
const isProxy = computed(() => PROXY_TYPES.includes(ds.value.type));
const isDb = computed(() => DB_TYPES.includes(ds.value.type));
const isWs = computed(() => ds.value.type === 'websocket');
const isPostMsg = computed(() => ds.value.type === 'postmessage');

function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = async () => {
    const raw = reader.result as ArrayBuffer;
    // Excel 走动态加载的 parseExcelBuffer（xlsx 不进主包），CSV 走同步解析
    const { rows, error } = isExcel ? await parseExcelBuffer(raw) : parseDataFile(file.name, raw);
    patch({ fileName: file.name, fileData: btoa(new Uint8Array(raw).reduce((s, b) => s + String.fromCharCode(b), '')), staticData: error ? ds.value.staticData : rows });
    if (error) alert(error);
  };
  reader.readAsArrayBuffer(file);
}

const fileRows = computed(() => (Array.isArray(ds.value.staticData) ? ds.value.staticData.length : 0));
</script>

<template>
  <div class="cg-field-group">
    <label class="cg-field">
      <span>来源类型</span>
      <select :value="ds.type" @change="patch({ type: ($event.target as HTMLSelectElement).value as DataSourceType })">
        <optgroup label="静态数据源">
          <option v-for="t in STATIC_TYPES" :key="t" :value="t">
            {{ t === 'static' ? '静态 JSON' : t === 'excel' ? 'Excel' : 'CSV' }}
          </option>
        </optgroup>
        <optgroup label="接口">
          <option v-for="t in API_TYPES" :key="t" :value="t">
            {{ t === 'rest' ? 'API 接口 (REST)' : t === 'websocket' ? 'WebSocket' : t === 'webhook' ? 'Webhook' : 'PostMessage' }}
          </option>
        </optgroup>
        <optgroup label="数据库">
          <option v-for="t in DB_TYPES" :key="t" :value="t">
            {{ t === 'dameng' ? '达梦' : t === 'influxdb' ? 'InfluxDB' : t.toUpperCase() }}
          </option>
        </optgroup>
        <optgroup label="其他">
          <option value="binding">设备图层（绑定）</option>
        </optgroup>
      </select>
    </label>

    <!-- 静态 JSON -->
    <template v-if="ds.type === 'static'">
      <label class="cg-field">
        <span>静态数据(JSON)</span>
        <textarea :value="JSON.stringify(ds.staticData ?? {}, null, 2)" rows="4" @change="patch({ staticData: safeParse(($event.target as HTMLTextAreaElement).value) })" />
      </label>
    </template>

    <!-- Excel / CSV：上传文件 -->
    <template v-else-if="ds.type === 'excel' || ds.type === 'csv'">
      <label class="cg-field">
        <span>上传文件（{{ ds.type === 'excel' ? '.xlsx / .xls' : '.csv' }}）</span>
        <input type="file" :accept="ds.type === 'excel' ? '.xlsx,.xls' : '.csv'" @change="onFile" />
      </label>
      <div class="cg-field-hint">已解析 {{ fileRows }} 行{{ ds.fileName ? '（' + ds.fileName + '）' : '' }}</div>
      <label class="cg-field">
        <span>或粘贴 CSV 文本</span>
        <textarea rows="3" placeholder="name,status,lng,lat&#10;A,online,114.3,30.5" @change="patch({ staticData: parseDataFile('x.csv', ($event.target as HTMLTextAreaElement).value).rows })" />
      </label>
    </template>

    <!-- 接口类：rest / webhook -->
    <template v-else-if="ds.type === 'rest' || ds.type === 'webhook'">
      <label class="cg-field">
        <span>{{ ds.type === 'webhook' ? 'Webhook 注册地址' : '接口地址' }}</span>
        <input :value="ds.url ?? ''" :placeholder="ds.type === 'webhook' ? '/api/webhook/register' : '/api/devices'" @change="patch({ url: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="cg-field">
        <span>请求方式</span>
        <select :value="ds.method ?? 'GET'" @change="patch({ method: ($event.target as HTMLSelectElement).value as 'GET' | 'POST' })">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </label>
      <label class="cg-field">
        <span>刷新间隔</span>
        <select :value="ds.interval ?? 5000" @change="patch({ interval: Number(($event.target as HTMLSelectElement).value) })">
          <option :value="0">不刷新</option>
          <option :value="2000">2 秒</option>
          <option :value="5000">5 秒</option>
          <option :value="10000">10 秒</option>
          <option :value="30000">30 秒</option>
        </select>
      </label>
      <label class="cg-field">
        <span>数据路径(JSONPath)</span>
        <input :value="ds.path ?? ''" placeholder="data.devices" @change="patch({ path: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>

    <!-- WebSocket -->
    <template v-else-if="isWs">
      <label class="cg-field">
        <span>WebSocket 地址</span>
        <input :value="ds.url ?? ''" placeholder="ws://… /api/ws" @change="patch({ url: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="cg-field">
        <span>数据路径(JSONPath)</span>
        <input :value="ds.path ?? ''" placeholder="data.devices" @change="patch({ path: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>

    <!-- PostMessage：运行时监听 window message -->
    <template v-else-if="isPostMsg">
      <label class="cg-field">
        <span>允许的源（可选）</span>
        <input :value="ds.sourceOrigin ?? ''" placeholder="https://trusted.example.com（留空不校验）" @change="patch({ sourceOrigin: ($event.target as HTMLInputElement).value })" />
      </label>
      <div class="cg-field-hint">运行时监听 <code>window.postMessage</code>，消息体需为设备数组。</div>
    </template>

    <!-- 数据库类：连接 + 查询（经后端代理 endpoint 取数） -->
    <template v-else-if="isDb">
      <label class="cg-field">
        <span>代理地址（后端数据代理）</span>
        <input :value="ds.url ?? ''" placeholder="/api/db/query" @change="patch({ url: ($event.target as HTMLInputElement).value })" />
      </label>
      <div class="cg-db-grid">
        <label class="cg-field">
          <span>主机</span>
          <input :value="ds.host ?? ''" placeholder="127.0.0.1" @change="patch({ host: ($event.target as HTMLInputElement).value })" />
        </label>
        <label class="cg-field">
          <span>端口</span>
          <input :value="ds.port ?? ''" placeholder="3306" @change="patch({ port: Number(($event.target as HTMLInputElement).value) })" />
        </label>
        <label class="cg-field">
          <span>数据库</span>
          <input :value="ds.database ?? ''" placeholder="caoguo" @change="patch({ database: ($event.target as HTMLInputElement).value })" />
        </label>
        <label class="cg-field">
          <span>用户名</span>
          <input :value="ds.username ?? ''" @change="patch({ username: ($event.target as HTMLInputElement).value })" />
        </label>
        <label class="cg-field">
          <span>密码</span>
          <input type="password" :value="ds.password ?? ''" @change="patch({ password: ($event.target as HTMLInputElement).value })" />
        </label>
      </div>
      <label class="cg-field">
        <span>{{ ds.type === 'influxdb' ? 'Flux 查询' : 'SQL 查询' }}</span>
        <textarea :value="ds.query ?? ''" rows="3" :placeholder="ds.type === 'influxdb' ? 'from(bucket:&quot;caoguo&quot;) |> range(start: -5m)' : 'SELECT * FROM devices LIMIT 100'" @change="patch({ query: ($event.target as HTMLTextAreaElement).value })" />
      </label>
      <label class="cg-field">
        <span>刷新间隔</span>
        <select :value="ds.interval ?? 5000" @change="patch({ interval: Number(($event.target as HTMLSelectElement).value) })">
          <option :value="0">不刷新</option>
          <option :value="2000">2 秒</option>
          <option :value="5000">5 秒</option>
          <option :value="10000">10 秒</option>
          <option :value="30000">30 秒</option>
        </select>
      </label>
    </template>

    <!-- 绑定：引用场景内设备图层并聚合 -->
    <template v-else-if="ds.type === 'binding'">
      <label class="cg-field">
        <span>绑定来源</span>
        <input :value="ds.source ?? ''" placeholder="device-layer-1" @change="patch({ source: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="cg-field">
        <span>聚合方式</span>
        <select :value="ds.aggregate ?? 'avg'" @change="patch({ aggregate: ($event.target as HTMLSelectElement).value as DataSource['aggregate'] })">
          <option value="avg">平均值</option>
          <option value="sum">求和</option>
          <option value="count">计数</option>
          <option value="max">最大值</option>
          <option value="min">最小值</option>
          <option value="status-count">状态分布</option>
        </select>
      </label>
      <label class="cg-field">
        <span>字段</span>
        <input :value="ds.field ?? ''" placeholder="load" @change="patch({ field: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>

    <!-- 通用：字段映射 -->
    <template v-if="!isPostMsg && ds.type !== 'binding'">
      <label class="cg-field">
        <span>字段映射(JSON，可选)</span>
        <textarea :value="JSON.stringify(ds.mapping ?? {}, null, 2)" rows="2" @change="patch({ mapping: safeParse(($event.target as HTMLTextAreaElement).value) as Record<string, string> })" />
      </label>
    </template>
  </div>
</template>

<style scoped>
.cg-field-group { display: flex; flex-direction: column; }
.cg-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; font-size: 12px; color: #b8c0d4; }
.cg-field input, .cg-field select, .cg-field textarea {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e6f0; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none;
}
.cg-field textarea { resize: vertical; font-family: monospace; }
.cg-field-hint { font-size: 11px; color: #6b7280; margin: -4px 0 10px; }
.cg-field-hint code { color: #93c5fd; }
.cg-db-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
</style>
