<script setup lang="ts">
import { computed, ref, nextTick, toRef, onMounted, onUnmounted } from 'vue';
import type { ComponentNode } from '../types';
import { useEditor } from '../store/useEditor';
import { useHistory } from '../store/useHistory';
import { useDeviceStore } from '../store/useDeviceStore';
import { useDeviceData } from '../store/useDeviceData';
import { deviceColor, DEVICE_STATUS_LABEL } from '../devices';

const props = defineProps<{ node: ComponentNode }>();
const cfg = computed(() => props.node.config as Record<string, any>);
const { state } = useEditor();
const { commit: commitHistory } = useHistory();

// ── 图表类从数据源取数（数据契约归一化：DeviceItem[]）──
const CHART_TYPES = ['trend-chart', 'bar-chart', 'pie-chart', 'gauge-chart', 'wind-rose'];
const isChart = computed(() => CHART_TYPES.includes(props.node.type));
const { devices } = useDeviceData(toRef(props, 'node') as any);

// 按维度/度量字段把 DeviceItem[] 聚合为 {name, value}[]
function aggregate(rows: Record<string, any>[]): { name: string; value: number }[] {
  if (!rows.length) return [];
  const dim = (cfg.value.dimensionField as string) || 'name';
  const metric = (cfg.value.metricField as string) || firstNumericField(rows[0]);
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[dim] ?? '未知');
    const v = Number(r[metric]);
    map.set(k, (map.get(k) ?? 0) + (Number.isFinite(v) ? v : 0));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}
function firstNumericField(r: Record<string, any>): string {
  return Object.keys(r).find((k) => typeof r[k] === 'number' && k !== 'lng' && k !== 'lat') || 'value';
}

