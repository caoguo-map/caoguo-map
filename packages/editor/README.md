# @caoguo/map-editor

草果地图大屏**可视化编辑器** —— 零代码、拖拽式搭建「游戏式地图大屏」。对应 `docs/prd/prd/visual-editor.md`。

## 功能范围（本阶段）

- **编辑器框架**：顶部工具栏 + 左侧组件面板 + 中央画布 + 右侧属性面板 + 底部图层列表。
- **组件面板**：5 大类 24 个组件（基础 / 设备 / 数据卡片 / 图表 / 容器），可拖入画布。
- **画布交互**：拖拽放置、移动、缩放、选中、网格吸附（`snapToGrid` + `gridSize`）、缩放比例。
- **属性面板**：按组件类型动态渲染配置表单（地图 / 设备层 / 数据卡 / 图表等）、数据源表单（static/rest/websocket/binding）、通用位置大小与样式。
- **图层列表**：显隐 / 锁定 / 层级上下移 / 删除。
- **工具栏**：场景切换、新增场景、新增地图、撤销/重做（`Ctrl+Z`/`Ctrl+Y`）、导入/导出 JSON、保存（localStorage + 下载）、预览模式。
- **模板系统**：6 套行业模板（农业 / 管网 / 电网 / 水网 / 交通 / 空白）。
- **JSON Schema**：`DashboardConfig` 与 PRD 第五章完全对应，可作为运行引擎的源配置。

## 数据模型（核心）

```ts
interface DashboardConfig {
  version: string;
  theme: 'dark' | 'light';
  canvas: { width; height; background };
  scenes: Scene[];   // 每个场景 = 一个页面，含 map + layers + components
}
```

- `MapLayer`：渲染在地图上的图层（如 `device-layer`、`map`）。
- `ComponentNode`：叠加在地图上的 UI 组件（设备列表 / 数据卡 / 图表 / 容器等）。

## 使用

```vue
<script setup>
import { Editor } from '@caoguo/map-editor';
import '@caoguo/map-editor/style.css';
</script>

<template>
  <div style="height: 100vh">
    <Editor />
  </div>
</template>
```

以编程方式创建配置：

```ts
import { useEditor, TEMPLATES } from '@caoguo/map-editor';
const { setConfig } = useEditor();
setConfig(TEMPLATES[0].build()); // 套用农业模板
```

## 构建

```bash
pnpm build   # vue-tsc 生成 d.ts + vite 库构建（ESM/CJS/style.css）
```

## 后续阶段（TODO，见 PRD）

- **W3 渲染引擎**：根据 `DashboardConfig` 真实渲染地图底图（maplibre）、设备标记、图表、联动与下钻。
- **W4 交互逻辑**：设备点击联动、筛选、详情面板、数据驱动的实时更新。
- **W5 协作/发布**：多端大屏、导出部署、版本管理。

## 目录

```
src/
  types.ts               # DashboardConfig 等类型（= JSON Schema）
  components.ts          # 组件注册表（24 个组件定义）
  templates.ts           # 行业模板注册表
  store/
    useEditor.ts         # 全局状态（配置/场景/选中/节点增删）
    useHistory.ts        # 撤销/重做
    useDragDrop.ts       # 拖拽/移动/缩放
  editor/
    Editor.vue           # 主容器
    Toolbar.vue          # 顶部工具栏
    ComponentPanel.vue   # 左侧组件面板
    Canvas.vue           # 中央画布
    PropertyPanel.vue    # 右侧属性面板
    LayerList.vue        # 底部图层列表
    properties/          # 配置/数据源/通用属性表单
```
