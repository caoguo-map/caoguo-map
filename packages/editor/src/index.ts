/**
 * @caoguo/map-editor —— 草果地图大屏可视化编辑器
 * 拖拽式大屏搭建工具，零代码创建游戏式地图大屏。
 */

// 编辑器主组件
export { default as Editor } from './editor/Editor.vue';
export { default as Toolbar } from './editor/Toolbar.vue';
export { default as ComponentPanel } from './editor/ComponentPanel.vue';
export { default as Canvas } from './editor/Canvas.vue';
export { default as ScreenViewer } from './editor/ScreenViewer.vue';
export { default as PropertyPanel } from './editor/PropertyPanel.vue';
export { default as LayerList } from './editor/LayerList.vue';

// 状态管理
export { useEditor } from './store/useEditor';
export { useHistory, commit as commitHistory, undo, redo, canUndo, canRedo } from './store/useHistory';
export { useDragDrop } from './store/useDragDrop';
export { useDataSources } from './store/useDataSources';
export { useDeviceData } from './store/useDeviceData';

// 组件注册表
export {
  COMPONENT_REGISTRY,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getComponentsByCategory,
  findComponentDef,
  createComponent,
  createLayer,
  genId,
} from './components';

// 类型
export type {
  DashboardConfig,
  CanvasConfig,
  Position,
  DataSource,
  ManagedDataSource,
  DataSourceType,
  DataSourceGroup,
  MapLayer,
  ComponentNode,
  Scene,
  ComponentDef,
  ComponentCategory,
  EditorNode,
} from './types';

// 数据源分组常量（前端分组 UI / 后端代理按类型路由）
export { STATIC_TYPES, API_TYPES, DB_TYPES, PROXY_TYPES } from './types';

// 模板
export { TEMPLATES, getTemplate } from './templates';
export type { TemplateMeta } from './templates';

// 渲染运行时（W4）：JSON → 大屏
export { renderScreen, renderFromJSON, parseScreenJSON } from './runtime/renderScreen';
export type { ScreenHandle } from './runtime/renderScreen';
