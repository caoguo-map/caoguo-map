<script setup lang="ts">
import { computed, ref, nextTick, toRef, onMounted, onUnmounted, watch } from 'vue';
import type { ComponentNode } from '../types';
import { useEditor } from '../store/useEditor';
import { useHistory } from '../store/useHistory';
import { useDeviceStore } from '../store/useDeviceStore';
import { useDataSources } from '../store/useDataSources';
import { useDeviceData } from '../store/useDeviceData';
import { deviceColor, DEVICE_STATUS_LABEL } from '../devices';
import { readThresholdRule, evalThreshold, thresholdColor, ThresholdLevel } from '../thresholds';

const props = defineProps<{ node: ComponentNode }>();
const cfg = computed(() => props.node.config as Record<string, any>);
// 未显式配置颜色时回退，避免拼接出 'undefined88' 之类非法样式
const baseColor = computed(() => (typeof cfg.value.color === 'string' && cfg.value.color ? cfg.value.color : '#3b82f6'));
const { state, uiTabs, setTab } = useEditor();
const { commit: commitHistory } = useHistory();

// ── 图表类从数据源取数（数据契约归一化：DeviceItem[]）──
const CHART_TYPES = ['trend-chart', 'bar-chart', 'pie-chart', 'gauge-chart', 'wind-rose'];
const isChart = computed(() => CHART_TYPES.includes(props.node.type));
const { devices, lastUpdate } = useDeviceData(toRef(props, 'node') as any);
const { getDevices } = useDeviceStore();
const dss = useDataSources();

