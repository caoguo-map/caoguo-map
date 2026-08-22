# Changelog

## 0.0.7

### 功能完善
- **六张网行业主题真实配色落地**：新增 `src/themes/industries.ts`，汇总管网 / 电网 / 水网 / 交通 / 算力 / 通信六张网真实语义色板（取自各业务包已落地的 `*Theme.ts` 常量），作为权威配色寄存器。
- 新增 `INDUSTRY_META`：六张网元信息（themeId / 中文名 / 主色），六主色互不撞色。
- 新增 `INDUSTRY_PALETTES`：每网含 `palette`（要素/类型语义色）、`ramp`（数值分级色，用于流量/负载/信号热力）、`status`（安全/预警/危险等状态色）。
- 新增 `registerIndustryThemes()`：幂等注入六张网行业主题变体（基于 `caoguo-dark` 派生并在 `metadata` 注入 `cg:industry` / `cg:industry-label` / `cg:industry-primary`），使 `buildStyle({ theme: 'caoguo-ind-<key>' })` 可用。
- 新增 `buildIndustryStyle(key, mode?)`：直接派生某张网行业底图（暗/亮）。

### 文档
- README 行业主题章节改为「已交付真实配色」，补充六张网主色/语义色一览表与 API 概览；CHANGELOG 新增 0.0.7。
- `apps/docs/guide/themes.md` 行业主题章节同步更新为已交付（真实配色 + 注册用法）。

### 测试
- 测试 23 → 28：新增 `industries.test.ts`（5 例），覆盖六张网元信息完整性/主色不撞、色板 hex 合法性、注册表注入、`buildStyle({theme:'caoguo-ind-*'})` 合法 v8 style 与 metadata、`buildIndustryStyle` 暗/亮派生。

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
