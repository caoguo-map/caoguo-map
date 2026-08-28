# 草果地图 · 大屏组件库 — 功能说明 PRD（**已归档**）

> ## ⚠️ 本文档已归档，不再单独维护
>
> **决策（2026-08-28，方案 A）**：组件库**随 `@caoguo/map-editor` 交付**，不设独立包。
> **组件库的唯一事实源是 [`visual-editor.md` §14「组件库」](./visual-editor.md)**（交付形态、落地状态、规划中项、未来独立发包路径）。
>
> 本文档保留作为**目标设计存档**（组件地图、场景速查、Props 设计等），其中：
> - **落地状态一律以 `visual-editor.md` §14.2 为准**，本文档 §2.0 起的标注仅作历史记录；
> - §2.1 起描述的组件 API 为**目标设计**，当前并未实现为可复用组件，**不可对外承诺**。

| 项目 | 说明 |
|------|------|
| **产品名称** | 大屏组件库（**当前无独立包**，组件随 `@caoguo/map-editor` 交付；唯一事实源见 `visual-editor.md` §14） |
| **定位** | 基于 Vue 3 的智慧大屏地图组件库 |
| **核心价值** | 让前端工程师 30 分钟内搭出行业地图大屏 |
| **文档版本** | V1.2（**已归档**：方案 A 决策落地，状态与交付形态移交给 `visual-editor.md` §14） |
| **编写日期** | 2026-08-22 |
| **归档日期** | 2026-08-28 |

---

## 一、这个库解决什么问题

### 1.1 没有这个库时

```
前端工程师要做一个"智慧水务大屏"
    ↓
1. 学 MapLibre GL JS（2 天）
2. 写地图初始化 + 样式配置（1 天）
3. 写设备标记组件 + 状态着色 + 动画（2 天）
4. 写左侧面板 + 右侧面板 + 状态栏（2 天）
5. 集成 ECharts 写趋势图（1 天）
6. 写数据刷新逻辑（1 天）
7. 调样式、调动画、调兼容性（2 天）
    ↓
总计：11 天，而且每个新项目重复做一遍
```

### 1.2 有这个库之后

```
前端工程师要做一个"智慧水务大屏"
    ↓
1. 定义设备 Schema（10 分钟）
2. 配置场景数据（10 分钟）
3. 用组件拼装页面（10 分钟）
    ↓
总计：30 分钟
```

---

## 二、组件总览

### 2.0 交付形态与落地状态（V1.1 补充，2026-08-28）

> **重要更正**：本 PRD 初稿按独立包 `@caoguo/map-components` 描述组件库，但**该包在仓库中并不存在**（`packages/` 下无此目录，全仓 `package.json` 检索无此包名）。组件实际以两种形态存在于 `@caoguo/map-editor` 内部：

| 形态 | 组件 | 位置 | 可独立复用 |
|------|------|------|-----------|
| 独立 `.vue` 组件 | `MapNode`（地图）、`DeviceList`、`DetailPanel`、`FilterTabs`、`StatusBar` | `packages/editor/src/editor/` | ❌ 包入口未导出，且依赖编辑器 store（`useEditor` / `useDeviceData`），脱离 `Editor` 无法使用 |
| 按 `type` 内联渲染 | `data-card` / `stat-row` / `data-grid` / `progress-card` / `soil-profile` / `alert-list` / `trend-chart` / `bar-chart` / `pie-chart` / `gauge-chart` / `wind-rose` / 容器类 | `ComponentView.vue` 的 `v-if` 分支 | ❌ 无独立组件文件，仅编辑器与运行时内部渲染 |

**组件落地状态对照**

