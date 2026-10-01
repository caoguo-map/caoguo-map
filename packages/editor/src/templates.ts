import type { DashboardConfig, Scene, ComponentNode, MapLayer } from './types';

/**
 * 行业模板注册表（PRD 6.2）
 * 8 套预置大屏模板（管网/电网/水网/交通/农业/通信/算力/空白），
 * 每套均含「设备图层 + 通用外壳（状态栏/设备列表/详情面板）+ 行业差异化组件」：
 *  - device-layer 带行业 schemas 与专属 REST 取数端点，开箱即可接数据；
 *  - gauge-chart / pie-chart 通过绑定（binding）实时读取设备图层聚合值；
 *  - 各模板额外挂载行业相关组件（告警列表 / 土壤剖面 / 进度卡 / 数据网格等）。
 */
export interface TemplateMeta {
  key: string;
  title: string;
  desc: string;
  icon: string;
  build: () => DashboardConfig;
}

const CANVAS = { width: 1920, height: 1080, background: '#0a0e1a' } as const;
const CENTER: [number, number] = [114.3, 30.58];

type SchemaMap = Record<string, { label: string; icon: string }>;

function deviceLayer(layerId: string, schemas: SchemaMap, url: string): MapLayer {
  return {
    id: layerId,
    type: 'device-layer',
    position: { x: 0, y: 0, w: 1920, h: 1080 },
    config: { markerSize: 36, pulseOnWarning: true, schemas },
    dataSource: {
      type: 'rest',
      url,
      interval: 5000,
      mapping: { id: 'id', name: 'name', type: 'type', status: 'status', lat: 'lat', lng: 'lng' },
    },
  };
}

