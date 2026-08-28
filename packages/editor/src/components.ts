import type { ComponentDef, ComponentCategory, ComponentNode, MapLayer } from './types';

/**
 * 组件注册表 —— 对应 PRD 3.1 组件面板全部可拖拽组件
 * 每个组件定义默认尺寸与默认配置，拖入画布时自动实例化。
 * icon 字段为 SVG 图标名（见 icons.ts），由 IconSvg 组件渲染。
 */
export const COMPONENT_REGISTRY: ComponentDef[] = [
  // ── 基础组件 ──
  { type: 'map', label: '地图底图', icon: 'map', category: 'basic', defaultSize: { w: 1920, h: 1080 }, defaultConfig: { center: [114.31, 30.59], zoom: 12, tiles: 'tianditu', theme: 'dark', showNavigation: true, showScale: false } },
  { type: 'text', label: '文本标题', icon: 'text', category: 'basic', defaultSize: { w: 240, h: 40 }, defaultConfig: { text: '标题文本', fontSize: 18, fontWeight: '600', color: '#e0e6f0', align: 'left' } },
  { type: 'image', label: '图片', icon: 'image', category: 'basic', defaultSize: { w: 200, h: 120 }, defaultConfig: { src: '', fit: 'cover' } },
  { type: 'clock', label: '时钟', icon: 'clock', category: 'basic', defaultSize: { w: 160, h: 40 }, defaultConfig: { format: 'HH:mm:ss', showDate: true } },
  { type: 'divider', label: '分割线', icon: 'divider', category: 'basic', defaultSize: { w: 400, h: 2 }, defaultConfig: { color: 'rgba(255,255,255,0.12)', orientation: 'horizontal' } },
  { type: 'status-bar', label: '状态栏', icon: 'status-bar', category: 'basic', defaultSize: { w: 1920, h: 52 }, defaultConfig: { title: '智慧草果数字大屏', showClock: true, showBack: true, bgColor: 'rgba(10,15,28,0.9)', titleColor: '#ffffff' } },

  // ── 设备组件 ──
  { type: 'device-layer', label: '设备图层', icon: 'device-layer', category: 'device', defaultSize: { w: 1920, h: 1080 }, isLayer: true, defaultConfig: { markerSize: 36, pulseOnWarning: true, clickToDetail: true, defaultFocus: 'none', schemas: {} } },
  { type: 'device-list', label: '设备列表', icon: 'device-list', category: 'device', defaultSize: { w: 280, h: 1028 }, defaultConfig: { deviceLayerId: '', showFilter: true, showStatusDot: true } },
  { type: 'detail-panel', label: '设备详情', icon: 'detail-panel', category: 'device', defaultSize: { w: 380, h: 1028 }, defaultConfig: { deviceLayerId: '', showTrendChart: true, trendColor: '#4ade80' } },
  { type: 'filter-tabs', label: '筛选标签', icon: 'filter-tabs', category: 'device', defaultSize: { w: 400, h: 48 }, defaultConfig: { deviceLayerId: '', options: [] } },

  // ── 数据卡片 ──
  { type: 'data-card', label: '数据指标卡', icon: 'data-card', category: 'card', defaultSize: { w: 180, h: 80 }, defaultConfig: { label: '指标', value: '0', unit: '', color: '#4ade80', fullRow: false, binding: '' } },
  { type: 'data-grid', label: '数据网格', icon: 'data-grid', category: 'card', defaultSize: { w: 360, h: 200 }, defaultConfig: { columns: 2, items: [] } },
  { type: 'progress-card', label: '进度条', icon: 'progress-card', category: 'card', defaultSize: { w: 200, h: 60 }, defaultConfig: { label: '进度', value: 0, max: 100, color: '#4ade80' } },
  { type: 'soil-profile', label: '土壤剖面', icon: 'soil-profile', category: 'card', defaultSize: { w: 200, h: 260 }, defaultConfig: { layers: [] } },
  { type: 'alert-list', label: '告警列表', icon: 'alert-list', category: 'card', defaultSize: { w: 320, h: 240 }, defaultConfig: { maxItems: 10, deviceLayerId: '' } },
  { type: 'stat-row', label: '统计行', icon: 'stat-row', category: 'card', defaultSize: { w: 600, h: 60 }, defaultConfig: { items: [] } },

  // ── 图表组件 ──
  { type: 'trend-chart', label: '折线图', icon: 'trend-chart', category: 'chart', defaultSize: { w: 360, h: 220 }, defaultConfig: { xField: 'time', yField: 'value', lineColor: '#4ade80', lineWidth: 2, fillArea: true, fillOpacity: 0.3, smooth: true, showPoints: true, yAxisRange: 'auto', showXAxis: true, showYAxis: true, showGrid: true, xLabelRotate: 0 } },
  { type: 'bar-chart', label: '柱状图', icon: 'bar-chart', category: 'chart', defaultSize: { w: 360, h: 220 }, defaultConfig: { xField: 'name', yField: 'value', barColor: '#4ade80' } },
  { type: 'pie-chart', label: '饼图', icon: 'pie-chart', category: 'chart', defaultSize: { w: 240, h: 240 }, defaultConfig: { nameField: 'name', valueField: 'value', doughnut: false } },
  { type: 'gauge-chart', label: '仪表盘', icon: 'gauge-chart', category: 'chart', defaultSize: { w: 200, h: 200 }, defaultConfig: { label: '指标', max: 100, color: '#4ade80' } },
  { type: 'wind-rose', label: '风向玫瑰图', icon: 'wind-rose', category: 'chart', defaultSize: { w: 240, h: 240 }, defaultConfig: { directionField: 'dir', speedField: 'speed' } },

  // ── 容器组件 ──
  { type: 'card-container', label: '卡片容器', icon: 'card-container', category: 'container', defaultSize: { w: 300, h: 200 }, defaultConfig: { title: '容器', showTitle: true } },
  { type: 'transparent-container', label: '透明容器', icon: 'transparent-container', category: 'container', defaultSize: { w: 300, h: 200 }, defaultConfig: {} },
  { type: 'tab-container', label: '标签页容器', icon: 'tab-container', category: 'container', defaultSize: { w: 360, h: 260 }, defaultConfig: { tabs: [{ label: 'Tab 1', content: '' }] } },
];