| PRD 组件 | 实现位置 | 状态 |
|----------|----------|------|
| `CaoguoMap`（独立地图容器） | — | ❌ 未落地（编辑器内为 `MapNode.vue`，非对外组件） |
| `DeviceLayer`（独立标记图层组件） | — | ❌ 未落地（编辑器内 `device-layer` 是图层数据，由 `MapNode` 渲染） |
| `MenuScreen`（菜单首页） | — | ❌ 未落地 |
| `DeviceList` / `DetailPanel` / `FilterTabs` / `StatusBar` | `editor/*.vue` | 🟡 已实现但**未对外导出** |
| `DataCard` / `DataGrid` / `ProgressCard` / `SoilProfile` / `AlertList` / `StatRow` | `ComponentView.vue` | 🟡 已实现但**无独立组件** |
| `TrendChart` / `BarChart` / `GaugeChart` / `PieChart` / `WindRose` | `ComponentView.vue` | 🟡 已实现但**无独立组件** |
| 主题 `dark.css` / `light.css` | `@caoguo/theme` → `styles/tokens.css` | ✅ 已落地（CSS 变量，随 `data-theme` 切换） |
| 主题 `agriculture.css` | — | ❌ 未落地（农业场景改用编辑器模板 `templates/agriculture.json` + 行业主题色板） |

**决策（2026-08-28）：采用方案 A。**

- ✅ **方案 A（已采用）**：组件库**并入 `visual-editor.md` §14「组件库」**，明确"组件随 `@caoguo/map-editor` 交付"；`CaoguoMap` / `DeviceLayer` / `MenuScreen` 标注为**规划中**。本文档同步归档，落地状态与交付形态以 §14 为唯一事实源。
- ⏸ **方案 B（暂不执行）**：新建 `packages/components` 并独立发包 `@caoguo/map-components`。留待出现"只用组件、不装编辑器"的真实需求时再启动，路径见 `visual-editor.md` §14.4。

> **请勿对外承诺本 PRD 中的组件 API**。下文（§2.1 起）为**目标设计**，当前并未实现为可复用组件；实际可用能力见 `visual-editor.md` §14。

### 2.1 组件地图

```
@caoguo/map-editor（内部实现，未独立发包）
│
├── 🗺️ 地图组件
│   └── CaoguoMap              地图容器（一行创建地图）
│
├── 📍 设备组件
│   └── DeviceLayer            设备标记图层（自动着色+动画）
│
├── 📋 面板组件
│   ├── MenuScreen             菜单首页（游戏式卡片选择）
│   ├── DeviceList             设备列表（左侧面板）
│   ├── DetailPanel            详情面板（右侧面板）
│   ├── FilterTabs             筛选标签栏
│   └── StatusBar              底部状态栏
│
├── 🃏 数据卡片
│   ├── DataCard               单个数据指标
│   ├── DataGrid               卡片网格布局
│   ├── ProgressCard           进度条
│   ├── SoilProfile            土壤剖面图
│   ├── AlertList              告警列表
│   └── StatRow                横排统计数字
│
├── 📊 图表组件（第三方图表库驱动）
│   ├── TrendChart             趋势折线图
│   ├── BarChart               柱状图
│   ├── GaugeChart             仪表盘
│   ├── PieChart               饼图
│   └── WindRose               风向玫瑰图
│
└── 🎨 主题系统
    ├── dark.css               暗色主题
    ├── light.css              亮色主题
    └── agriculture.css        农业主题
```

### 2.2 按使用场景速查

| 我想做什么 | 用哪个组件 | 状态 |
|-----------|-----------|------|
| 在页面上放一个地图 | `CaoguoMap` | ❌ 未落地（无独立包） |
| 在地图上显示设备标记 | `DeviceLayer` | ❌ 未落地（无独立包） |
| 做一个游戏式菜单选择场景 | `MenuScreen` | ❌ 未落地（无独立包） |
| 做一个设备列表（左边栏） | `DeviceList` | 🟡 已实现（编辑器内部，未导出） |
| 做一个设备详情（右边栏） | `DetailPanel` | 🟡 已实现（编辑器内部，未导出） |
| 按设备类型筛选 | `FilterTabs` | 🟡 已实现（编辑器内部，未导出） |
| 底部显示在线数/更新时间 | `StatusBar` | 🟡 已实现（编辑器内部，未导出） |
| 显示一个数据指标（压力/流量/温度） | `DataCard` | 🟡 已实现（编辑器内部，未导出） |
| 显示多个数据指标的网格 | `DataGrid` | 🟡 已实现（编辑器内部，未导出） |
| 显示进度条（农机作业进度） | `ProgressCard` | 🟡 已实现（编辑器内部，未导出） |
| 显示土壤含水率剖面 | `SoilProfile` | 🟡 已实现（编辑器内部，未导出） |
| 显示告警列表 | `AlertList` | 🟡 已实现（编辑器内部，未导出） |
| 显示横排统计数字 | `StatRow` | 🟡 已实现（编辑器内部，未导出） |
| 画趋势折线图 | `TrendChart` | 🟡 已实现（编辑器内部，未导出） |
| 画柱状图 | `BarChart` | 🟡 已实现（编辑器内部，未导出） |
| 画仪表盘（电量/负载率） | `GaugeChart` | 🟡 已实现（编辑器内部，未导出） |
| 画饼图（设备状态占比） | `PieChart` | 🟡 已实现（编辑器内部，未导出） |
| 画风向玫瑰图（气象站） | `WindRose` | 🟡 已实现（编辑器内部，未导出） |

