# `@caoguo/map-editor` 功能清单

> 最后更新：**2026-10-02**。状态口径见 `README.md` 第一节（✅ 已落地 / 🟡 部分落地 / ❌ 未落地）。
> 本文是**派生清单**：按模块重组便于查阅，**全部条目均已回源码核对**（计数、命名、字段），不使用二手结论。
> 权威落地状态表为 `prd/visual-editor.md` §13；二者冲突时以源码为准，并应同步修正 §13。

## 一、总览

| 项 | 值 |
|----|----|
| 包名 | `@caoguo/map-editor` |
| 源码 | `packages/editor/src/index.ts`（导出 `Editor` 主组件、`useEditor`/`useHistory`/`useDragDrop`、组件注册表、`TEMPLATES`、JSON Schema 类型） |
| 构建 | `vue-tsc`（dts）+ vite 库模式（含 `.vue`，**不能用 tsup**） |
| 测试 | vitest **70 passed** / 10 文件 |
| 里程碑 | W1–W6 **全部完成** |
| 配套应用 | `apps/editor-app`（`pnpm dev:editor`，端口 5190，alias 直连源码热更新） |

## 二、组件体系（24 类）

来源：`src/components.ts` 的 `COMPONENT_REGISTRY`（实测 24 条，与 §3.1 一致）。

| 分类 | 数量 | 组件 |
|------|------|------|
| basic 基础 | 6 | `map`、`text`、`image`、`clock`、`divider`、`status-bar` |
| device 设备 | 4 | `device-layer`、`device-list`、`detail-panel`、`filter-tabs` |
| card 卡片 | 6 | `data-card`、`data-grid`、`progress-card`、`soil-profile`、`alert-list`、`stat-row` |
| chart 图表 | 5 | `trend-chart`、`bar-chart`、`pie-chart`、`gauge-chart`、`wind-rose` |
| container 容器 | 3 | `card-container`、`transparent-container`、`tab-container` |

**渲染分工**（易错点，勿凭印象判断"某组件是否有渲染"）：
- 5 个独立组件 `MapNode` / `DeviceList` / `DetailPanel` / `FilterTabs` / `StatusBar` 由 **`NodeView.vue`** 按 `type` 委托渲染；
- 其余（卡片/图表/容器类）由 **`ComponentView.vue`** 的 `v-else-if` 内联渲染，**无独立组件文件**。

## 三、画布与编辑交互

| 能力 | 说明 | 状态 |
|------|------|------|
| 拖拽移动 / 缩放 | 多选整体平移；单选取对齐吸附 | ✅ |
| 框选（marquee） | 空白处拖动，位移 <4px 视为点击空白 | ✅ |
| 对齐参考线 | `useDragDrop.ts`：`snapAxis` 候选为其它节点的左/中/右、上/中/下，阈值 5px，**对齐优先于网格吸附**；`Canvas.vue` 渲染 `.cg-guide` | ✅ |
| 网格吸附 / 缩放 / 标尺 | `snapToGrid` + `gridSize`；顶部/左侧标尺随 zoom 与滚动同步 | ✅ |
| 撤销重做 | `useHistory.ts`：深拷贝快照栈（上限 50）；`deepToRaw` 规避 proxy 的 `DataCloneError` | ✅ |
| 快捷键 | Ctrl+C/V（含嵌套 children 重新生成 id）、Delete、Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y、Ctrl+S（写本地草稿）、Ctrl+点击多选 | ✅ |
| 属性/图层/场景面板 | 基础/数据/样式/联动配置；图层树显隐顺序；多场景创建/切换/轮播 | ✅ |
| 系统自检 | 静态体检 + 数据源连通性检查 | ✅ |

## 四、数据源与联动