// ── 文本双击编辑 ──
const editing = ref(false);
let editRef: HTMLElement | null = null;
function startEdit(e: MouseEvent) {
  if (state.preview || props.node.locked) return;
  editing.value = true;
  const el = e.target as HTMLElement;
  nextTick(() => {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
}
function onTextMouseDown(e: MouseEvent) {
  if (editing.value) e.stopPropagation(); // 编辑中禁止触发节点拖拽
}
function stopEdit(e: FocusEvent | KeyboardEvent) {
  if (!editing.value) return;
  editing.value = false;
  const el = e.target as HTMLElement;
  const text = el.innerText.replace(/\n+$/, '');
  if (text !== cfg.value.text) {
    props.node.config = { ...props.node.config, text };
    commitHistory();
  }
}

// ── 时钟 ──
const now = ref(new Date());
let timer: number | undefined;
function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
function fmt() {
  const d = now.value;
  const map: Record<string, string> = {
    'HH:mm:ss': `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    'HH:mm': `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    'YYYY-MM-DD': `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  };
  const f = cfg.value.format || 'HH:mm:ss';
  let s = map[f] || f;
  if (cfg.value.showDate) s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ` + s;
  return s;
}
onMounted(() => {
  if (props.node.type === 'clock') timer = window.setInterval(() => (now.value = new Date()), 1000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});

// ── 图表示例数据（绑定数据源时优先真实数据，否则示例）──
const sampleSeries = computed(() => {
  if (isChart.value && devices.value.length) {
    const real = aggregate(devices.value);
    if (real.length) return real;
  }
  const seed = props.node.id.length;
  const arr: { name: string; value: number }[] = [];
  for (let i = 0; i < 7; i++) {
    arr.push({ name: `D${i + 1}`, value: Math.round(30 + Math.sin(seed + i) * 20 + i * 4) });
  }
  return arr;
});

// 折线/柱状图 SVG 坐标
const chartGeo = computed(() => {
  const data = sampleSeries.value;
  const w = props.node.position.w;
  const h = props.node.position.h;
  const pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const pts = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * innerW,
    y: pad + innerH - ((d.value - min) / span) * innerH,
    v: d.value,
  }));
  return { w, h, pad, max, min, span, innerW, innerH, pts };
});

const linePath = computed(() =>
  chartGeo.value.pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' '),
);
const areaPath = computed(() => {
  const g = chartGeo.value;
  const first = g.pts[0];
  const last = g.pts[g.pts.length - 1];
  if (!first || !last) return '';
  return `M${first.x.toFixed(1)},${(g.pad + g.innerH).toFixed(1)} ` +
    g.pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${last.x.toFixed(1)},${(g.pad + g.innerH).toFixed(1)} Z`;
});

// 饼图扇区
const pieSlices = computed(() => {
  const data = sampleSeries.value;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = props.node.position.w / 2;
  const cy = props.node.position.h / 2;
  const r = Math.min(cx, cy) - 10;
  const colors = ['#4ade80', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#fb923c'];
  let acc = 0;
  return data.map((d, i) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return { d: `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`, color: colors[i % colors.length] };
  });
});

// 仪表盘指针角度
const gaugeAngle = computed(() => {
  const v = Math.min(Math.max(Number(cfg.value.value ?? 50), 0), Number(cfg.value.max || 100));
  const ratio = v / (Number(cfg.value.max) || 100);
  return -90 + ratio * 180; // -90° ~ +90°
});

// 告警列表（接设备图层）
const { store: deviceStore } = useDeviceStore();
const alertItems = computed(() => {
  const layerId = cfg.value.deviceLayerId as string | undefined;
  const list = layerId ? deviceStore.devicesByLayer[layerId] ?? [] : [];
  return list
    .filter((d) => d.status === 'warning' || d.status === 'fault' || d.status === 'offline')
    .slice(0, Number(cfg.value.maxItems) || 10)
    .map((d) => ({ name: d.name, status: d.status }));
});
</script>

<template>
  <div class="cg-view">
    <!-- 文本（双击编辑） -->
    <div
      v-if="node.type === 'text'"
      class="cg-text"
      :class="{ editing }"
      :contenteditable="editing ? 'true' : 'false'"
      :style="{ fontSize: cfg.fontSize + 'px', fontWeight: cfg.fontWeight, color: cfg.color, textAlign: cfg.align }"
      @dblclick="startEdit"
      @mousedown="onTextMouseDown"
      @blur="stopEdit"
      @keydown.enter.prevent="stopEdit"
    >{{ cfg.text }}</div>

    <!-- 时钟 -->
    <div v-else-if="node.type === 'clock'" class="cg-clock">{{ fmt() }}</div>

    <!-- 分割线 -->
    <div v-else-if="node.type === 'divider'" class="cg-divider" :style="{ background: cfg.color }"></div>

    <!-- 图片 -->
    <div v-else-if="node.type === 'image'" class="cg-image">
      <img v-if="cfg.src" :src="cfg.src" :style="{ objectFit: cfg.fit }" />
      <span v-else class="cg-ph">图片</span>
    </div>

    <!-- 数据指标卡 -->
    <div v-else-if="node.type === 'data-card'" class="cg-data-card" :style="{ borderColor: cfg.color + '55' }">
      <div class="cg-dc-label">{{ cfg.label }}</div>
      <div class="cg-dc-value" :style="{ color: cfg.color }">{{ cfg.value }}<span class="cg-dc-unit">{{ cfg.unit }}</span></div>
    </div>

    <!-- 统计行 -->
    <div v-else-if="node.type === 'stat-row'" class="cg-stat-row">
      <div v-for="(it, i) in (cfg.items && cfg.items.length ? cfg.items : [{ label: '指标', value: '0', unit: '' }])" :key="i" class="cg-sr-item">
        <span class="cg-sr-value">{{ it.value }}<small>{{ it.unit }}</small></span>
        <span class="cg-sr-label">{{ it.label }}</span>
      </div>
    </div>

    <!-- 数据网格 -->
    <div v-else-if="node.type === 'data-grid'" class="cg-data-grid" :style="{ gridTemplateColumns: `repeat(${cfg.columns || 2}, 1fr)` }">
      <div v-for="(it, i) in (cfg.items && cfg.items.length ? cfg.items : [])" :key="i" class="cg-dg-cell">
        <span class="cg-dg-value">{{ it.value }}</span>
        <span class="cg-dg-label">{{ it.label }}</span>
      </div>
      <span v-if="!(cfg.items && cfg.items.length)" class="cg-ph">数据网格</span>
    </div>

    <!-- 进度条 -->
    <div v-else-if="node.type === 'progress-card'" class="cg-progress">
      <div class="cg-pc-head"><span>{{ cfg.label }}</span><span>{{ Math.round((cfg.value / (cfg.max || 100)) * 100) }}%</span></div>
      <div class="cg-pc-track"><div class="cg-pc-fill" :style="{ width: Math.min(100, (cfg.value / (cfg.max || 100)) * 100) + '%', background: cfg.color }"></div></div>
    </div>

    <!-- 土壤剖面 -->
    <div v-else-if="node.type === 'soil-profile'" class="cg-soil">
      <div v-for="(ly, i) in (cfg.layers && cfg.layers.length ? cfg.layers : [{ name: '表层', value: 60, color: '#8b5a2b' }, { name: '犁底层', value: 35, color: '#a0703a' }])" :key="i" class="cg-soil-layer" :style="{ background: ly.color }">
        <span class="cg-soil-name">{{ ly.name }}</span>
        <span class="cg-soil-val">{{ ly.value }}%</span>
      </div>
    </div>

    <!-- 告警列表 -->
    <div v-else-if="node.type === 'alert-list'" class="cg-alert">
      <div v-for="(a, i) in alertItems" :key="i" class="cg-alert-item">
        <span class="cg-dot" :style="{ background: deviceColor(a.status) }"></span>
        <span class="cg-alert-name">{{ a.name }}</span>
        <span class="cg-alert-st" :style="{ color: deviceColor(a.status) }">{{ DEVICE_STATUS_LABEL[a.status] }}</span>
      </div>
      <span v-if="!alertItems.length" class="cg-ph">暂无告警</span>
    </div>

    <!-- 折线图 -->
    <div v-else-if="node.type === 'trend-chart'" class="cg-chart">
      <svg :viewBox="`0 0 ${chartGeo.w} ${chartGeo.h}`" preserveAspectRatio="none" class="cg-chart-svg">
        <path v-if="cfg.fillArea" :d="areaPath" :fill="cfg.lineColor" :fill-opacity="cfg.fillOpacity" />
        <path :d="linePath" fill="none" :stroke="cfg.lineColor" :stroke-width="cfg.lineWidth" vector-effect="non-scaling-stroke" />
        <circle v-for="(p, i) in chartGeo.pts" v-show="cfg.showPoints" :key="i" :cx="p.x" :cy="p.y" r="2.5" :fill="cfg.lineColor" />
      </svg>
    </div>

    <!-- 柱状图 -->
    <div v-else-if="node.type === 'bar-chart'" class="cg-chart">
      <svg :viewBox="`0 0 ${chartGeo.w} ${chartGeo.h}`" preserveAspectRatio="none" class="cg-chart-svg">
        <rect v-for="(p, i) in chartGeo.pts" :key="i" :x="p.x - chartGeo.innerW / sampleSeries.length / 2 + 2" :y="p.y" :width="chartGeo.innerW / sampleSeries.length - 4" :height="chartGeo.pad + chartGeo.innerH - p.y" :fill="cfg.barColor" rx="2" />
      </svg>
    </div>

    <!-- 饼图 -->
    <div v-else-if="node.type === 'pie-chart'" class="cg-chart">
      <svg :viewBox="`0 0 ${node.position.w} ${node.position.h}`" class="cg-chart-svg">
        <path v-for="(s, i) in pieSlices" :key="i" :d="s.d" :fill="s.color" />
      </svg>
    </div>

    <!-- 仪表盘 -->
    <div v-else-if="node.type === 'gauge-chart'" class="cg-chart">
      <svg :viewBox="`0 0 ${node.position.w} ${node.position.h}`" class="cg-chart-svg">
        <path :d="`M${node.position.w / 2 - 70},${node.position.h / 2 + 30} A70,70 0 0 1 ${node.position.w / 2 + 70},${node.position.h / 2 + 30}`" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="10" />
        <path :d="`M${node.position.w / 2 - 70},${node.position.h / 2 + 30} A70,70 0 0 1 ${node.position.w / 2 + 70},${node.position.h / 2 + 30}`" fill="none" :stroke="cfg.color" stroke-width="10" :stroke-dasharray="`${(gaugeAngle + 90) / 180 * 220} 220`" />
        <text :x="node.position.w / 2" :y="node.position.h / 2" text-anchor="middle" :fill="cfg.color" font-size="20" font-weight="700">{{ Math.round((cfg.value ?? 50)) }}</text>
      </svg>
      <div class="cg-gauge-label">{{ cfg.label }}</div>
    </div>

    <!-- 风向玫瑰图 -->
    <div v-else-if="node.type === 'wind-rose'" class="cg-chart">
      <svg :viewBox="`0 0 ${node.position.w} ${node.position.h}`" class="cg-chart-svg">
        <circle :cx="node.position.w / 2" :cy="node.position.h / 2" :r="Math.min(node.position.w, node.position.h) / 2 - 6" fill="none" stroke="rgba(255,255,255,0.1)" />
        <polygon :points="pieSlices.map(s => s.d).join(' ')" fill="rgba(74,222,128,0.25)" stroke="#4ade80" />
      </svg>
    </div>

    <!-- 卡片容器 / 透明容器 -->
    <div v-else-if="node.type === 'card-container' || node.type === 'transparent-container'" class="cg-container" :class="{ transparent: node.type === 'transparent-container' }">
      <div v-if="node.type === 'card-container' && cfg.showTitle" class="cg-cont-title">{{ cfg.title }}</div>
      <div class="cg-cont-body"><span class="cg-ph">容器内容区</span></div>
    </div>

    <!-- 标签页容器 -->
    <div v-else-if="node.type === 'tab-container'" class="cg-tab-cont">
      <div class="cg-tc-tabs">
        <span v-for="(t, i) in (cfg.tabs && cfg.tabs.length ? cfg.tabs : [{ label: 'Tab 1' }])" :key="i" class="cg-tc-tab" :class="{ active: i === 0 }">{{ t.label }}</span>
      </div>
      <div class="cg-tc-body"><span class="cg-ph">标签页内容</span></div>
    </div>

    <!-- 兜底：显示组件类型名 -->
    <div v-else class="cg-ph">「{{ node.type }}」待实现</div>
  </div>
</template>

<style scoped>
.cg-view { width: 100%; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; }
.cg-ph { margin: auto; font-size: 12px; color: #6b7280; }
.cg-text { width: 100%; line-height: 1.3; word-break: break-all; outline: none; cursor: text; }
.cg-text.editing { cursor: text; box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.6); border-radius: 3px; }
.cg-clock { margin: auto; font-size: 18px; color: #e0e6f0; font-variant-numeric: tabular-nums; }
.cg-divider { width: 100%; height: 100%; border-radius: 2px; }
.cg-image { width: 100%; height: 100%; display: flex; background: rgba(255,255,255,0.04); border-radius: 6px; overflow: hidden; }
.cg-image img { width: 100%; height: 100%; display: block; }
.cg-data-card { margin: auto; width: 100%; text-align: center; padding: 8px; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; background: rgba(255,255,255,0.03); }
.cg-dc-label { font-size: 12px; color: #8b93a7; }
.cg-dc-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
.cg-dc-unit { font-size: 12px; margin-left: 3px; opacity: 0.8; }
.cg-stat-row { margin: auto; display: flex; gap: 16px; width: 100%; justify-content: space-around; flex-wrap: wrap; }
.cg-sr-item { display: flex; flex-direction: column; align-items: center; }
.cg-sr-value { font-size: 20px; font-weight: 700; color: #4ade80; }
.cg-sr-value small { font-size: 11px; margin-left: 2px; opacity: 0.7; }
.cg-sr-label { font-size: 11px; color: #8b93a7; }
.cg-data-grid { flex: 1; display: grid; gap: 8px; padding: 8px; align-content: center; }
.cg-dg-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 6px; }
.cg-dg-value { font-size: 16px; font-weight: 700; color: #e0e6f0; }
.cg-dg-label { font-size: 10px; color: #8b93a7; }
.cg-progress { width: 100%; margin: auto; padding: 0 8px; }
.cg-pc-head { display: flex; justify-content: space-between; font-size: 12px; color: #b8c0d4; margin-bottom: 4px; }
.cg-pc-track { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.cg-pc-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.cg-soil { width: 100%; margin: auto; display: flex; flex-direction: column; gap: 4px; padding: 4px; }
.cg-soil-layer { display: flex; justify-content: space-between; padding: 6px 10px; border-radius: 4px; font-size: 12px; color: #fff; }
.cg-alert { width: 100%; margin: auto; display: flex; flex-direction: column; gap: 6px; padding: 6px; }
.cg-alert-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.cg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cg-alert-name { flex: 1; color: #e0e6f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cg-alert-st { font-size: 11px; }
.cg-chart { width: 100%; height: 100%; }
.cg-chart-svg { width: 100%; height: 100%; display: block; }
.cg-gauge-label { text-align: center; font-size: 12px; color: #8b93a7; margin-top: -6px; }
.cg-container { flex: 1; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(255,255,255,0.03); display: flex; flex-direction: column; }
.cg-container.transparent { background: transparent; border-style: dashed; }
.cg-cont-title { padding: 6px 10px; font-size: 12px; font-weight: 600; color: #e0e6f0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.cg-cont-body { flex: 1; display: flex; }
.cg-tab-cont { flex: 1; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; }
.cg-tc-tabs { display: flex; height: 30px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.cg-tc-tab { padding: 0 14px; font-size: 12px; display: flex; align-items: center; color: #8b93a7; border-right: 1px solid rgba(255,255,255,0.06); }
.cg-tc-tab.active { color: #4ade80; background: rgba(74,222,128,0.08); }
.cg-tc-body { flex: 1; display: flex; }
</style>