---

## 三、各组件详细说明

### 3.1 CaoguoMap — 地图容器

**作用**：在页面上创建一个地图，一行代码搞定。

**用户看到的效果**：

```
┌──────────────────────────────────┐
│                                  │
│         地图（全屏渲染）           │
│    支持缩放/平移/旋转/倾斜         │
│    内置天地图/高德/离线底图        │
│    预置暗色/亮色等主题             │
│                                  │
└──────────────────────────────────┘
```

**使用方式**：

```vue
<CaoguoMap
  :center="[114.31, 30.59]"
  :zoom="12"
  theme="dark"
  tiles="tianditu"
  tianditu-key="your_key"
/>
```

**配置项**：

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `center` | `[lng, lat]` | `[0, 0]` | 地图中心点 |
| `zoom` | `number` | `1` | 缩放级别 |
| `theme` | `string` | `'dark'` | 主题：dark / light / agriculture |
| `tiles` | `string` | `'tianditu'` | 底图：tianditu / gaode / offline |
| `tiandituKey` | `string` | — | 天地图 API Key |
| `navigation` | `boolean` | `true` | 显示缩放+指南针控件 |
| `scale` | `boolean` | `false` | 显示比例尺 |

**可做的事**：

```js
map.flyTo([114.31, 30.59], 15)     // 飞到某个位置
map.setTheme('light')               // 切换主题
map.setBaseLayer('gaode')           // 切换底图
```

---

### 3.2 DeviceLayer — 设备图层

**作用**：在地图上显示一组设备标记，自动根据状态着色和播放动画。

**用户看到的效果**：

```
地图上出现多个设备标记：
  🟢 绿色圆形 = 在线
  🟡 黄色圆形（脉冲） = 告警
  🔴 红色圆形（脉冲） = 离线
  🔷 青色方向三角（脉冲） = 作业中（农机专用）
  🟩 绿色方向三角 = 待命（农机专用）
```

**使用方式**：

```vue
<DeviceLayer
  :map="mapInstance"
  :devices="deviceList"
  :schemas="MY_SCHEMAS"
  @device-click="showDetail"
/>
```

**配置项**：

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `map` | `Map` | — | 地图实例 |
| `devices` | `Device[]` | — | 设备数组 |
| `schemas` | `object` | — | 设备类型定义 |
| `size` | `number` | `36` | 标记大小(px) |
| `pulseOnWarning` | `boolean` | `true` | 告警设备脉冲动画 |

**自动行为**：

| 设备 type | 标记形状 | 触发条件 |
|-----------|---------|---------|
| `machine` | 方向三角 ▶ | type === 'machine' |
| 其他 | 圆形 ⬤ | 默认 |

| 设备 status | 颜色 | 动画 |
|-------------|------|------|
| `online` | 绿色 | 无 |
| `working` | 青色 | 脉冲 1.5s |
| `warning` | 黄色 | 脉冲 2s |
| `offline` | 红色 | 无 |
| `error` | 红色 | 脉冲 2s |

**可做的事**：

```js
layer.focus('UAV-001')                    // 飞到并高亮某设备
layer.unfocus()                            // 取消高亮
layer.updateDevice('UAV-001', { status: 'warning' })  // 更新单个设备
layer.clear()                              // 清除所有标记
```

