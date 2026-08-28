<script setup lang="ts">
import { computed, watch } from 'vue';
import type { EditorNode } from '../../types';
import { useHistory } from '../../store/useHistory';
import { useEditor } from '../../store/useEditor';
import { useDataSources } from '../../store/useDataSources';
import { useDeviceStore } from '../../store/useDeviceStore';
import { findComponentDef } from '../../components';

/**
 * 通用组件配置表单
 * 根据 node.type 渲染该组件专属 config 字段（对应 PRD 3.3 各属性面板）。
 * 字段定义集中维护，便于扩展；缺失字段以组件 defaultConfig 兜底，保证面板完整且有默认值。
 */
const props = defineProps<{ node: EditorNode }>();
const { commit } = useHistory();
const { activeScene } = useEditor();

// 合并组件注册表默认配置与当前节点配置：保证面板永远显示完整、合理的默认值
const def = computed(() => findComponentDef(props.node.type));
const merged = computed(() => ({ ...(def.value?.defaultConfig ?? {}), ...(props.node.config ?? {}) }));

// ── 图表字段下拉（增强）：从绑定数据源的设备实际数值字段推断候选 ──
const { resolveForNode } = useDataSources();
const deviceStore = useDeviceStore();
const NON_SENSOR = new Set(['id', 'name', 'type', 'status', 'lng', 'lat']);
/** 当前组件绑定数据源后，真实设备样本里可用的数值型 sensor 字段（去重、稳定排序） */
const fieldOptions = computed<string[]>(() => {
  const ds = resolveForNode(props.node);
  if (!ds) return [];
  const devs = deviceStore.getDevices(ds.source);
  const seen = new Set<string>();
  for (const d of devs) {
    for (const k of Object.keys(d)) {
      if (NON_SENSOR.has(k)) continue;
      if (typeof d[k] === 'number') seen.add(k);
    }
  }
  return Array.from(seen).sort();
});

// ── 图表字段智能默认值：绑定数据源后，主数值字段为空则自动填入首个候选 ──
const AUTO_FIELD_KEY: Record<string, string> = {
  'trend-chart': 'yField',
  'bar-chart': 'yField',
  'pie-chart': 'valueField',
  'wind-rose': 'speedField',
  'data-card': 'binding',
};
watch(
  fieldOptions,
  (opts) => {
    if (!opts.length) return;
    const key = AUTO_FIELD_KEY[props.node.type];
    if (!key) return;
    // 仅当主字段仍为空时填入首个候选（已手动填过的不覆盖）
    if (!merged.value[key]) set(key, opts[0]);
  },
  { immediate: true },
);

function get(key: string): unknown { return merged.value[key]; }

function set(key: string, val: unknown) {
  commit();
  if (!props.node.config) props.node.config = {};
  props.node.config[key] = val;
}

function num(key: string): number { return Number(get(key) ?? 0); }
function str(key: string): string {
  const v = get(key);
  if (v == null) return '';
  // 对象/数组反序列化为 JSON 文本（textarea 编辑用）
  return typeof v === 'string' ? v : JSON.stringify(v);
}
function bool(key: string): boolean { return Boolean(get(key)); }

/** textarea 内容尝试 JSON 解析：合法 JSON 存结构化值，否则存原始字符串 */
function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** 本地图片上传：转 base64 dataURL 写入 config（大屏产物自包含，无外链依赖） */
function onImageFile(field: Field, ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    set(field.key, String(reader.result));
  };
  reader.readAsDataURL(file);
  input.value = '';
}

// 已有设备图层（供 deviceLayerId 等下拉选择，避免手填不友好）
const deviceLayerOptions = computed(() =>
  (activeScene.value?.layers ?? [])
    .filter((l: any) => l.type === 'device-layer')
    .map((l: any) => ({ label: (l.config?.title as string) || l.id, value: l.id })),
);

