import type { DashboardConfig, Scene } from './types';

/**
 * 行业模板注册表（PRD 6.2）
 * agriculture 使用完整手写 JSON（见 agriculture.json 思路，此处代码化）。
 * 其余模板按相同结构程序化生成基础骨架，用户可在此基础上改数据源与布局。
 */
export interface TemplateMeta {
  key: string;
  title: string;
  desc: string;
  icon: string;
  build: () => DashboardConfig;
}

function baseScene(key: string, title: string, icon: string, center: [number, number]): Scene {
  return {
    key,
    title: `${icon} ${title}`,
    menu: { icon, desc: title },
    map: { center, zoom: 12, tiles: 'tianditu', theme: 'dark' as const },
    layers: [
      {
        id: 'device-layer-1',
        type: 'device-layer',
        position: { x: 0, y: 0, w: 1920, h: 1080 },
        config: { markerSize: 36, pulseOnWarning: true },
        dataSource: { type: 'rest' as const, url: '/api/devices', interval: 5000, mapping: { id: 'id', name: 'name', type: 'type', status: 'status', lat: 'lat', lng: 'lng' } },
      },
    ],
    components: [
      { id: 'topbar-1', type: 'status-bar', position: { x: 0, y: 0, w: 1920, h: 52 }, config: { title: `${icon} ${title}`, showClock: true, showBackButton: true }, style: { background: 'rgba(10,14,26,0.88)', borderBottom: '1px solid rgba(255,255,255,0.06)' } },
      { id: 'device-list-1', type: 'device-list', position: { x: 0, y: 52, w: 280, h: 1028 }, config: { deviceLayerId: 'device-layer-1', showFilter: true, showStatusDot: true }, style: { background: 'rgba(10,14,26,0.88)', borderRight: '1px solid rgba(255,255,255,0.06)' } },
      { id: 'detail-panel-1', type: 'detail-panel', position: { x: 1540, y: 52, w: 380, h: 1028 }, config: { deviceLayerId: 'device-layer-1', showTrendChart: true }, visible: false, trigger: 'device-click' },
      { id: 'pie-1', type: 'pie-chart', position: { x: 20, y: 820, w: 200, h: 200 }, config: { label: '状态分布' }, dataSource: { type: 'binding' as const, source: 'device-layer-1', aggregate: 'status-count' as const } },
    ],
  };
}

export const TEMPLATES: TemplateMeta[] = [
  {
    key: 'agriculture',
    title: '智慧农业大屏',
    desc: '农机监控 + 苗情/墒情/气象监测',
    icon: '🌾',
    build: () => ({ version: '1.0', theme: 'dark', canvas: { width: 1920, height: 1080, background: '#0a0e1a' }, scenes: [baseScene('farm-overview', '农场全域总览', '🌾', [114.30, 30.58])] }),
  },
  {
    key: 'pipeline',
    title: '地下管网大屏',
    desc: '管网拓扑 + 爆管推演 + 健康评估',
    icon: '🏗️',
    build: () => ({ version: '1.0', theme: 'dark', canvas: { width: 1920, height: 1080, background: '#0a0e1a' }, scenes: [baseScene('pipeline-overview', '管网全域总览', '🏗️', [114.30, 30.58])] }),
  },
  {
    key: 'grid',
    title: '电力网络大屏',
    desc: '变电站拓扑 + 停电分析 + 负荷热力图',
    icon: '⚡',
    build: () => ({ version: '1.0', theme: 'dark', canvas: { width: 1920, height: 1080, background: '#0a0e1a' }, scenes: [baseScene('grid-overview', '电力网络总览', '⚡', [114.30, 30.58])] }),
  },
  {
    key: 'water',
    title: '水利水系大屏',
    desc: '水系拓扑 + 洪水淹没 + 水库调度',
    icon: '🌊',
    build: () => ({ version: '1.0', theme: 'dark', canvas: { width: 1920, height: 1080, background: '#0a0e1a' }, scenes: [baseScene('water-overview', '水利水系总览', '🌊', [114.30, 30.58])] }),
  },
  {
    key: 'transport',
    title: '交通路况大屏',
    desc: '路网路况 + 事件响应 + 拥堵预测',
    icon: '🚗',
    build: () => ({ version: '1.0', theme: 'dark', canvas: { width: 1920, height: 1080, background: '#0a0e1a' }, scenes: [baseScene('transport-overview', '交通路况总览', '🚗', [114.30, 30.58])] }),
  },
  {
    key: 'blank',
    title: '空白大屏',
    desc: '从零开始搭建',
    icon: '📦',
    build: () => ({
      version: '1.0', theme: 'dark', canvas: { width: 1920, height: 1080, background: '#0a0e1a' },
      scenes: [{ key: 'blank', title: '空白大屏', map: { center: [114.31, 30.59], zoom: 12, tiles: 'tianditu', theme: 'dark' }, layers: [], components: [] }],
    }),
  },
];

export function getTemplate(key: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