/** 分类中文名映射 */
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  basic: '基础组件',
  device: '设备组件',
  card: '数据卡片',
  chart: '图表组件',
  container: '容器组件',
};

/** 分类顺序 */
export const CATEGORY_ORDER: ComponentCategory[] = ['basic', 'device', 'card', 'chart', 'container'];

/** 按分类归组组件定义 */
export function getComponentsByCategory(): Record<ComponentCategory, ComponentDef[]> {
  const result = {} as Record<ComponentCategory, ComponentDef[]>;
  for (const cat of CATEGORY_ORDER) result[cat] = [];
  for (const def of COMPONENT_REGISTRY) result[def.category].push(def);
  return result;
}

/** 根据 type 查找组件定义 */
export function findComponentDef(type: string): ComponentDef | undefined {
  return COMPONENT_REGISTRY.find((d) => d.type === type);
}

let idCounter = 0;
/** 生成唯一 id（带前缀，便于调试） */
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** 基于组件定义实例化一个 ComponentNode */
export function createComponent(type: string, x: number, y: number): ComponentNode | null {
  const def = findComponentDef(type);
  if (!def || def.isLayer) return null;
  return {
    id: genId(type),
    type,
    position: { x, y, w: def.defaultSize.w, h: def.defaultSize.h },
    config: structuredClone(def.defaultConfig ?? {}),
    style: {},
    visible: true,
    locked: false,
  };
}

/** 基于组件定义实例化一个 MapLayer */
export function createLayer(type: string, x = 0, y = 0): MapLayer | null {
  const def = findComponentDef(type);
  if (!def?.isLayer) return null;
  return {
    id: genId(type),
    type,
    position: { x, y, w: def.defaultSize.w, h: def.defaultSize.h },
    config: structuredClone(def.defaultConfig ?? {}),
    visible: true,
    locked: false,
  };
}