| 能力 | 说明 | 状态 |
|------|------|------|
| 数据源类型 | **13 种**：3 静态（`static`/`excel`/`csv`）+ 4 接口（`rest`/`websocket`/`webhook`/`postmessage`）+ 5 数据库（`mysql`/`dameng`/`influxdb`/`oceanbase`/`clickhouse`）+ `binding` | ✅ |
| 后端代理取数 | 接口/数据库类统一走代理（`tools/server`，默认 8787）；库凭据仅存本地草稿 | ✅ |
| 绑定聚合 | `avg` / `sum` / `count` / `max` / `min` / `status-count`（读取设备图层实时数据） | ✅ |
| 字段映射 | 图表字段从设备 Schema 下拉 + 按字段类型自动填默认值 | ✅ |
| 联动 | 设备点击→详情面板；筛选标签→图层/图表；告警列表→定位飞向 | ✅ |
| 实时刷新反馈 | 轮询刷新触发标记脉冲 / 卡片描边 / 数据点闪动（节流去抖） | ✅ |
| 下钻 | 标记点击→跳转子场景（`drillDownSceneKey`）+ 状态栏返回上级（`sceneHistory` 栈） | ✅ |

## 五、告警与阈值

| 能力 | 说明 | 状态 |
|------|------|------|
| 阈值本地着色 | 正常/警告/严重三档，规则随节点 JSON 导出；阈值兼容字符串型数值（REST 常见） | ✅ |
| 跨场景告警面板 | 预览态 `AlertPanel`：聚合 + 定位飞向 + 声音/闪烁 | ✅ |

## 六、模板系统（8 套）

来源：`src/templates.ts`（实测 8 条）。每套 = `device-layer`（行业 schemas + 专属 REST 端点）+ 通用外壳（状态栏/设备列表/详情面板）+ 行业差异化组件。

| Key | 模板 | 差异化组件 |
|-----|------|-----------|
| `agriculture` | 🌾 智慧农业 | 平均负载仪表 + 状态饼图 + 文本 + **土壤剖面** |
| `pipeline` | 🏗️ 地下管网 | 管网健康度仪表 + 状态饼图 + **告警列表** |
| `grid` | ⚡ 电力网络 | 平均负荷率仪表 + 状态饼图 + **进度卡（供电可靠率）** |
| `water` | 🌊 水利水系 | 平均水位仪表 + 状态饼图 + **告警列表** |
| `transport` | 🚗 交通路况 | 平均车速仪表 + 状态饼图 + **进度卡（路网畅通率）** |
| `telecom` | 📡 通信基站 | 信号覆盖率仪表 + 状态饼图 + **告警列表** |
| `compute` | 🖥️ 算力网络 | 平均利用率仪表 + 状态饼图 + **数据网格** |
| `blank` | 📦 空白 | 空场景 |

## 七、配置、运行与导出

| 能力 | 说明 | 状态 |
|------|------|------|
| 预览模式 | 隐藏编辑器 UI，仅画布全屏可交互（地图交互在预览态启用） | ✅ |
| 渲染运行时 | `parseScreenJSON` / `renderScreen`（容器嵌入）/ `renderFromJSON`（全屏播放）；需 `import '@caoguo/map-editor/style.css'` | ✅ |
| 投放大屏 | 导出 base64 → 新窗口打开无编辑 chrome 的独立大屏页 | ✅ |
| 导出脱敏 | `exportJSON()` 默认剔除 `proxyBase` 与数据源 `password`；本地草稿用 `exportJSON({ includeSecrets: true })` 保留 | ✅ |

## 八、已知边界（非缺陷，勿误判为"已完成"之外的问题）

- **阈值仅支持 `>=` 上界**，无 `<` 下界判定。
- **告警提示音**受浏览器策略限制，需用户首次交互后才解锁。
- **组件库无独立包**：组件随编辑器交付（§14 为组件库唯一事实源）；组件 props 统一 `{ node }`，依赖编辑器 store，**脱离 `Editor` 不可用**。
- **xlsx 懒加载**：`parseExcelBuffer` 走动态 import，不进主包；给本包加重型依赖时应同样处理。

## 九、与 PRD 章节对照

| 本文章节 | PRD 章节 |
|----------|----------|
| 二 | `visual-editor.md` §3.1 |
| 三 | §3.2 / §3.3 / §3.4 / §3.5 / §3.6 / W6 |
| 四 | §4.1 / §4.1.3 / §4.2 / §4.2.1 / 下钻 |
| 五 | §4.2.2 / §4.2.3 |
| 六 | §6.2 |
| 七 | §5 / §6.1 / §7.1 / §7.2 / §7.3 |