// 全部场景（供下钻场景下拉；排除当前节点所在场景，避免自指死循环）
const sceneOptions = computed(() =>
  (useEditor().state.config.scenes ?? [])
    .filter((s: any) => s.key !== activeScene.value?.key)
    .map((s: any) => ({ label: s.title || s.key, value: s.key })),
);

// 各类型字段描述
interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'checkbox' | 'textarea' | 'deviceLayer' | 'scene' | 'imageUpload';
  options?: { label: string; value: string }[];
  hint?: string;
  list?: string;
}

const FIELD_MAP: Record<string, Field[]> = {
  map: [
    { key: 'center', label: '中心(经度,纬度)', type: 'text' },
    { key: 'zoom', label: '缩放级别', type: 'number' },
    { key: 'tiles', label: '底图源', type: 'select', options: [{ label: '天地图', value: 'tianditu' }, { label: 'OSM', value: 'osm' }, { label: '暗色', value: 'dark' }] },
    { key: 'theme', label: '主题', type: 'select', options: [{ label: '暗色', value: 'dark' }, { label: '亮色', value: 'light' }] },
    { key: 'showNavigation', label: '导航控件', type: 'checkbox' },
    { key: 'showScale', label: '比例尺', type: 'checkbox' },
  ],
  text: [
    { key: 'text', label: '文本', type: 'text' },
    { key: 'fontSize', label: '字号', type: 'number' },
    { key: 'fontWeight', label: '字重', type: 'select', options: [{ label: '常规', value: '400' }, { label: '中粗', value: '600' }, { label: '粗', value: '700' }] },
    { key: 'color', label: '颜色', type: 'color' },
    { key: 'align', label: '对齐', type: 'select', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }] },
  ],
  image: [
    { key: 'src', label: '图片（本地转 base64 / 填 URL）', type: 'imageUpload' },
    { key: 'fit', label: '填充', type: 'select', options: [{ label: '覆盖', value: 'cover' }, { label: '包含', value: 'contain' }] },
  ],
  clock: [
    { key: 'format', label: '时间格式', type: 'text' },
    { key: 'showDate', label: '显示日期', type: 'checkbox' },
  ],
  divider: [
    { key: 'color', label: '颜色', type: 'color' },
    { key: 'orientation', label: '方向', type: 'select', options: [{ label: '水平', value: 'horizontal' }, { label: '垂直', value: 'vertical' }] },
  ],
  'device-layer': [
    { key: 'markerSize', label: '标记大小(px)', type: 'number' },
    { key: 'pulseOnWarning', label: '告警脉冲动画', type: 'checkbox' },
    { key: 'clickToDetail', label: '点击展开详情', type: 'checkbox' },
    { key: 'defaultFocus', label: '默认聚焦', type: 'select', options: [{ label: '无', value: 'none' }, { label: '全部', value: 'all' }] },
    { key: 'drillDownSceneKey', label: '下钻场景', type: 'scene', hint: '点击设备标记跳转到该场景（总览→明细）' },
    { key: 'thrField', label: '阈值监控字段', type: 'text', list: 'field-options', hint: '按该字段数值本地判定告警（覆盖后端 status 着色）' },
    { key: 'thrWarn', label: '预警阈值(≥)', type: 'number', hint: '达到则标记为「预警」黄色' },
    { key: 'thrCrit', label: '告警阈值(≥)', type: 'number', hint: '达到则标记为「告警」红色并脉冲' },
  ],
  'device-list': [
    { key: 'deviceLayerId', label: '设备图层', type: 'deviceLayer' },
    { key: 'showFilter', label: '显示筛选', type: 'checkbox' },
    { key: 'showStatusDot', label: '状态点', type: 'checkbox' },
  ],
  'detail-panel': [
    { key: 'deviceLayerId', label: '设备图层', type: 'deviceLayer' },
    { key: 'showTrendChart', label: '显示趋势图', type: 'checkbox' },
    { key: 'trendColor', label: '趋势颜色', type: 'color' },
  ],
  'filter-tabs': [
    { key: 'deviceLayerId', label: '设备图层', type: 'deviceLayer' },
  ],
  'status-bar': [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'showClock', label: '显示时钟', type: 'checkbox' },
    { key: 'showBack', label: '显示返回按钮', type: 'checkbox' },
    { key: 'bgColor', label: '背景色', type: 'color' },
    { key: 'titleColor', label: '标题颜色', type: 'color' },
  ],
  'data-card': [
    { key: 'label', label: '标签', type: 'text' },
    { key: 'value', label: '值', type: 'text' },
    { key: 'unit', label: '单位', type: 'text' },
    { key: 'color', label: '颜色', type: 'color' },
    { key: 'fullRow', label: '占满整行', type: 'checkbox' },
    { key: 'binding', label: '数据绑定', type: 'text', list: 'field-options', hint: '字段名，对接数据源后动态显示数值' },
    { key: 'thrField', label: '阈值监控字段', type: 'text', list: 'field-options', hint: '按该字段数值本地判定告警（覆盖后端 status 着色）' },
    { key: 'thrWarn', label: '预警阈值(≥)', type: 'number', hint: '达到则标记为「预警」黄色' },
    { key: 'thrCrit', label: '告警阈值(≥)', type: 'number', hint: '达到则标记为「告警」红色' },
  ],
  'data-grid': [
    { key: 'columns', label: '列数', type: 'number' },
  ],
  'progress-card': [
    { key: 'label', label: '标签', type: 'text' },
    { key: 'value', label: '当前值', type: 'number' },
    { key: 'max', label: '最大值', type: 'number' },
    { key: 'color', label: '颜色', type: 'color' },
  ],
  'soil-profile': [
    { key: 'layers', label: '剖面层(JSON)', type: 'textarea', hint: '示例: [{"name":"表层","depth":0,"moisture":32,"temp":18}]' },
  ],
  'alert-list': [
    { key: 'maxItems', label: '最多条数', type: 'number' },
    { key: 'deviceLayerId', label: '设备图层', type: 'deviceLayer' },
  ],
  'stat-row': [
    { key: 'items', label: '统计项(JSON)', type: 'textarea', hint: '示例: [{"label":"在线","value":"12","color":"#4ade80"}]' },
  ],
  'trend-chart': [
    { key: 'xField', label: 'X字段', type: 'text', list: 'field-options' },
    { key: 'yField', label: 'Y字段', type: 'text', list: 'field-options' },
    { key: 'lineColor', label: '线条颜色', type: 'color' },
    { key: 'lineWidth', label: '线宽(px)', type: 'number' },
    { key: 'fillArea', label: '填充区域', type: 'checkbox' },
    { key: 'fillOpacity', label: '填充透明度', type: 'number' },
    { key: 'smooth', label: '平滑曲线', type: 'checkbox' },
    { key: 'showPoints', label: '显示数据点', type: 'checkbox' },
    { key: 'yAxisRange', label: 'Y轴范围', type: 'select', options: [{ label: '自动', value: 'auto' }, { label: '0-100', value: '0-100' }] },
    { key: 'showXAxis', label: '显示X轴', type: 'checkbox' },
    { key: 'showYAxis', label: '显示Y轴', type: 'checkbox' },
    { key: 'showGrid', label: '显示网格线', type: 'checkbox' },
    { key: 'xLabelRotate', label: 'X标签旋转(°)', type: 'number' },
  ],
  'bar-chart': [
    { key: 'xField', label: 'X字段', type: 'text', list: 'field-options' },
    { key: 'yField', label: 'Y字段', type: 'text', list: 'field-options' },
    { key: 'barColor', label: '柱颜色', type: 'color' },
  ],
  'pie-chart': [
    { key: 'nameField', label: '名称字段', type: 'text', list: 'field-options' },
    { key: 'valueField', label: '值字段', type: 'text', list: 'field-options' },
    { key: 'doughnut', label: '环形', type: 'checkbox' },
  ],
  'gauge-chart': [
    { key: 'label', label: '标签', type: 'text' },
    { key: 'max', label: '最大值', type: 'number' },
    { key: 'color', label: '颜色', type: 'color' },
  ],
  'wind-rose': [
    { key: 'directionField', label: '方向字段', type: 'text', list: 'field-options' },
    { key: 'speedField', label: '速度字段', type: 'text', list: 'field-options' },
  ],
  'card-container': [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'showTitle', label: '显示标题', type: 'checkbox' },
  ],
  'transparent-container': [],
  'tab-container': [],
};

