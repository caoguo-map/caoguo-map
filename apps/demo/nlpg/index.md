---
title: D3 NLPG 查询
---

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';
import MapDemo from '../common/MapDemo.vue';
import { queryNlpg, checkHealth, type NlpgRow } from '../common/api';

const query = ref('光谷附近 500 米内的管线');
const examples = [
  '光谷附近 500 米内的管线',
  '江汉路片区主干管',
  '直径大于 600 的管线',
  '材质为铸铁的管段',
  '负载率超过 90% 的变电站',
  '信号弱于 -100dBm 的基站',
];
const loading = ref(false);
const errorMsg = ref('');
const sql = ref('');
const source = ref('');
const rows = ref<NlpgRow[]>([]);
const health = ref<{ postgis: boolean; deepseek: boolean } | null>(null);

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 将代理返回的行转换为 FeatureCollection（支持 geojson / lon,lat / lng,lat） */
function toFeatureCollection(rs: NlpgRow[]): Record<string, unknown> {
  const features = rs
    .map((r, i) => {
      let geometry: unknown = null;
      if (typeof r.geojson === 'string') {
        try { geometry = JSON.parse(r.geojson); } catch { geometry = null; }
      } else if (r.geojson && typeof r.geojson === 'object') {
        geometry = r.geojson;
      } else {
        const lon = Number(r.lon ?? r.lng ?? r.longitude);
        const lat = Number(r.lat ?? r.latitude);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          geometry = { type: 'Point', coordinates: [lon, lat] };
        }
      }
      const { geojson, lon, lng, lat, longitude, latitude, ...props } = r as any;
      return { type: 'Feature', geometry, properties: { ...props, name: props.name ?? `结果${i + 1}` } };
    })
    .filter((f) => f.geometry);
  return { type: 'FeatureCollection', features };
}

/** 地图渲染用的数据：仅包含有几何的结果 */
const mapData = computed(() => toFeatureCollection(rows.value));
const hasGeo = computed(() => (mapData.value.features as unknown[]).length > 0);
const highlight = computed(() => rows.value.map((r) => (r.name as string) ?? '').filter(Boolean));
const columns = computed(() => {
  const set = new Set<string>();
  rows.value.forEach((r) => Object.keys(r).forEach((k) => {
    if (k !== 'geojson') set.add(k);
  }));
  return [...set];
});

async function run(q: string) {
  const text = q.trim();
  if (!text) return;
  loading.value = true;
  errorMsg.value = '';
  sql.value = '';
  rows.value = [];
  try {
    const res = await queryNlpg(text);
    if (!res.ok) {
      errorMsg.value = res.message || '查询失败';
      return;
    }
    sql.value = res.sql || '';
    source.value = res.source || '';
    rows.value = res.rows || [];
  } catch (e) {
    errorMsg.value = '调用 AI 代理失败：' + (e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  health.value = await checkHealth();
  run(query.value);
});
</script>

<DemoLayout title="D3 · NLPG 自然语言查询" subtitle="用一句话把地理意图转为 PostGIS 空间查询。真实 LLM 生成 SQL，经安全校验后在 PostGIS 执行。">
  <template #map>
    <MapDemo :data="mapData" :zoom="12" :highlight="highlight" :height="'100%'"></MapDemo>
  </template>
  <template #panel>
    <SimPanel title="自然语言查询" :hint="health && health.postgis ? '已连接 PostGIS' : '代理不可用'">
      <input v-model="query" class="nlpg-input" placeholder="例如：光谷附近 500 米内的管线" @keyup.enter="run(query)" />
      <div class="nlpg-examples">
        <button v-for="e in examples" :key="e" @click="query = e; run(e)">{{ e }}</button>
      </div>
      <button class="cg-btn cg-btn-primary nlpg-run" :disabled="loading" @click="run(query)">
        {{ loading ? '查询中…' : '执行查询' }}
      </button>
      <p v-if="errorMsg" class="nlpg-error">{{ errorMsg }}</p>
      <div v-if="sql" class="nlpg-sql">
        <div class="nlpg-sql-head">
          <span>生成的 SQL</span>
          <span class="nlpg-sql-src">来源：{{ source }}</span>
        </div>
        <div class="nlpg-result">{{ sql }}</div>
      </div>
      <div v-if="rows.length" class="nlpg-grid">
        <table>
          <thead>
            <tr><th v-for="c in columns" :key="c">{{ c }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i">
              <td v-for="c in columns" :key="c">{{ formatCell(r[c]) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="nlpg-count">共 {{ rows.length }} 条</p>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.nlpg-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cg-border);
  background: var(--cg-bg);
  color: var(--cg-text);
  font-size: 14px;
}
.nlpg-examples { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.nlpg-examples button {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--cg-border);
  background: var(--cg-bg-card);
  color: var(--cg-text-muted);
  cursor: pointer;
}
.nlpg-examples button:hover { color: var(--cg-text); border-color: var(--cg-border-strong, #334155); }
.nlpg-run { width: 100%; margin-top: 10px; }
.nlpg-result {
  margin: 12px 0 0;
  padding: 12px;
  border-radius: 10px;
  background: #07101f;
  border: 1px solid var(--cg-border);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12.5px;
  line-height: 1.7;
  color: #cbd5e1;
  white-space: pre-wrap;
}
.nlpg-sql { margin-top: 14px; }
.nlpg-sql-head {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 12px; color: var(--cg-text-muted); margin-bottom: 6px;
}
.nlpg-sql-src { font-size: 11px; opacity: 0.8; }
.nlpg-error { margin-top: 12px; color: #f43f5e; font-size: 13px; }
.nlpg-grid { margin-top: 14px; overflow: auto; max-height: 260px; }
.nlpg-grid table { width: 100%; border-collapse: collapse; font-size: 12px; }
.nlpg-grid th, .nlpg-grid td {
  border: 1px solid var(--cg-border);
  padding: 6px 8px; text-align: left; white-space: nowrap;
}
.nlpg-grid th { background: var(--cg-bg-card); color: var(--cg-text-muted); position: sticky; top: 0; }
.nlpg-count { margin: 8px 0 0; font-size: 12px; color: var(--cg-text-muted); }
.nlpg-nogeo {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 24px; text-align: center; color: var(--cg-text-muted); min-height: 480px;
}
.nlpg-nogeo-icon { font-size: 40px; opacity: 0.7; }
.nlpg-nogeo-sub { font-size: 12px; margin: 0; }
</style>
