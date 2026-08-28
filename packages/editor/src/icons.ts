/**
 * 组件类型 → SVG 图标名 映射。
 * 替代原先的 emoji 占位，统一为线性矢量图标（内联 SVG，currentColor 描边）。
 */

export type IconName =
  | 'map'
  | 'text'
  | 'image'
  | 'clock'
  | 'divider'
  | 'device-layer'
  | 'device-list'
  | 'detail-panel'
  | 'filter-tabs'
  | 'data-card'
  | 'data-grid'
  | 'progress-card'
  | 'soil-profile'
  | 'alert-list'
  | 'stat-row'
  | 'trend-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'gauge-chart'
  | 'wind-rose'
  | 'card-container'
  | 'transparent-container'
  | 'tab-container'
  | 'status-bar'
  | 'box';

/** 组件类型对应的图标名（与 components.ts 的 type 字段一一对应） */
export const COMPONENT_ICON: Record<string, IconName> = {
  map: 'map',
  text: 'text',
  image: 'image',
  clock: 'clock',
  divider: 'divider',
  'device-layer': 'device-layer',
  'device-list': 'device-list',
  'detail-panel': 'detail-panel',
  'filter-tabs': 'filter-tabs',
  'data-card': 'data-card',
  'data-grid': 'data-grid',
  'progress-card': 'progress-card',
  'soil-profile': 'soil-profile',
  'alert-list': 'alert-list',
  'stat-row': 'stat-row',
  'trend-chart': 'trend-chart',
  'bar-chart': 'bar-chart',
  'pie-chart': 'pie-chart',
  'gauge-chart': 'gauge-chart',
  'wind-rose': 'wind-rose',
  'card-container': 'card-container',
  'transparent-container': 'transparent-container',
  'tab-container': 'tab-container',
  'status-bar': 'status-bar',
};

export function iconOf(type: string): IconName {
  return COMPONENT_ICON[type] ?? 'box';
}

/**
 * 各图标的 SVG path（24×24 viewBox，统一 1.8 描边、圆角、currentColor）。
 * 用数组便于一个 path 或多个 path 组合。
 */
export const ICON_PATHS: Record<IconName, string[]> = {
  // 地图底图：折叠地图 + 定位针
  map: [
    'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z',
    'M9 4v14M15 6v14',
    'M16 9a2 2 0 1 0 0 0.01',
  ],
  // 文本标题
  text: ['M5 6h14M12 6v12M9 18h6'],
  // 图片
  image: [
    'M4 5h16v14H4Z',
    'M4 15l4-4 3 3 4-5 5 6',
    'M9 9a1.2 1.2 0 1 0 0 0.01',
  ],
  // 时钟
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 7v5l3 2'],
  // 分割线
  divider: ['M4 12h16', 'M4 8h16M4 16h16'],
  // 设备图层：定位针 + 图层
  'device-layer': [
    'M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z',
    'M12 10a2 2 0 1 0 0 0.01',
  ],
  // 设备列表：列表行 + 圆点
  'device-list': [
    'M8 6h12M8 12h12M8 18h12',
    'M4 6h.01M4 12h.01M4 18h.01',
  ],
  // 设备详情：卡片 + 信息行
  'detail-panel': [
    'M4 5h16v14H4Z',
    'M8 9h8M8 13h8M8 17h5',
  ],
  // 筛选标签
  'filter-tabs': ['M4 5h16v5H4Z', 'M4 14h10v5H4Z', 'M18 14h2v5h-2Z'],
  // 数据指标卡：方块 + 数字线
  'data-card': ['M4 5h16v14H4Z', 'M8 10h8M8 14h5'],
  // 数据网格
  'data-grid': [
    'M4 4h16v16H4Z',
    'M4 10h16M4 15h16M10 4v16M15 4v16',
  ],
  // 进度条
  'progress-card': ['M4 10h16v4H4Z', 'M4 12h9'],
  // 土壤剖面：层叠
  'soil-profile': [
    'M4 6h16M4 10h16M4 14h16M4 18h16',
    'M7 6v12',
  ],
  // 告警列表：三角叹号 + 列表
  'alert-list': [
    'M12 4 3 19h18L12 4Z',
    'M12 10v4M12 17h.01',
  ],
  // 统计行
  'stat-row': ['M4 8h16M4 12h16M4 16h10'],
  // 折线图
  'trend-chart': ['M4 4v16h16', 'M7 14l4-4 3 3 4-6'],
  // 柱状图
  'bar-chart': ['M4 4v16h16', 'M8 16v-5M12 16V8M16 16v-8'],
  // 饼图
  'pie-chart': [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    'M12 3v9h9',
  ],
  // 仪表盘
  'gauge-chart': [
    'M4 14a8 8 0 0 1 16 0',
    'M12 14l4-4',
    'M12 14h.01',
  ],
  // 风向玫瑰
  'wind-rose': [
    'M12 3v18M3 12h18',
    'M12 3l3 4-3-1-3 1 3-4Z',
    'M12 21l3-4-3 1-3-1 3 4Z',
    'M3 12l4-3 1 3-1 3-4-3Z',
    'M21 12l-4-3-1 3 1 3 4-3Z',
  ],
  // 卡片容器
  'card-container': ['M4 5h16v14H4Z', 'M4 9h16'],
  // 透明容器
  'transparent-container': [
    'M4 5h16v14H4Z',
    'M9 9l6 6M15 9l-6 6',
  ],
  // 标签页容器
  'tab-container': [
    'M4 5h16v14H4Z',
    'M4 9h6v5H4Z',
    'M10 9h10',
  ],
  // 状态栏：长条 + 圆点指示
  'status-bar': [
    'M3 6h18v12H3Z',
    'M7 12h2M12 12h2M17 12h2',
    'M7 9h.01M12 9h.01M17 9h.01',
  ],
  // 兜底
  box: ['M4 5h16v14H4Z', 'M4 9h16', 'M9 9v10', 'M15 9v10'],
};