// ── binding 数据源：从绑定的设备图层实时取数并按聚合方式计算（此前仅降级示例，未真正消费）──
const bindingDs = computed(() => {
  const src = dss.resolveForNode(props.node);
  return src && src.type === 'binding' ? src : undefined;
});
const boundRows = computed<Record<string, any>[]>(() => {
  const b = bindingDs.value;
  const raw = b ? (getDevices(b.source) as Record<string, any>[]) : [];
  const f = useDeviceStore().store.filterStatus;
  return f === 'all' ? raw : raw.filter((r) => r.status === f);
});
const boundAgg = computed<{ series?: { name: string; value: number }[]; value?: number } | null>(() => {
  const b = bindingDs.value;
  if (!b) return null;
  const rows = boundRows.value;
  const agg = b.aggregate ?? 'sum';
  if (agg === 'status-count') {
    const map = new Map<string, number>();
    for (const r of rows) {
      const k = String(r.status ?? '未知');
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return { series: [...map.entries()].map(([name, value]) => ({ name: (DEVICE_STATUS_LABEL as Record<string, string>)[name] ?? name, value })) };
  }
  if (agg === 'count') return { value: rows.length };
  const field = b.field || (rows[0] ? firstNumericField(rows[0]) : 'value');
  const nums = rows.map((r) => Number(r[field])).filter((v) => Number.isFinite(v));
  if (!nums.length) return agg === 'sum' ? { value: 0 } : null;
  switch (agg) {
    case 'avg': return { value: nums.reduce((s, v) => s + v, 0) / nums.length };
    case 'max': return { value: Math.max(...nums) };
    case 'min': return { value: Math.min(...nums) };
    default: return { value: nums.reduce((s, v) => s + v, 0) }; // sum
  }
});

// 各图表的维度/度量字段配置键（与注册表 defaultConfig 对齐；修复此前 xField/yField 配置不生效的问题）
const FIELD_KEYS: Record<string, [string, string]> = {
  'trend-chart': ['xField', 'yField'],
  'bar-chart': ['xField', 'yField'],
  'pie-chart': ['nameField', 'valueField'],
  'wind-rose': ['directionField', 'speedField'],
};

// 按维度/度量字段把 DeviceItem[] 聚合为 {name, value}[]（求和分组；binding 专用聚合见 boundAgg）
function aggregate(rows: Record<string, any>[]): { name: string; value: number }[] {
  if (!rows.length) return [];
  const [dimKey, metricKey] = FIELD_KEYS[props.node.type] ?? ['dimensionField', 'metricField'];
  const dim = (cfg.value[dimKey] as string) || 'name';
  const metric = (cfg.value[metricKey] as string) || firstNumericField(rows[0]);
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
  // binding 聚合结果（如 status-count 状态分布）优先
  if (boundAgg.value?.series?.length) return boundAgg.value.series;
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

// 折线/柱状图 SVG 坐标（含 yAxisRange 固定档位）
const chartGeo = computed(() => {
  const data = sampleSeries.value;
  const w = props.node.position.w;
  const h = props.node.position.h;
  const pad = 24;
  const fixed = cfg.value.yAxisRange === '0-100';
  const max = fixed ? 100 : Math.max(...data.map((d) => d.value), 1);
  const min = fixed ? 0 : Math.min(...data.map((d) => d.value), 0);
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

// Y 轴刻度（网格线 / 轴标签共用）
const yTicks = computed(() => {
  const g = chartGeo.value;
  const n = 4;
  return Array.from({ length: n + 1 }, (_, i) => {
    const v = g.min + (g.span * i) / n;
    const y = g.pad + g.innerH - ((v - g.min) / g.span) * g.innerH;
    return { y, v: Math.round(v * 10) / 10 };
  });
});

// 平滑曲线（二次贝塞尔）/ 直线连接
const linePath = computed(() => {
  const pts = chartGeo.value.pts;
  if (!pts.length) return '';
  if (!cfg.value.smooth || pts.length < 3) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
    const my = ((pts[i].y + pts[i + 1].y) / 2).toFixed(1);
    d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mx},${my}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
});
const areaPath = computed(() => {
  const g = chartGeo.value;
  const first = g.pts[0];
  const last = g.pts[g.pts.length - 1];
  if (!first || !last) return '';
  return `${linePath.value} L${last.x.toFixed(1)},${(g.pad + g.innerH).toFixed(1)} L${first.x.toFixed(1)},${(g.pad + g.innerH).toFixed(1)} Z`;
});

// 饼图扇区（支持 doughnut 环形：内外双圆弧）
const pieSlices = computed(() => {
  const data = sampleSeries.value;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = props.node.position.w / 2;
  const cy = props.node.position.h / 2;
  const r = Math.min(cx, cy) - 10;
  const ri = cfg.value.doughnut ? r * 0.55 : 0;
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
    let dPath: string;
    if (ri > 0) {
      const ix1 = cx + ri * Math.cos(start);
      const iy1 = cy + ri * Math.sin(start);
      const ix2 = cx + ri * Math.cos(end);
      const iy2 = cy + ri * Math.sin(end);
      dPath = `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${ri},${ri} 0 ${large} 0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z`;
    } else {
      dPath = `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
    }
    return { d: dPath, color: colors[i % colors.length] };
  });
});

// 风向玫瑰图：极坐标扇瓣（半径 ∝ 数值，替代此前的假实现）
const roseSlices = computed(() => {
  const data = sampleSeries.value;
  const w = props.node.position.w;
  const h = props.node.position.h;
  const cx = w / 2;
  const cy = h / 2;
  const rMax = Math.min(cx, cy) - 14;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const step = (Math.PI * 2) / Math.max(data.length, 1);
  return data.map((d, i) => {
    const r = Math.max((d.value / maxV) * rMax, 2);
    const a0 = -Math.PI / 2 + i * step;
    const a1 = a0 + step;
    const x1 = cx + r * Math.cos(a0);
    const y1 = cy + r * Math.sin(a0);
    const x2 = cx + r * Math.cos(a1);
    const y2 = cy + r * Math.sin(a1);
    const large = step > Math.PI ? 1 : 0;
    return { d: `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`, alpha: 0.3 + 0.6 * (d.value / maxV) };
  });
});

// 数据指标卡当前值：binding 聚合值优先（如 avg/max），否则静态配置
const cardValue = computed(() => {
  const b = boundAgg.value;
  if (b && typeof b.value === 'number') return Math.round(b.value * 100) / 100;
  return cfg.value.value;
});
// 本地阈值规则着色：依据 thrField/thrWarn/thrCrit 对当前值判定告警级别
const cardLevel = computed(() => {
  const rule = readThresholdRule(cfg.value);
  if (!rule.field) return 'none';
  const v = Number(cardValue.value);
  return evalThreshold(rule, Number.isFinite(v) ? v : undefined);
});
const cardColor = computed(() => thresholdColor(cardLevel.value as ThresholdLevel) ?? '#e5e7eb');

// ── 实时刷新视觉反馈：数据源刷新时显示「实时 · N秒前」并短暂脉动 ──
const showLive = computed(() => !!bindingDs.value && !!lastUpdate.value);
const liveNow = ref(Date.now());
let liveTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  liveTimer = setInterval(() => (liveNow.value = Date.now()), 1000);
});
onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer);
  if (livePulseTimer) clearTimeout(livePulseTimer);
});
const agoText = computed(() => {
  if (!lastUpdate.value) return '';
  const s = Math.round((liveNow.value - lastUpdate.value) / 1000);
  if (s < 2) return '刚刚';
  if (s < 60) return `${s}秒前`;
  return `${Math.round(s / 60)}分前`;
});
const livePulse = ref(false);
let livePulseTimer: ReturnType<typeof setTimeout> | null = null;
watch(lastUpdate, () => {
  livePulse.value = true;
  if (livePulseTimer) clearTimeout(livePulseTimer);
  livePulseTimer = setTimeout(() => (livePulse.value = false), 800);
});

// 仪表盘当前值：binding 聚合值（avg/sum/max/min/count）优先，否则用静态配置
const gaugeValue = computed(() => {
  const b = boundAgg.value;
  if (b && typeof b.value === 'number') return b.value;
  return Number(cfg.value.value ?? 50);
});

// 仪表盘指针角度
const gaugeAngle = computed(() => {
  const v = Math.min(Math.max(gaugeValue.value, 0), Number(cfg.value.max || 100));
  const ratio = v / (Number(cfg.value.max) || 100);
  return -90 + ratio * 180; // -90° ~ +90°
});

// 告警列表（接设备图层）
const { store: deviceStore } = useDeviceStore();
const alertItems = computed(() => {
  const layerId = cfg.value.deviceLayerId as string | undefined;
  const f = deviceStore.filterStatus;
  const list = layerId ? deviceStore.devicesByLayer[layerId] ?? [] : [];
  return list
    .filter((d) => (f === 'all' ? true : d.status === f))
    .filter((d) => d.status === 'warning' || d.status === 'fault' || d.status === 'offline')
    .slice(0, Number(cfg.value.maxItems) || 10)
    .map((d) => ({ name: d.name, status: d.status }));
});
</script>

<template>
  <div class="cg-view">
    <!-- 实时刷新反馈：数据源刷新时显示「实时 · N秒前」并短暂脉动 -->
    <div v-if="showLive" class="cg-live" :class="{ pulse: livePulse }">
      <span class="cg-live-dot" /> 实时 · {{ agoText }}
    </div>

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

    <!-- 分割线（支持水平/垂直） -->
    <div v-else-if="node.type === 'divider'" class="cg-divider" :style="cfg.orientation === 'vertical'
      ? { width: '2px', height: '100%', margin: '0 auto', background: cfg.color }
      : { width: '100%', height: '2px', margin: 'auto 0', background: cfg.color }"></div>

    <!-- 图片 -->
    <div v-else-if="node.type === 'image'" class="cg-image">
      <img v-if="cfg.src" :src="cfg.src" :style="{ objectFit: cfg.fit }" />
      <span v-else class="cg-ph">图片</span>
    </div>

    <!-- 数据指标卡（支持本地阈值规则着色） -->
    <div v-else-if="node.type === 'data-card'" class="cg-data-card" :style="{ borderColor: (cardLevel !== 'none' ? cardColor : baseColor) + '88' }">
      <div class="cg-dc-label">
        {{ cfg.label }}
        <span v-if="cardLevel === 'warn'" class="cg-dc-badge warn">预警</span>
        <span v-else-if="cardLevel === 'crit'" class="cg-dc-badge crit">告警</span>
      </div>
      <div class="cg-dc-value" :style="{ color: cardLevel !== 'none' ? cardColor : baseColor }">{{ cardValue }}<span class="cg-dc-unit">{{ cfg.unit }}</span></div>
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

    <!-- 进度条（支持本地阈值规则着色） -->
    <div v-else-if="node.type === 'progress-card'" class="cg-progress">
      <div class="cg-pc-head">
        <span>{{ cfg.label }}<span v-if="cardLevel === 'warn'" class="cg-dc-badge warn">预警</span><span v-else-if="cardLevel === 'crit'" class="cg-dc-badge crit">告警</span></span>
        <span>{{ Math.round((cfg.value / (cfg.max || 100)) * 100) }}%</span>
      </div>
      <div class="cg-pc-track"><div class="cg-pc-fill" :style="{ width: Math.min(100, (cfg.value / (cfg.max || 100)) * 100) + '%', background: cardLevel !== 'none' ? cardColor : baseColor }"></div></div>
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
        <g v-if="cfg.showGrid">
          <line v-for="(t, i) in yTicks" :key="'g' + i" :x1="chartGeo.pad" :x2="chartGeo.w - chartGeo.pad" :y1="t.y" :y2="t.y" stroke="var(--cg-grid)" stroke-width="1" />
        </g>
        <path v-if="cfg.fillArea" :d="areaPath" :fill="cfg.lineColor" :fill-opacity="cfg.fillOpacity" />
        <path :d="linePath" fill="none" :stroke="cfg.lineColor" :stroke-width="cfg.lineWidth" vector-effect="non-scaling-stroke" />
        <circle v-for="(p, i) in chartGeo.pts" v-show="cfg.showPoints" :key="i" :cx="p.x" :cy="p.y" r="2.5" :fill="cfg.lineColor" />
        <g v-if="cfg.showYAxis">
          <text v-for="(t, i) in yTicks" :key="'y' + i" :x="chartGeo.pad - 4" :y="t.y + 3" text-anchor="end" font-size="9" fill="var(--cg-text-sub)">{{ t.v }}</text>
        </g>
        <g v-if="cfg.showXAxis">
          <text
            v-for="(p, i) in chartGeo.pts"
            :key="'x' + i"
            :x="p.x"
            :y="chartGeo.h - 6"
            text-anchor="middle"
            font-size="9"
            fill="var(--cg-text-sub)"
            :transform="cfg.xLabelRotate ? `rotate(${cfg.xLabelRotate} ${p.x} ${chartGeo.h - 6})` : undefined"
          >{{ sampleSeries[i]?.name }}</text>
        </g>
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
        <text :x="node.position.w / 2" :y="node.position.h / 2" text-anchor="middle" :fill="cfg.color" font-size="20" font-weight="700">{{ Math.round(gaugeValue) }}</text>
      </svg>
      <div class="cg-gauge-label">{{ cfg.label }}</div>
    </div>

    <!-- 风向玫瑰图（极坐标扇瓣：半径 ∝ 数值） -->
    <div v-else-if="node.type === 'wind-rose'" class="cg-chart">
      <svg :viewBox="`0 0 ${node.position.w} ${node.position.h}`" class="cg-chart-svg">
        <circle :cx="node.position.w / 2" :cy="node.position.h / 2" :r="(Math.min(node.position.w, node.position.h) / 2 - 14) * 0.66" fill="none" stroke="var(--cg-grid)" />
        <circle :cx="node.position.w / 2" :cy="node.position.h / 2" :r="(Math.min(node.position.w, node.position.h) / 2 - 14) * 0.33" fill="none" stroke="var(--cg-grid)" />
        <circle :cx="node.position.w / 2" :cy="node.position.h / 2" :r="Math.min(node.position.w, node.position.h) / 2 - 14" fill="none" stroke="var(--cg-panel-border)" />
        <path v-for="(s, i) in roseSlices" :key="i" :d="s.d" fill="#4ade80" :fill-opacity="s.alpha" stroke="#4ade80" stroke-width="0.5" />
      </svg>
    </div>

    <!-- 卡片容器 / 透明容器 -->
    <div v-else-if="node.type === 'card-container' || node.type === 'transparent-container'" class="cg-container" :class="{ transparent: node.type === 'transparent-container' }">
      <div v-if="node.type === 'card-container' && cfg.showTitle" class="cg-cont-title">{{ cfg.title }}</div>
      <div class="cg-cont-body"><span v-if="!(node.children && node.children.length)" class="cg-ph">容器内容区</span></div>
    </div>

    <!-- 标签页容器（Tab 可切换；子组件按 tab 归属过滤，由 NodeView 执行） -->
    <div v-else-if="node.type === 'tab-container'" class="cg-tab-cont">
      <div class="cg-tc-tabs">
        <span
          v-for="(t, i) in (cfg.tabs && cfg.tabs.length ? cfg.tabs : [{ label: 'Tab 1' }])"
          :key="i"
          class="cg-tc-tab"
          :class="{ active: i === (uiTabs[node.id] ?? 0) }"
          @click="setTab(node.id, i)"
        >{{ t.label }}</span>
      </div>
      <div class="cg-tc-body">
        <span v-if="!(node.children && node.children.length)" class="cg-ph">{{ cfg.tabs?.[uiTabs[node.id] ?? 0]?.label ?? 'Tab' }} 内容</span>
      </div>
    </div>

    <!-- 兜底：显示组件类型名 -->
    <div v-else class="cg-ph">「{{ node.type }}」待实现</div>
  </div>
</template>

<style scoped>
.cg-view { width: 100%; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; position: relative; }
.cg-live {
  position: absolute; top: 4px; right: 6px; z-index: 5;
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; color: #4ade80; padding: 2px 7px;
  background: rgba(74, 222, 128, 0.12); border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 999px; pointer-events: none; letter-spacing: 0.3px;
  transition: box-shadow 0.3s, background 0.3s;
}
.cg-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px #4ade80; }
.cg-live.pulse { background: rgba(74, 222, 128, 0.28); box-shadow: 0 0 12px rgba(74, 222, 128, 0.6); animation: cgPulse 0.8s ease-out; }
@keyframes cgPulse { 0% { transform: scale(1); } 40% { transform: scale(1.08); } 100% { transform: scale(1); } }
.cg-ph { margin: auto; font-size: 12px; color: var(--cg-ph); }
.cg-text { width: 100%; line-height: 1.3; word-break: break-all; outline: none; cursor: text; }
.cg-text.editing { cursor: text; box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.6); border-radius: 3px; }
.cg-clock { margin: auto; font-size: 18px; color: var(--cg-text); font-variant-numeric: tabular-nums; }
.cg-divider { border-radius: 2px; }
.cg-image { width: 100%; height: 100%; display: flex; background: var(--cg-panel); border-radius: 6px; overflow: hidden; }
.cg-image img { width: 100%; height: 100%; display: block; }
.cg-data-card { margin: auto; width: 100%; text-align: center; padding: 8px; border: 1px solid var(--cg-panel-border); border-radius: 8px; background: var(--cg-panel); }
.cg-dc-label { font-size: 12px; color: var(--cg-text-sub); }
.cg-dc-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
.cg-dc-unit { font-size: 12px; margin-left: 3px; opacity: 0.8; }
.cg-dc-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 999px; margin-left: 6px; vertical-align: middle; }
.cg-dc-badge.warn { color: #fbbf24; background: rgba(251, 191, 36, 0.16); border: 1px solid rgba(251, 191, 36, 0.4); }
.cg-dc-badge.crit { color: #f87171; background: rgba(248, 113, 113, 0.16); border: 1px solid rgba(248, 113, 113, 0.4); }
.cg-pc-head .cg-dc-badge { margin-left: 8px; }
.cg-stat-row { margin: auto; display: flex; gap: 16px; width: 100%; justify-content: space-around; flex-wrap: wrap; }
.cg-sr-item { display: flex; flex-direction: column; align-items: center; }
.cg-sr-value { font-size: 20px; font-weight: 700; color: #4ade80; }
.cg-sr-value small { font-size: 11px; margin-left: 2px; opacity: 0.7; }
.cg-sr-label { font-size: 11px; color: var(--cg-text-sub); }
.cg-data-grid { flex: 1; display: grid; gap: 8px; padding: 8px; align-content: center; }
.cg-dg-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--cg-panel); border-radius: 6px; padding: 6px; }
.cg-dg-value { font-size: 16px; font-weight: 700; color: var(--cg-text); }
.cg-dg-label { font-size: 10px; color: var(--cg-text-sub); }
.cg-progress { width: 100%; margin: auto; padding: 0 8px; }
.cg-pc-head { display: flex; justify-content: space-between; font-size: 12px; color: var(--cg-text-sub); margin-bottom: 4px; }
.cg-pc-track { height: 8px; background: var(--cg-grid); border-radius: 4px; overflow: hidden; }
.cg-pc-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.cg-soil { width: 100%; margin: auto; display: flex; flex-direction: column; gap: 4px; padding: 4px; }
.cg-soil-layer { display: flex; justify-content: space-between; padding: 6px 10px; border-radius: 4px; font-size: 12px; color: #fff; }
.cg-alert { width: 100%; margin: auto; display: flex; flex-direction: column; gap: 6px; padding: 6px; }
.cg-alert-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.cg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cg-alert-name { flex: 1; color: var(--cg-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cg-alert-st { font-size: 11px; }
.cg-chart { width: 100%; height: 100%; }
.cg-chart-svg { width: 100%; height: 100%; display: block; }
.cg-gauge-label { text-align: center; font-size: 12px; color: var(--cg-text-sub); margin-top: -6px; }
.cg-container { flex: 1; border: 1px solid var(--cg-panel-border); border-radius: 8px; background: var(--cg-panel); display: flex; flex-direction: column; }
.cg-container.transparent { background: transparent; border-style: dashed; }
.cg-cont-title { padding: 6px 10px; font-size: 12px; font-weight: 600; color: var(--cg-text); border-bottom: 1px solid var(--cg-grid); }
.cg-cont-body { flex: 1; display: flex; }
.cg-tab-cont { flex: 1; display: flex; flex-direction: column; border: 1px solid var(--cg-panel-border); border-radius: 8px; overflow: hidden; }
.cg-tc-tabs { display: flex; height: 30px; border-bottom: 1px solid var(--cg-grid); }
.cg-tc-tab { padding: 0 14px; font-size: 12px; display: flex; align-items: center; color: var(--cg-text-sub); border-right: 1px solid var(--cg-grid); cursor: pointer; }
.cg-tc-tab.active { color: #4ade80; background: rgba(74,222,128,0.08); }
.cg-tc-body { flex: 1; display: flex; }
</style>
