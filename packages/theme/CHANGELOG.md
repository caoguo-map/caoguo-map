# Changelog

## 0.0.6

### 功能完善
- 新增 `checkZoomCoverage(style, { minZoom, maxZoom })`：把「缩放 3-18 层级无断裂」静态校验沉淀为可复用导出工具，返回 `{ ok, gaps }` 报告；下游可在接入自有瓦片源后用于 CI / 运行时自动化验收。导出类型 `ZoomGap` / `ZoomCoverageReport`。
- `BuildStyleOptions.theme` 类型放宽为 `AnyTheme = string`，消除传注册行业主题名时的 TS 报错。
- 新增 `getThemeList()`：合并内置基础主题与运行时注册表（去重）。

### 文档
- `apps/docs/guide/themes.md` 修正 `buildStyle` 旧签名示例，区分 `@caoguo/maplibre` 封装层与 `@caoguo/theme` 原生 API，并补充 `useTheme` / 行业主题注册 / `checkZoomCoverage` 章节。

### 测试
- 测试 20 → 23：缩放校验改用 `checkZoomCoverage` 并新增该工具专项测试（内置主题无断裂 / 人为移除 water 报断裂 / 自定义区间生效）。

## 0.0.5

### 功能完善
- `buildStyle` 签名对齐 README：改为对象式 `buildStyle({ theme?, sourceUrl?, glyphs?, notoFonts? })`，同时向后兼容旧式位置参数 `buildStyle('caoguo-dark', {...})`。
- 矢量主题图层补全至每套 15 层：新增 `waterway`/`rail`/`park`/`building`/`building-extrusion` 及 `place-label-major`/`place-label-minor` 注记分级（原单一 `place-label` 拆分）。
- `glyphs` 兜底：style 自身未声明且未传 `opts.glyphs` 时注入 `DEFAULT_GLYPHS`，避免 symbol 层中文注记渲染失败。
- 新增行业主题注册机制：`registerTheme` / `getRegisteredThemes` / `hasTheme` / `getThemeList`，为六张网（管网/电网/水网/交通/算力/通信）预留扩展入口；`buildStyle` 优先从注册表解析主题。
- `BuildStyleOptions.theme` 类型由写死的 `'caoguo-dark' | 'caoguo-light'` 放宽为 `AnyTheme = string`，支持运行时注册的行业主题名（消除 TS 报错）。
- `injectTheme(name, onChange?)` 增加 `onChange` 回调并派发 `cg:themechange` 自定义事件，支持 UI 换肤联动地图 `setStyle`。
- 新增 `useTheme` composable：响应式 `theme.value` + `setTheme`/`toggle`，监听 `cg:themechange` 实现 UI ↔ 地图换肤闭环（SSR 安全）。
- `tokens.css` 暗/亮两套各新增 14 个 `--cg-map-*` 变量，与矢量 JSON 配色对齐；修正亮色 `--cg-blue` 与 `--cg-primary-2` 撞色（改为靛蓝 `#4f46e5`）。

### 测试
- 测试 5 → 19：新增缺省参数、对象式/旧式调用、glyphs 覆盖与兜底、完整要素图层断言、缩放 3-18 层级连续性静态校验、注册表、useTheme、getThemeList 等用例。