const fields = computed<Field[]>(() => FIELD_MAP[props.node.type] ?? []);

function onInput(field: Field, ev: Event) {
  const t = ev.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  let val: unknown;
  if (field.type === 'checkbox') val = (t as HTMLInputElement).checked;
  else if (field.type === 'number') val = Number(t.value);
  else if (field.type === 'textarea') val = tryParse(t.value);
  else val = t.value;
  set(field.key, val);
}

// Tab 容器可视化编辑：归一化 tabs 为 [{label}]，并提供增删与子组件归属重映射
function normalizeTabs(raw: unknown): { label: string }[] {
  if (Array.isArray(raw)) {
    return raw.map((x: any) => (typeof x === 'string' ? { label: x } : { label: String(x?.label ?? '标签') }));
  }
  return [];
}
const tabsList = computed({
  get: () => normalizeTabs((props.node.config as Record<string, any>).tabs),
  set: (v) => set('tabs', v),
});
function addTab() {
  tabsList.value = [...tabsList.value, { label: `标签 ${tabsList.value.length + 1}` }];
}
function removeTab(i: number) {
  const next = tabsList.value.slice();
  next.splice(i, 1);
  tabsList.value = next;
  // 删除标签后，归属该标签及之后的子组件需重新映射，避免错位
  const children = (props.node.children as Array<{ tab?: number }> | undefined) ?? [];
  for (const c of children) {
    const t = c.tab ?? 0;
    if (t === i) c.tab = 0;
    else if (t > i) c.tab = t - 1;
  }
}
function updateTab(i: number, label: string) {
  const next = tabsList.value.slice();
  next[i] = { label };
  tabsList.value = next;
}

