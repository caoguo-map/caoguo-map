---
title: AI 工具链 · 总览
---

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  parseAddress,
  gcj02ToWgs84,
  detectCRS,
  type ParsedAddress,
} from '@caoguo/maplibre-ai';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';

// —— G-2 中文地址解析 ——
const addrInput = ref<string>('湖北省武汉市洪山区光谷大道1号');
const parsed = computed<ParsedAddress>(() => parseAddress(addrInput.value));
const addrFields: Array<{ key: keyof ParsedAddress; label: string }> = [
  { key: 'province', label: '省' },
  { key: 'city', label: '市' },
  { key: 'district', label: '区/县' },
  { key: 'street', label: '街道' },
  { key: 'number', label: '门牌号' },
  { key: 'poi', label: '地标' },
];

// —— G-3 坐标系判断与纠偏 ——
const srcLng = ref<number>(114.305);
const srcLat = ref<number>(30.593);
const srcHint = ref<string>('高德');
const detected = computed(() => detectCRS(srcHint.value, [[srcLng.value, srcLat.value]]));
const wgs = computed(() => gcj02ToWgs84(srcLng.value, srcLat.value));
const crsLabel: Record<string, string> = {
  wgs84: 'WGS84 (GPS)',
  gcj02: 'GCJ-02 (火星坐标)',
  cgcs2000: 'CGCS2000',
  unknown: '未知',
};
</script>

<DemoLayout
  title="AI 工具链 · 总览"
  subtitle="caoguo-ai：GeoAI 数据入图管线（地址解析 / 坐标系纠偏）、NLPG 查询、样式生成、MapCopilot、AI Debug。"
>
  <template #map>
    <div class="ai-hero">
      <div class="ai-hero-icon">🤖</div>
      <h2>草果地图 · AI 工具链</h2>
      <p>面向六张网的共性 AI 能力，纯前端可交互演示。无需 WebGL，可在任意环境运行。</p>
      <div class="ai-cap-list">
        <span class="ai-cap">GeoAI 地址解析</span>
        <span class="ai-cap">坐标系纠偏</span>
        <span class="ai-cap">NLPG 自然语言查询</span>
        <span class="ai-cap">样式生成器</span>
        <span class="ai-cap">MapCopilot</span>
        <span class="ai-cap">AI Debug</span>
      </div>
    </div>
  </template>
  <template #panel>
    <SimPanel title="G-2 中文地址解析" hint="词典匹配 + 规则（不依赖大模型）">
      <label class="cg-label">输入地址</label>
      <input v-model="addrInput" type="text" class="cg-input" placeholder="如：武汉光谷、洪山区、湖北省武汉市洪山区光谷大道1号" />
      <div class="cg-result">
        <p>标准化：<strong>{{ parsed.normalized || '—' }}</strong></p>
        <p>置信度：<strong>{{ (parsed.confidence * 100).toFixed(0) }}%</strong></p>
        <div class="cg-kv">
          <div v-for="f in addrFields" :key="f.key" class="cg-kv-item">
            <span class="cg-kv-k">{{ f.label }}</span>
            <span class="cg-kv-v">{{ parsed[f.key] || '—' }}</span>
          </div>
        </div>
      </div>
    </SimPanel>
    <SimPanel title="G-3 坐标系判断与纠偏" hint="GCJ-02 ↔ WGS84">
      <label class="cg-label">数据来源标注</label>
      <input v-model="srcHint" type="text" class="cg-input" placeholder="如：高德 / 天地图 / GPS" />
      <div class="cg-geo-row">
        <div>
          <label class="cg-label">经度</label>
          <input v-model.number="srcLng" type="number" step="0.001" class="cg-input" />
        </div>
        <div>
          <label class="cg-label">纬度</label>
          <input v-model.number="srcLat" type="number" step="0.001" class="cg-input" />
        </div>
      </div>
      <div class="cg-result">
        <p>判定坐标系：<strong>{{ crsLabel[detected] }}</strong></p>
        <p>纠偏后 WGS84：<strong>{{ wgs[0].toFixed(6) }}, {{ wgs[1].toFixed(6) }}</strong></p>
        <p class="cg-hint">偏移量 ≈ {{ (srcLng - wgs[0]).toFixed(6) }}°, {{ (srcLat - wgs[1]).toFixed(6) }}°（境内 GCJ-02 加密偏移）</p>
      </div>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.ai-hero {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
  color: var(--cg-text);
}
.ai-hero-icon { font-size: 48px; }
.ai-hero h2 { margin: 0; font-size: 22px; }
.ai-hero p { margin: 0; max-width: 420px; font-size: 14px; color: var(--cg-text-muted); line-height: 1.6; }
.ai-cap-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
}
.ai-cap {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--cg-bg-card, #0f172a);
  border: 1px solid var(--cg-border, #1e293b);
  font-size: 12px;
  color: #e2e8f0;
}
.cg-geo-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.cg-kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-top: 8px;
}
.cg-kv-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid var(--cg-border, #1e293b);
}
.cg-kv-k { color: #94a3b8; }
.cg-kv-v { color: #e2e8f0; font-weight: 600; }
.cg-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 8px 0 0;
}
</style>