---

### 3.3 MenuScreen — 菜单首页

**作用**：游戏式菜单首页，点击卡片进入不同行业场景。

**用户看到的效果**：

```
┌─────────────────────────────────────────┐
│                                          │
│          🌾 智 慧 农 业                   │
│    草果地图 · 农业空间智能平台              │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │🌾 农场   │ │🚜 农机   │ │🌱 苗情   ││
│  │全域总览  │ │4 台设备  │ │3 个站点  ││
│  └──────────┘ └──────────┘ └──────────┘│
│  ┌──────────┐ ┌──────────┐             │
│  │🌍 墒情   │ │🌤️ 气象   │             │
│  │3 个站点  │ │2 个站点  │             │
│  └──────────┘ └──────────┘             │
└─────────────────────────────────────────┘
```

**使用方式**：

```vue
<MenuScreen
  :items="menuItems"
  title="🌾 智慧农业"
  subtitle="草果地图 · 农业空间智能平台"
  :columns="3"
  @select="enterScene"
/>
```

**配置项**：

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `items` | `MenuItem[]` | — | 菜单项数组 |
| `title` | `string` | — | 页面大标题 |
| `subtitle` | `string` | — | 副标题 |
| `columns` | `number` | `3` | 每行列数 |

**MenuItem 结构**：

```typescript
{
  key: 'pipeline',      // 唯一标识
  icon: '🔥',           // 卡片图标
  title: '地下管网',     // 卡片标题
  desc: '燃气/供水/供热', // 卡片描述
  count: 128,           // 右上角数字标签
  center: [114.3, 30.5], // 点击后地图飞行目标
  zoom: 13,             // 点击后地图缩放
}
```

**可自定义**：

```vue
<MenuScreen :items="items" @select="onSelect">
  <template #card="{ item }">
    <!-- 完全自定义卡片内容 -->
    <div class="my-card">{{ item.icon }} {{ item.title }}</div>
  </template>
</MenuScreen>
```

---

### 3.4 DeviceList — 设备列表

**作用**：左侧面板，展示当前场景的所有设备，点击选中。

**用户看到的效果**：

```
┌──────────────────┐
│ 设备列表           │
│                  │
│ ● 光谷调压站 A    │
│ ● 关山管段       │  ← 点击选中
│ ○ 雄楚大道管网   │
│ ● 珞瑜路供水     │
│                  │
│ (● 绿=在线       │
│  ○ 黄=告警       │
│  ○ 红=离线)      │
└──────────────────┘
```

**使用方式**：

```vue
<DeviceList
  :devices="filteredDevices"
  :selected-id="selectedId"
  :schemas="MY_SCHEMAS"
  @select="onDeviceSelect"
>
  <template #before-list>
    <!-- 在列表上方插入筛选标签 -->
    <FilterTabs v-model="filter" :types="filterTypes" />
  </template>
</DeviceList>
```

**配置项**：

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `devices` | `Device[]` | — | 设备数组 |
| `selected-id` | `string \| null` | `null` | 当前选中设备 ID |
| `schemas` | `object` | — | 设备类型定义（用于显示类型标签） |

**插槽**：

| 插槽名 | 作用域 | 说明 |
|--------|--------|------|
| `#before-list` | — | 列表上方（放筛选标签） |
| `#item` | `{ device, schema }` | 自定义列表项渲染 |
| `#empty` | — | 空列表时的提示 |

---

### 3.5 DetailPanel — 详情面板

**作用**：右侧面板，展示选中设备的完整数据。

**用户看到的效果**：

