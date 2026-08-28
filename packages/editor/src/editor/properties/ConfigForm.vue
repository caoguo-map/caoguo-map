<script setup lang="ts">
import { computed } from 'vue';
import type { EditorNode } from '../../types';
import { useHistory } from '../../store/useHistory';
import { useEditor } from '../../store/useEditor';
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

function get(key: string): unknown { return merged.value[key]; }

function set(key: string, val: unknown) {
  commit();
  if (!props.node.config) props.node.config = {};
  props.node.config[key] = val;
}

function num(key: string): number { return Number(get(key) ?? 0); }
function str(key: string): string { return String(get(key) ?? ''); }
function bool(key: string): boolean { return Boolean(get(key)); }

// 已有设备图层（供 deviceLayerId 等下拉选择，避免手填不友好）
const deviceLayerOptions = computed(() =>
  (activeScene.value?.layers ?? [])
    .filter((l: any) => l.type === 'device-layer')
    .map((l: any) => ({ label: (l.config?.title as string) || l.id, value: l.id })),
);

// 各类型字段描述
interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'checkbox' | 'textarea' | 'deviceLayer';
  options?: { label: string; value: string }[];
  hint?: string;
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
    { key: 'src', label: '图片地址', type: 'text' },
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
    { key: 'binding', label: '数据绑定', type: 'text', hint: '字段名，对接数据源后动态显示数值' },
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
    { key: 'xField', label: 'X字段', type: 'text' },
    { key: 'yField', label: 'Y字段', type: 'text' },
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
    { key: 'xField', label: 'X字段', type: 'text' },
    { key: 'yField', label: 'Y字段', type: 'text' },
    { key: 'barColor', label: '柱颜色', type: 'color' },
  ],
  'pie-chart': [
    { key: 'nameField', label: '名称字段', type: 'text' },
    { key: 'valueField', label: '值字段', type: 'text' },
    { key: 'doughnut', label: '环形', type: 'checkbox' },
  ],
  'gauge-chart': [
    { key: 'label', label: '标签', type: 'text' },
    { key: 'max', label: '最大值', type: 'number' },
    { key: 'color', label: '颜色', type: 'color' },
  ],
  'wind-rose': [
    { key: 'directionField', label: '方向字段', type: 'text' },
    { key: 'speedField', label: '速度字段', type: 'text' },
  ],
  'card-container': [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'showTitle', label: '显示标题', type: 'checkbox' },
  ],
  'transparent-container': [],
  'tab-container': [
    { key: 'tabs', label: '标签页(JSON)', type: 'textarea' },
  ],
};

const fields = computed<Field[]>(() => FIELD_MAP[props.node.type] ?? []);

function onInput(field: Field, ev: Event) {
  const t = ev.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  let val: unknown;
  if (field.type === 'checkbox') val = (t as HTMLInputElement).checked;
  else if (field.type === 'number') val = Number(t.value);
  else val = t.value;
  set(field.key, val);
}
</script>

<template>
  <div v-if="fields.length" class="cg-field-group">
    <div class="cg-group-title">{{ node.type }} 配置</div>
    <label v-for="f in fields" :key="f.key" class="cg-field">
      <span>{{ f.label }}</span>
      <select v-if="f.type === 'select'" :value="str(f.key)" @change="onInput(f, $event)">
        <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-else-if="f.type === 'deviceLayer'" :value="str(f.key)" @change="onInput(f, $event)">
        <option value="">— 选择图层 —</option>
        <option v-for="o in deviceLayerOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <input v-else-if="f.type === 'checkbox'" type="checkbox" :checked="bool(f.key)" @change="onInput(f, $event)" class="cg-check" />
      <textarea v-else-if="f.type === 'textarea'" :value="str(f.key)" rows="3" :placeholder="f.hint" @change="onInput(f, $event)" />
      <input v-else-if="f.type === 'number'" type="number" :value="num(f.key)" @change="onInput(f, $event)" />
      <input v-else-if="f.type === 'color'" type="color" :value="str(f.key) || '#4ade80'" @change="onInput(f, $event)" />
      <input v-else type="text" :value="str(f.key)" :placeholder="f.hint" @change="onInput(f, $event)" />
      <small v-if="f.hint" class="cg-field-hint">{{ f.hint }}</small>
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
</style>