// 若当前节点是某个 tab-container 的子组件，提供「归属标签」下拉
function findParentContainer(): any | null {
  for (const scene of useEditor().state.config.scenes) {
    const find = (arr: any[]): any => {
      for (const n of arr) {
        if (Array.isArray(n.children) && n.children.some((c: any) => c.id === props.node.id)) return n;
        if (n.children) { const r = find(n.children); if (r) return r; }
      }
      return null;
    };
    const r = find(scene.layers as any[]);
    if (r) return r;
  }
  return null;
}
const parentContainer = computed(() => findParentContainer());
const childTabOptions = computed(() =>
  parentContainer.value?.type === 'tab-container' ? normalizeTabs(parentContainer.value.config.tabs) : [],
);
function setChildTab(ev: Event) {
  (props.node as any).tab = Number((ev.target as HTMLSelectElement).value);
}
</script>

<template>
  <div v-if="fields.length" class="cg-field-group">
    <div class="cg-group-title">{{ node.type }} 配置</div>
    <!-- 字段下拉建议：来自绑定数据源的实际设备数值字段 -->
    <datalist v-if="fieldOptions.length" id="field-options">
      <option v-for="opt in fieldOptions" :key="opt" :value="opt" />
    </datalist>
    <label v-for="f in fields" :key="f.key" class="cg-field">
      <span>{{ f.label }}</span>
      <select v-if="f.type === 'select'" :value="str(f.key)" @change="onInput(f, $event)">
        <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-else-if="f.type === 'deviceLayer'" :value="str(f.key)" @change="onInput(f, $event)">
        <option value="">— 选择图层 —</option>
        <option v-for="o in deviceLayerOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-else-if="f.type === 'scene'" :value="str(f.key)" @change="onInput(f, $event)">
        <option value="">— 无（仅查看详情） —</option>
        <option v-for="o in sceneOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <input v-else-if="f.type === 'checkbox'" type="checkbox" :checked="bool(f.key)" @change="onInput(f, $event)" class="cg-check" />
      <textarea v-else-if="f.type === 'textarea'" :value="str(f.key)" rows="3" :placeholder="f.hint" @change="onInput(f, $event)" />
      <span v-else-if="f.type === 'imageUpload'" class="cg-img-field">
        <input type="text" :value="str(f.key)" :placeholder="f.hint" @change="onInput(f, $event)" />
        <input type="file" accept="image/*" @change="onImageFile(f, $event)" />
        <img v-if="str(f.key)" :src="str(f.key)" class="cg-img-preview" alt="" />
      </span>
      <input v-else-if="f.type === 'number'" type="number" :value="num(f.key)" @change="onInput(f, $event)" />
      <input v-else-if="f.type === 'color'" type="color" :value="str(f.key) || '#4ade80'" @change="onInput(f, $event)" />
      <input v-else type="text" :value="str(f.key)" :placeholder="f.hint" :list="f.list" @change="onInput(f, $event)" />
      <small v-if="f.hint" class="cg-field-hint">{{ f.hint }}</small>
    </label>
  </div>

  <div v-if="node.type === 'tab-container'" class="cg-field-group">
    <div class="cg-group-title">标签页</div>
    <div class="cg-tabs-editor">
      <div v-for="(tab, i) in tabsList" :key="i" class="cg-tab-item">
        <input type="text" v-model="tab.label" @input="updateTab(i, tab.label)" placeholder="标签名" />
        <button type="button" class="cg-tab-del" @click="removeTab(i)" :disabled="tabsList.length <= 1">✕</button>
      </div>
    </div>
    <button type="button" class="cg-tab-add" @click="addTab">+ 新增标签</button>
    <small class="cg-field-hint">拖入该容器的组件可在「归属标签」中选择对应的标签页</small>
  </div>

  <div v-if="childTabOptions.length" class="cg-field-group">
    <div class="cg-group-title">归属标签</div>
    <label class="cg-field">
      <span>显示在该标签页</span>
      <select :value="(node as any).tab ?? 0" @change="setChildTab($event)">
        <option v-for="(t, i) in childTabOptions" :key="i" :value="i">{{ t.label }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.cg-field-group { border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 10px; margin-top: 10px; }
.cg-group-title { font-size: 12px; color: #8b93a7; margin-bottom: 8px; font-weight: 600; }
.cg-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; font-size: 12px; color: #b8c0d4; }
.cg-field > span { opacity: 0.85; }
.cg-field-hint { font-size: 10px; color: #6b7280; opacity: 0.8; word-break: break-all; }
.cg-field input[type="text"], .cg-field input[type="number"], .cg-field select, .cg-field textarea {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e6f0; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none;
}
.cg-field textarea { resize: vertical; font-family: monospace; }
.cg-check { width: 16px; height: 16px; align-self: flex-start; }
.cg-img-field { display: flex; flex-direction: column; gap: 6px; }
.cg-img-field input[type='file'] { font-size: 11px; color: #8b93a7; }
.cg-img-preview { width: 100%; max-height: 80px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,0.04); }
.cg-tabs-editor { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.cg-tab-item { display: flex; gap: 6px; align-items: center; }
.cg-tab-item input { flex: 1; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); color: #e0e6f0; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none; }
.cg-tab-del { background: rgba(255, 80, 80, 0.12); border: 1px solid rgba(255, 80, 80, 0.3); color: #ff8585; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px; }
.cg-tab-del:disabled { opacity: 0.4; cursor: not-allowed; }
.cg-tab-add { margin-top: 4px; background: rgba(74, 222, 128, 0.12); border: 1px solid rgba(74, 222, 128, 0.3); color: #4ade80; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px; align-self: flex-start; }
</style>