```
┌──────────────────────────────────┐
│ 🚜 极飞 P150 旋耕机 #1    [✕]   │
│ 无人农机 · UAV-001               │
├──────────────────────────────────┤
│ 任务进度                          │
│ ████████████████░░░░ 68%         │
│                                  │
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ 42.5 │ │ 5.2  │ │ 73%  │     │
│ │已作业 │ │ 速度 │ │ 电量 │     │
│ │ (亩)  │ │km/h  │ │  (%) │     │
│ └──────┘ └──────┘ └──────┘     │
├──────────────────────────────────┤
│ 实时数据                          │
│ ┌───────────┐ ┌───────────┐     │
│ │ 作业速度   │ │ 电量/油量  │     │
│ │ 5.2 km/h  │ │ 73 %      │     │
│ ├───────────┤ ├───────────┤     │
│ │ 已作业面积  │ │ 作业类型   │     │
│ │ 42.5 亩   │ │ 旋耕作业   │     │
│ ├───────────┴─┴───────────┤     │
│ │ 运行状态                  │     │
│ │ 作业中 · 航线 A3          │     │
│ └─────────────────────────┘     │
├──────────────────────────────────┤
│ 告警信息                          │
│ ● 电量低于 50%，建议返航充电       │
│   3 分钟前                        │
├──────────────────────────────────┤
│ 趋势（近 24h）                    │
│ ~~~~~~~~ 折线图 ~~~~~~~~         │
└──────────────────────────────────┘
```

**使用方式**：

```vue
<DetailPanel
  :device="selectedDevice"
  :schema="selectedSchema"
  :visible="panelVisible"
  @close="panelVisible = false"
>
  <!-- 在数据卡片区域之前插入自定义内容 -->
  <template #before-data="{ device }">
    <ProgressCard v-if="device.type === 'machine'" :value="68" label="任务进度" />
    <SoilProfile v-if="device.type === 'soil'" :layers="soilLayers" />
  </template>

  <!-- 在告警之后追加图表 -->
  <template #after-alerts="{ device }">
    <TrendChart :data="trendData" color="#4ade80" height="100" />
  </template>
</DetailPanel>
```

**自动渲染逻辑**：

1. 根据 `schema.fields` 自动渲染数据卡片（2 列网格）
2. 标记 `fullWidth: true` 的字段占满整行
3. 自动显示告警列表
4. 用户通过插槽在任意位置插入自定义内容

**插槽**：

| 插槽名 | 作用域 | 典型用途 |
|--------|--------|---------|
| `#header` | `{ device, schema }` | 自定义面板头部 |
| `#before-data` | `{ device, schema }` | 数据卡片前（进度条/剖面图） |
| `#data` | `{ device, schema }` | 替换整个数据区域 |
| `#after-data` | `{ device, schema }` | 数据卡片后 |
| `#alerts` | `{ device }` | 替换告警列表 |
| `#after-alerts` | `{ device }` | 告警后追加内容（图表） |

---

### 3.6 FilterTabs — 筛选标签

**作用**：按设备类型筛选，标签栏样式。

**用户看到的效果**：

```
[全部 (12)] [🚜 农机 (4)] [🌱 苗情 (3)] [🌍 墒情 (3)] [🌤️ 气象 (2)]
```

**使用方式**：

```vue
<FilterTabs
  v-model="activeFilter"
  :types="[
    { key: 'all', label: '全部', icon: '📋', count: 12 },
    { key: 'machine', label: '无人农机', icon: '🚜', count: 4 },
    { key: 'seedling', label: '苗情', icon: '🌱', count: 3 },
  ]"
/>
```

---

### 3.7 StatusBar — 状态栏

**作用**：底部状态栏，显示在线数和更新时间。

**用户看到的效果**：

```
🟢 系统运行正常    在线设备: 10/12    最后更新: 22:17:05
```

**使用方式**：

```vue
<StatusBar :online="10" :total="12" />
```

---

### 3.8 数据卡片组件

#### DataCard — 单个数据指标

```vue
<DataCard label="压力" :value="0.42" unit="MPa" color="green" />
```

效果：

```
┌─────────────┐
│ 压力         │
│ 0.42 MPa    │  ← 绿色
└─────────────┘
```

| 配置 | 类型 | 说明 |
|------|------|------|
| `label` | `string` | 指标名称 |
| `value` | `number \| string` | 指标值 |
| `unit` | `string` | 单位 |
| `color` | `'green' \| 'yellow' \| 'red' \| 'cyan' \| 'blue'` | 值的颜色 |
| `fullWidth` | `boolean` | 是否占满整行 |

