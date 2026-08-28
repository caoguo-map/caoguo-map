/**
 * 草果地图大屏可视化编辑器 —— 核心类型定义
 * 对应 PRD《大屏可视化编辑器》第五章 JSON 配置格式
 */

/** 画布尺寸与背景 */
export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
}

/** 组件/图层绝对定位 */
export interface Position {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 数据源类型 */
export type DataSourceType =
  // 静态数据源
  | 'static'    // 静态 JSON
  | 'excel'     // Excel 文件
  | 'csv'       // CSV 文件
  // 接口类动态数据源
  | 'rest'      // API 接口 (REST)
  | 'websocket' // WebSocket
  | 'webhook'   // Webhook 回调
  | 'postmessage' // PostMessage 跨窗口通信
  // 数据库类动态数据源（经后端数据代理）
  | 'mysql'
  | 'dameng'    // 达梦
  | 'influxdb'  // InfluxDB（时序，查询用 Flux）
  | 'oceanbase' // OceanBase
  | 'clickhouse' // ClickHouse
  // 绑定类数据源（从其他节点/设备图层聚合取数）
  | 'binding';

/** 数据源分组（用于 UI 分组与取数分类） */
export type DataSourceGroup = 'static' | 'api' | 'db';

export const STATIC_TYPES: DataSourceType[] = ['static', 'excel', 'csv'];
export const API_TYPES: DataSourceType[] = ['rest', 'websocket', 'webhook', 'postmessage'];
export const DB_TYPES: DataSourceType[] = ['mysql', 'dameng', 'influxdb', 'oceanbase', 'clickhouse'];
/** 数据库/接口类统一经"后端数据代理"取数（前端无法直接连库/收 Webhook） */
export const PROXY_TYPES: DataSourceType[] = [...API_TYPES.filter((t) => t !== 'postmessage'), ...DB_TYPES];

/** 数据源配置（PRD 4.1 扩展） */
export interface DataSource {
  type: DataSourceType;
  /** API 接口地址（rest / websocket / webhook / 数据库代理 endpoint） */
  url?: string;
  /** 请求方法 */
  method?: 'GET' | 'POST';
  /** 刷新间隔（毫秒） */
  interval?: number;
  /** 请求头 */
  headers?: Record<string, string>;
  /** JSONPath 数据路径（如 data.devices） */
  path?: string;
  /** 字段映射 */
  mapping?: Record<string, string>;
  /** 绑定来源组件 id（type=binding） */
  source?: string;
  /** 聚合方式（binding） */
  aggregate?: 'avg' | 'sum' | 'count' | 'max' | 'min' | 'status-count';
  /** 绑定字段（binding） */
  field?: string;
  /** 静态数据 / 已解析的文件数据（type=static/excel/csv） */
  staticData?: unknown;
  /** 上传文件内容（excel/csv：base64 或文本，运行时解析为数组） */
  fileData?: string;
  /** 文件原始名 */
  fileName?: string;
  /** Webhook 注册地址（可选，发给后端登记回调） */
  webhookUrl?: string;
  /** PostMessage 允许的源（可选，留空不校验） */
  sourceOrigin?: string;
  // —— 数据库连接（mysql/dameng/influxdb/oceanbase/clickhouse）——
  /** 数据库主机 */
  host?: string;
  /** 端口 */
  port?: number;
  /** 数据库名 */
  database?: string;
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
  /** 查询语句（SQL；influxdb 为 Flux） */
  query?: string;
}

/** 全局托管数据源（在数据源管理面板统一维护，可被多个节点引用） */
export interface ManagedDataSource extends DataSource {
  /** 全局唯一 id（节点通过 dataSourceId 引用） */
  id: string;
  /** 展示名称 */
  name: string;
}

/** 地图图层（在地图上渲染的标记等） */
export interface MapLayer {
  id: string;
  type: string;
  position: Position;
  config?: Record<string, unknown>;
  style?: Record<string, string>;
  dataSource?: DataSource;
  /** 引用全局托管数据源 id（优先于 dataSource 内联配置） */
  dataSourceId?: string;
  visible?: boolean;
  locked?: boolean;
  /** 嵌套子节点（图层一般不使用，保留以统一 EditorNode 访问） */
  children?: EditorNode[];
  /** 归属标签页索引（与 ComponentNode.tab 对齐，统一 EditorNode 访问） */
  tab?: number;
}

/** UI 组件（叠加在地图上的面板/卡片/图表等） */
export interface ComponentNode {
  id: string;
  type: string;
  position: Position;
  config?: Record<string, unknown>;
  style?: Record<string, string>;
  dataSource?: DataSource;
  /** 引用全局托管数据源 id（优先于 dataSource 内联配置） */
  dataSourceId?: string;
  visible?: boolean;
  locked?: boolean;
  /** 嵌套子组件（相对父容器定位），容器类组件使用 */
  children?: EditorNode[];
  /** 显示触发条件，如 device-click 时显示详情面板 */
  trigger?: string;
  /** 归属标签页索引（tab-container 子组件用，缺省归第 0 页） */
  tab?: number;
}

/** 场景（一个大屏页面） */
export interface Scene {
  key: string;
  title: string;
  menu?: {
    icon?: string;
    desc?: string;
  };
  map?: {
    center: [number, number];
    zoom: number;
    tiles: 'tianditu' | 'osm' | 'dark' | string;
    theme?: 'dark' | 'light';
  };
  layers: MapLayer[];
  components: ComponentNode[];
}

/** 顶层大屏配置 */
export interface DashboardConfig {
  version: string;
  theme: 'dark' | 'light';
  canvas: CanvasConfig;
  scenes: Scene[];
  /** 全局托管数据源（数据源管理面板维护，可被节点引用） */
  dataSources?: ManagedDataSource[];
  /** 后端数据代理基地址（Webhook 登记 / 数据库代理默认 endpoint），默认 http://localhost:8787 */
  proxyBase?: string;
}

/** 组件分类（组件面板用） */
export type ComponentCategory =
  | 'basic'
  | 'device'
  | 'card'
  | 'chart'
  | 'container';

/** 组件定义（组件注册表项） */
export interface ComponentDef {
  /** 唯一类型标识，对应 JSON 的 type */
  type: string;
  /** 显示名 */
  label: string;
  /** 图标（emoji 或字符） */
  icon: string;
  /** 所属分类 */
  category: ComponentCategory;
  /** 默认尺寸 */
  defaultSize: { w: number; h: number };
  /** 默认 config 样板 */
  defaultConfig?: Record<string, unknown>;
  /** 是否为地图图层（影响渲染层） */
  isLayer?: boolean;
}

/** 编辑器内部：被选中/可拖拽的画布元素（layer 或 component 的联合） */
export type EditorNode = ComponentNode | MapLayer;