/** 通用外壳：顶部状态栏 + 左侧设备列表 + 右侧（隐藏）设备详情 */
function chrome(idPrefix: string, layerId: string, title: string, icon: string): ComponentNode[] {
  return [
    {
      id: `${idPrefix}-topbar`,
      type: 'status-bar',
      position: { x: 0, y: 0, w: 1920, h: 52 },
      config: { title: `${icon} ${title}`, showClock: true, showBackButton: true },
      style: { background: 'rgba(10,14,26,0.88)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    },
    {
      id: `${idPrefix}-list`,
      type: 'device-list',
      position: { x: 0, y: 52, w: 280, h: 1028 },
      config: { deviceLayerId: layerId, showFilter: true, showStatusDot: true },
      style: { background: 'rgba(10,14,26,0.88)', borderRight: '1px solid rgba(255,255,255,0.06)' },
    },
    {
      id: `${idPrefix}-detail`,
      type: 'detail-panel',
      position: { x: 1540, y: 52, w: 380, h: 1028 },
      config: { deviceLayerId: layerId, showTrendChart: true },
      visible: false,
      trigger: 'device-click',
    },
  ];
}

/** 行业核心指标仪表盘（绑定设备图层某字段均值） */
function gauge(idPrefix: string, layerId: string, label: string, field: string, color: string): ComponentNode {
  return {
    id: `${idPrefix}-gauge`,
    type: 'gauge-chart',
    position: { x: 290, y: 620, w: 200, h: 200 },
    config: { label, max: 100, color },
    dataSource: { type: 'binding', source: layerId, aggregate: 'avg', field },
  };
}

/** 设备状态分布饼图（绑定设备图层 status-count） */
function statusPie(idPrefix: string, layerId: string): ComponentNode {
  return {
    id: `${idPrefix}-pie`,
    type: 'pie-chart',
    position: { x: 510, y: 620, w: 200, h: 200 },
    config: { label: '设备状态分布' },
    dataSource: { type: 'binding', source: layerId, aggregate: 'status-count' },
  };
}

function scene(key: string, title: string, icon: string, layer: MapLayer, extras: ComponentNode[]): Scene {
  return {
    key,
    title: `${icon} ${title}`,
    menu: { icon, desc: title },
    map: { center: CENTER, zoom: 12, tiles: 'tianditu', theme: 'dark' },
    layers: [layer],
    components: [...chrome(key, layer.id, title, icon), ...extras],
  };
}

function mkConfig(scenes: Scene[]): DashboardConfig {
  return { version: '1.0', theme: 'dark', canvas: { ...CANVAS }, scenes };
}

export const TEMPLATES: TemplateMeta[] = [
  {
    key: 'agriculture',
    title: '智慧农业大屏',
    desc: '农机监控 + 苗情/墒情/气象监测',
    icon: '🌾',
    build: () =>
      mkConfig([
        scene(
          'farm-overview',
          '农场全域总览',
          '🌾',
          deviceLayer('device-layer-1', { machine: { label: '无人农机', icon: '🚜' }, sensor: { label: '环境传感器', icon: '🌱' } }, '/api/devices/farm'),
          [
            { id: 'farm-text', type: 'text', position: { x: 290, y: 70, w: 260, h: 40 }, config: { text: '设备概览', fontSize: 18, fontWeight: '600', color: '#e0e6f0' } },
            gauge('farm-overview', 'device-layer-1', '平均负载', 'load', '#4ade80'),
            statusPie('farm-overview', 'device-layer-1'),
            { id: 'farm-soil', type: 'soil-profile', position: { x: 730, y: 620, w: 200, h: 260 }, config: { layers: [ { name: '表层 0-20cm', value: 42, color: '#8b5a2b' }, { name: '犁底层 20-40cm', value: 35, color: '#a0703a' }, { name: '深层 40-60cm', value: 23, color: '#6b4423' } ] } },
          ],
        ),
      ]),
  },
  {
    key: 'pipeline',
    title: '地下管网大屏',
    desc: '管网拓扑 + 爆管推演 + 健康评估',
    icon: '🏗️',
    build: () =>
      mkConfig([
        scene(
          'pipeline-overview',
          '管网全域总览',
          '🏗️',
          deviceLayer('device-layer-1', { pipe: { label: '管段', icon: '🛢️' }, pump: { label: '泵站', icon: '⚙️' } }, '/api/devices/pipeline'),
          [
            gauge('pipeline-overview', 'device-layer-1', '管网健康度', 'health', '#4ade80'),
            statusPie('pipeline-overview', 'device-layer-1'),
            { id: 'pipe-alert', type: 'alert-list', position: { x: 1330, y: 70, w: 360, h: 460 }, config: { maxItems: 10, deviceLayerId: 'device-layer-1' } },
          ],
        ),
      ]),
  },
  {
    key: 'grid',
    title: '电力网络大屏',
    desc: '变电站拓扑 + 停电分析 + 负荷热力图',
    icon: '⚡',
    build: () =>
      mkConfig([
        scene(
          'grid-overview',
          '电力网络总览',
          '⚡',
          deviceLayer('device-layer-1', { substation: { label: '变电站', icon: '🔌' }, line: { label: '线路', icon: '⚡' } }, '/api/devices/grid'),
          [
            gauge('grid-overview', 'device-layer-1', '平均负荷率', 'load', '#fbbf24'),
            statusPie('grid-overview', 'device-layer-1'),
            { id: 'grid-prog', type: 'progress-card', position: { x: 1330, y: 70, w: 360, h: 60 }, config: { label: '供电可靠率', value: 99.5, max: 100, color: '#4ade80' } },
          ],
        ),
      ]),
  },
  {
    key: 'water',
    title: '水利水系大屏',
    desc: '水系拓扑 + 洪水淹没 + 水库调度',
    icon: '🌊',
    build: () =>
      mkConfig([
        scene(
          'water-overview',
          '水利水系总览',
          '🌊',
          deviceLayer('device-layer-1', { reservoir: { label: '水库', icon: '🏞️' }, pump: { label: '泵站', icon: '⚙️' } }, '/api/devices/water'),
          [
            gauge('water-overview', 'device-layer-1', '平均水位', 'level', '#38bdf8'),
            statusPie('water-overview', 'device-layer-1'),
            { id: 'water-alert', type: 'alert-list', position: { x: 1330, y: 70, w: 360, h: 460 }, config: { maxItems: 10, deviceLayerId: 'device-layer-1' } },
          ],
        ),
      ]),
  },
  {
    key: 'transport',
    title: '交通路况大屏',
    desc: '路网路况 + 事件响应 + 拥堵预测',
    icon: '🚗',
    build: () =>
      mkConfig([
        scene(
          'transport-overview',
          '交通路况总览',
          '🚗',
          deviceLayer('device-layer-1', { camera: { label: '卡口', icon: '📷' }, signal: { label: '信号灯', icon: '🚦' }, sensor: { label: '地磁', icon: '🛰️' } }, '/api/devices/transport'),
          [
            gauge('transport-overview', 'device-layer-1', '平均车速', 'speed', '#4ade80'),
            statusPie('transport-overview', 'device-layer-1'),
            { id: 'trans-prog', type: 'progress-card', position: { x: 1330, y: 70, w: 360, h: 60 }, config: { label: '路网畅通率', value: 92, max: 100, color: '#4ade80' } },
          ],
        ),
      ]),
  },
  {
    key: 'telecom',
    title: '通信基站大屏',
    desc: '基站覆盖 + 信号热力 + 网络健康',
    icon: '📡',
    build: () =>
      mkConfig([
        scene(
          'telecom-overview',
          '通信基站总览',
          '📡',
          deviceLayer('device-layer-1', { base: { label: '基站', icon: '📶' }, fiber: { label: '光交', icon: '🔦' } }, '/api/devices/telecom'),
          [
            gauge('telecom-overview', 'device-layer-1', '信号覆盖率', 'coverage', '#a78bfa'),
            statusPie('telecom-overview', 'device-layer-1'),
            { id: 'tele-alert', type: 'alert-list', position: { x: 1330, y: 70, w: 360, h: 460 }, config: { maxItems: 10, deviceLayerId: 'device-layer-1' } },
          ],
        ),
      ]),
  },
  {
    key: 'compute',
    title: '算力网络大屏',
    desc: '节点分布 + 利用率 + 光缆路由',
    icon: '🖥️',
    build: () =>
      mkConfig([
        scene(
          'compute-overview',
          '算力网络总览',
          '🖥️',
          deviceLayer('device-layer-1', { node: { label: '算力节点', icon: '🖥️' }, router: { label: '路由', icon: '🔀' } }, '/api/devices/compute'),
          [
            gauge('compute-overview', 'device-layer-1', '平均利用率', 'usage', '#f472b6'),
            statusPie('compute-overview', 'device-layer-1'),
            { id: 'comp-grid', type: 'data-grid', position: { x: 1330, y: 70, w: 360, h: 200 }, config: { columns: 2, items: [ { label: '节点 A', value: '在线' }, { label: '节点 B', value: '在线' }, { label: '节点 C', value: '离线' }, { label: '节点 D', value: '在线' } ] } },
          ],
        ),
      ]),
  },
  {
    key: 'blank',
    title: '空白大屏',
    desc: '从零开始搭建',
    icon: '📦',
    build: () => ({
      version: '1.0',
      theme: 'dark',
      canvas: { ...CANVAS },
      scenes: [{ key: 'blank', title: '空白大屏', map: { center: CENTER, zoom: 12, tiles: 'tianditu', theme: 'dark' }, layers: [], components: [] }],
    }),
  },
];

export function getTemplate(key: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