#### DataGrid — 卡片网格

```vue
<DataGrid :columns="2">
  <DataCard label="压力" :value="0.42" unit="MPa" color="green" />
  <DataCard label="流量" :value="1280" unit="m³/h" color="cyan" />
</DataGrid>
```

效果：

```
┌───────────┐ ┌───────────┐
│ 压力       │ │ 流量       │
│ 0.42 MPa  │ │ 1280 m³/h │
└───────────┘ └───────────┘
```

#### ProgressCard — 进度条

```vue
<ProgressCard label="任务进度" :value="68" color="cyan" />
```

效果：

```
任务进度
████████████████░░░░░░░░ 68%
```

#### SoilProfile — 土壤剖面

```vue
<SoilProfile :layers="[
  { depth: '10cm', value: 22.5, color: 'green' },
  { depth: '20cm', value: 25.8, color: 'green' },
  { depth: '40cm', value: 28.1, color: 'cyan' },
]" />
```

效果：

```
┌──────────┬──────────┬──────────┐
│  10cm    │  20cm    │  40cm    │
│  22.5    │  25.8    │  28.1    │
│   %      │   %      │   %      │
└──────────┴──────────┴──────────┘
```

#### AlertList — 告警列表

```vue
<AlertList :alerts="[
  { text: '管段压力低于阈值', time: '2 分钟前', color: '#fbbf24' },
  { text: '建议排查阀门状态', time: '5 分钟前', color: '#fbbf24' },
]" />
```

效果：

```
● 管段压力低于阈值
  2 分钟前
● 建议排查阀门状态
  5 分钟前
```

#### StatRow — 横排统计

```vue
<StatRow :stats="[
  { label: '已作业', value: '42.5', unit: '亩' },
  { label: '速度', value: '5.2', unit: 'km/h' },
  { label: '电量', value: '73', unit: '%' },
]" />
```

效果：

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 42.5     │ │ 5.2      │ │ 73       │
│ 已作业(亩)│ │ 速度(km/h)│ │ 电量(%)  │
└──────────┘ └──────────┘ └──────────┘
```

---

### 3.9 图表组件

**图表组件通过适配器支持任意图表库**（ECharts / Chart.js / AntV G2）。用户安装哪个图表库，图表组件就用哪个渲染。

#### TrendChart — 趋势折线图

```vue
<TrendChart
  :data="[
    { time: '08:00', value: 22.5 },
    { time: '12:00', value: 28.3 },
    { time: '16:00', value: 25.1 },
  ]"
  color="#4ade80"
  height="120"
/>
```

#### BarChart — 柱状图

```vue
<BarChart
  :data="[
    { label: '1月', value: 120 },
    { label: '2月', value: 200 },
    { label: '3月', value: 150 },
  ]"
  color="#22d3ee"
  height="150"
/>
```

#### GaugeChart — 仪表盘

```vue
<GaugeChart :value="73" :max="100" label="电量" color="#4ade80" size="120" />
```

#### PieChart — 饼图

```vue
<PieChart
  :data="[
    { name: '正常', value: 8, color: '#4ade80' },
    { name: '告警', value: 2, color: '#fbbf24' },
    { name: '离线', value: 1, color: '#ef4444' },
  ]"
  size="140"
/>
```

#### WindRose — 风向玫瑰图

```vue
<WindRose
  :data="[
    { direction: 'N', value: 3.2 },
    { direction: 'NE', value: 5.1 },
    { direction: 'E', value: 2.8 },
    // ... 16 方位
  ]"
  size="160"
/>
```

---

## 四、主题系统

### 4.1 内置主题

| 主题 | 文件 | 色调 |
|------|------|------|
| `dark` | `dark.css` | 深蓝底 + 亮色要素（大屏默认） |
| `light` | `light.css` | 白底 + 深色要素（日常使用） |
| `agriculture` | `agriculture.css` | 暗绿底 + 农业配色 |

### 4.2 自定义主题

用户只需覆盖 CSS 变量：

```css
/* 在入口文件中导入后覆盖 */
:root[data-theme="my-brand"] {
  --cg-primary: #22c55e;         /* 主色 */
  --cg-primary-rgb: 34, 197, 94;
  --cg-secondary: #eab308;       /* 辅助色 */
  --cg-bg: #0a1208;              /* 背景色 */
  --cg-surface: rgba(10, 18, 8, 0.9);
  --cg-text: #e0e6f0;            /* 文字色 */
  --cg-text-muted: #64748b;      /* 弱化文字 */
  --cg-border: rgba(255,255,255,0.06);
}
```

### 4.3 运行时切换主题

```vue
<div :data-theme="currentTheme">
  <CaoguoMap :theme="currentTheme" />
  <button @click="currentTheme = 'light'">切换亮色</button>
</div>
```

---

## 五、设备数据 Schema 规范

### 5.1 Schema 结构

每个设备类型需要定义一个 Schema，告诉组件库"这种设备有哪些数据字段、怎么展示"：

```typescript
const MY_SCHEMAS = {
  // 设备类型的 key（与 devices[].type 一致）
  pump: {
    label: '水泵站',           // 类型中文名
    icon: '💧',               // 类型图标
    color: '#3b82f6',         // 类型主题色
    fields: {
      // 每个字段 = 详情面板中的一个 DataCard
      flow: {
        label: '流量',        // 字段显示名
        unit: 'm³/h',         // 单位
      },
      pressure: {
        label: '压力',
        unit: 'MPa',
      },
      power: {
        label: '功率',
        unit: 'kW',
      },
      status: {
        label: '运行状态',
        fullWidth: true,      // 占满整行
      },
    },
  },
  valve: {
    label: '阀门',
    icon: '🔴',
    color: '#ef4444',
    fields: {
      openRate: { label: '开度', unit: '%' },
      flow: { label: '流量', unit: 'm³/h' },
      status: { label: '状态', fullWidth: true },
    },
  },
}
```

### 5.2 字段特殊标记

| 标记 | 类型 | 效果 |
|------|------|------|
| `fullWidth: true` | `boolean` | DataCard 占满整行 |
| `isProgress: true` | `boolean` | 渲染为 ProgressCard |
| `isRisk: true` | `boolean` | 值渲染为风险标签（低/中/高） |
| `depth: true` | `boolean` | 用于 SoilProfile 多层展示 |

---

## 六、设备数据规范

### 6.1 Device 结构

```typescript
{
  id: 'PUMP-001',              // 唯一 ID（必填）
  name: '光谷加压泵站',         // 设备名称（必填）
  type: 'pump',                // 设备类型，对应 Schema 的 key（必填）
  status: 'online',            // 状态：online | working | warning | offline | error（必填）
  icon: '💧',                  // 地图标记图标（必填）
  lat: 30.593,                 // 纬度（必填）
  lng: 114.305,                // 经度（必填）
  data: {                      // 实时数据（必填）
    flow: { value: 1280, unit: 'm³/h', color: 'cyan' },
    pressure: { value: 0.42, unit: 'MPa', color: 'green' },
    power: { value: 45, unit: 'kW', color: 'green' },
    status: { value: '正常运行', color: 'green' },
  },
  alerts: [                    // 告警列表（可选）
    { text: '无告警', time: '实时', color: '#4ade80' },
  ],
}
```

### 6.2 data 字段颜色规范

| 颜色 | 含义 | 用途 |
|------|------|------|
| `green` | 正常/达标 | 压力正常、温度正常、状态正常 |
| `yellow` | 偏低/偏高/注意 | 接近阈值、轻度过载 |
| `red` | 异常/危险/停机 | 超过阈值、故障、停运 |
| `cyan` | 信息/作业中 | 作业数据、吞吐量、信息性指标 |
| `blue` | 中性/参考 | 一般参考值 |

---

## 七、完整拼装示例

### 7.1 智慧农业大屏（最小可用版本）

```vue
<template>
  <div data-theme="dark" style="width:100vw;height:100vh;position:relative">
    <!-- 菜单 -->
    <MenuScreen
      v-if="!scene"
      :items="menuItems"
      title="🌾 智慧农业"
      @select="k => scene = scenes.find(s => s.key === k)"
    />

    <!-- 地图 -->
    <CaoguoMap
      ref="mapRef"
      :center="scene?.center || [114.3, 30.58]"
      :zoom="scene?.zoom || 13"
      theme="dark"
    />

    <!-- 设备标记 -->
    <DeviceLayer
      v-if="scene"
      :map="mapRef?.getMap()"
      :devices="scene.devices"
      :schemas="SCHEMAS"
      @device-click="selectDevice"
    />

    <!-- 顶部栏 -->
    <div v-if="scene" style="position:fixed;top:0;left:0;right:0;height:52px;z-index:50;background:rgba(10,14,26,0.88);display:flex;align-items:center;padding:0 20px">
      <button @click="scene = null; selected = null">← 返回</button>
      <div style="flex:1;text-align:center">{{ scene.title }}</div>
    </div>

    <!-- 左侧列表 -->
    <DeviceList
      v-if="scene"
      :devices="scene.devices"
      :selected-id="selected?.id"
      :schemas="SCHEMAS"
      @select="selectDevice"
      style="position:fixed;left:0;top:52px;bottom:0;width:260px;z-index:50;background:rgba(10,14,26,0.88);padding:16px;overflow-y:auto"
    />

    <!-- 右侧详情 -->
    <DetailPanel
      :device="selected"
      :schema="selected ? SCHEMAS[selected.type] : null"
      :visible="!!selected"
      @close="selected = null"
    >
      <template #before-data="{ device }">
        <ProgressCard v-if="device.type === 'machine'" label="进度" :value="device.data.taskProgress?.value || 0" color="cyan" />
        <SoilProfile v-if="device.type === 'soil'" :layers="[
          { depth: '10cm', value: device.data.moisture10?.value, color: getColor(device.data.moisture10?.value) },
          { depth: '20cm', value: device.data.moisture20?.value, color: getColor(device.data.moisture20?.value) },
          { depth: '40cm', value: device.data.moisture40?.value, color: getColor(device.data.moisture40?.value) },
        ]" />
      </template>
      <template #after-alerts="{ device }">
        <TrendChart :data="[]" :color="SCHEMAS[device.type]?.color || '#4ade80'" height="100" />
      </template>
    </DetailPanel>

    <!-- 状态栏 -->
    <StatusBar v-if="scene" :online="scene.devices.filter(d => d.status !== 'offline').length" :total="scene.devices.length" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  CaoguoMap, DeviceLayer, MenuScreen, DeviceList,
  DetailPanel, StatusBar, FilterTabs,
  ProgressCard, SoilProfile, TrendChart,
} from '@caoguo/map-components'

const mapRef = ref()
const scene = ref(null)
const selected = ref(null)

const SCHEMAS = { /* 设备类型定义 */ }
const scenes = [{ key: 'farm', title: '🌾 农场全域', center: [114.3, 30.58], zoom: 13, devices: [...] }]
const menuItems = scenes.map(s => ({ key: s.key, icon: '🌾', title: s.title, count: s.devices.length, center: s.center, zoom: s.zoom }))

function selectDevice(device) {
  selected.value = device
  mapRef.value?.flyTo([device.lng, device.lat], 16)
}
function getColor(v) { return v < 15 ? 'red' : v > 25 ? 'green' : 'yellow' }
</script>
```

---

## 八、安装方式

```bash
# 安装组件库 + 地图引擎
npm install @caoguo/map-components maplibre-gl

# 安装图表库（按需选一个）
npm install echarts          # 方式 1：ECharts
# npm install chart.js       # 方式 2：Chart.js
# npm install @antv/g2       # 方式 3：AntV G2

# TypeScript 类型（可选）
npm install -D @types/maplibre-gl
```

```typescript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import '@caoguo/map-components/themes/dark.css'
import 'maplibre-gl/dist/maplibre-gl.css'

createApp(App).mount('#app')
```

---

> **一句话总结：这个组件库 = 地图 + 设备标记 + 面板布局 + 数据卡片 + 图表 + 主题，全部是 Vue 3 组件，插槽可自定义，CSS 变量可换肤，图表库可替换。用户只管填数据，组件库管渲染。**
