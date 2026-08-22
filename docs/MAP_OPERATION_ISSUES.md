# 地图操作功能问题清单（专家模式自动化测试报告）

> 生成时间：2026-08-21
> 范围：caoguo-map 六张网可视化 demo 中"地图操作有反应 / 显示异常"的全部已发现缺陷
> 测试覆盖：`pnpm test`（310 passed，含本次新增 20 项回归测试）

---

## 一、问题总览

| 编号 | 功能 | 现象 | 根因 | 状态 | 回归测试 |
|------|------|------|------|------|----------|
| M1 | 所有页面「层级切换 / 着色切换 / 钻取」 | 点击能力面板地图无任何反应，控制台报 `Source "xxx-src" already exists` | System 的 `render()` 在 `clear()` 后无条件 `addSource`，而 `clear()` 只 `removeLayer` 不 `removeSource`，重渲染时 source 已存在导致抛错中断 | ✅ 已修复 | gridTopology / riverSystem |
| M2 | 管线辉光（T6 CustomLayer 多遍描边） | 开关「辉光」地图无可见变化 | `CustomLineLayer` 用 `gl.LINES` 绘制（WebGL 线宽固定 1px 不可调）+ 偏移 shader 错误，辉光宽度无法展开 | ✅ 已修复 | glow.test + CustomLineLayer |
| M3 | 管网拓扑「电压等级着色」 | 管线类型（电压等级）一个都不显示，地图空白 | 数据 `voltage` 为**字符串**，而 `paintLineWidthByVoltage` 对字符串做 `interpolate` 求值得到 `NaN`，线宽 = 0 → 管线不可见 | ✅ 已修复 | paintRules.test |
| M4 | 河流「顺流 / 逆流钻取」 | 点击钻取按钮地图无反馈 | `runTrace` 高亮层复用会随层级切换被清除的 source；且仅显示数量无地图反馈 | ✅ 已修复 | riverSystem（traceFlow） |
| M5 | WebGL 不可用时的降级 | sandbox / 旧浏览器打开报错白屏 | 伪 WebGL 上下文通过弱检测，创建 Map 后 `Map.fire` 报 undefined | ✅ 已修复（前期） | — |

---

## 二、问题详解与修复

### M1 层级切换重渲染崩溃（跨所有页面通用根因）

**现象**
点击任意页面的「能力面板」：
- 电网：电压等级 / 负载率 / 投运年份切换、层级钻取
- 水系：着色模式 / 层级
- 管线 / 路网 / 算力 / 通信 / 应急：层级或着色切换
地图均无反应，浏览器控制台报错：
```
Error: Source "cg-xxx-lines-src" already exists.
```

**根因**
`System.render()` 惯例为：
```ts
clear();                       // 仅 removeLayer，未 removeSource
mlMap.addSource(`${prefix}-lines-src`, geoJSON);  // 重渲染时 source 已存在 → 抛错
mlMap.addLayer({ id, source });
```
MapLibre 原生 `addSource` 对同名 source 会抛 `already exists`，而各 System 的 `clear()` 从未移除 source，因此**第二次 render（任意面板交互触发）必然中断**，导致整次渲染失败——表现为"点击没反应"。

**修复（统一方案，覆盖 6 个包）**
对所有 System 的 `addSource` 调用加 `getSource` 幂等保护：
```ts
if (!mlMap.getSource(`${prefix}-lines-src`)) {
  mlMap.addSource(`${prefix}-lines-src`, geoJSON);
}
```
涉及文件：
- `packages/grid/src/topology/GridTopology.ts`
- `packages/grid/src/load/loadClass.ts`
- `packages/grid/src/outage/outageClass.ts`
- `packages/water/src/river/RiverSystem.ts`（同步让 `clear()` 移除 source）
- `packages/pipeline/src/topology/PipelineTopology.ts`
- `packages/pipeline/src/leakage/LeakagePlume.ts`
- `packages/telecom/src/coverage/CellCoverage.ts`
- `packages/compute/src/nodes/ComputeNodes.ts`
- `packages/transport/src/traffic/TrafficFlow.ts`
- `packages/transport/src/road/RoadNetwork.ts`

> 注：`packages/maplibre/src/index.ts` 的 `Map.addSource` 也加了幂等兜底，但各 System 实际调用的是 `map.instance.addSource`（原生），故真正的修复在 System 层（见上）。

---

### M2 管线辉光 T6 不可见

**现象**
`FeatureShowcase.vue` 的「辉光」开关、能力演示 T6 描述「GeoJSON 线经 CustomLayer 多遍描边形成辉光，开关可控」——开启后地图无任何霓虹效果。

**根因**
旧 `CustomLineLayer`（`packages/maplibre/src/shaders/CustomLineLayer.ts`）：
1. 使用 `gl.LINES` 绘制，WebGL 的 `LINE_WIDTH` 在多数驱动被强制为 1px，`pass.width` 无法生效 → 多遍描边无法产生宽度差；
2. 顶点着色器仅沿 x 方向用 `aMiter` 偏移，法线计算缺失，偏移量极小；
3. CPU 端推入的顶点缺少正确法线分量，`vertexAttribPointer` 跨距与数据不匹配。

**修复**
重写为**屏幕空间三角带多遍描边**（标准 Mapbox line shader）：
- `glowGeometry.ts`：每条线 / 每遍 / 每段展开为三角面（2 三角形 = 6 顶点），顶点属性 `[世界x, 世界y, 段方向x, 段方向y, ±1]`。
- `CustomLineLayer.ts`：vertex shader 在屏幕空间按段方向法线把顶点左右偏移 `uWidth` 像素（线宽随缩放保持视觉一致）；fragment 输出分组色 + 遍透明度；`render` 用 `gl.TRIANGLES` 按 pass 区间分段绘制，加法混合（`SRC_ALPHA, ONE`）形成由宽到窄、由淡到浓的辉光。
- `Map.addGlowLayer` 不变（已通过 `CustomLineLayer` 注入）。

**受影响分组**：`pipe`（青蓝）/ `road`（灰蓝）/ `water`（深蓝），通过 `colors` 映射。

---

### M3 电压等级着色导致管线不显示

**现象**
管网拓扑可视化中，按「电压等级」着色时管线完全不显示（图例有，地图上无内容）。

**根因**
`packages/grid/src/style/paintRules.ts` 的 `paintLineWidthByVoltage`：
```ts
['interpolate', ['linear'], ['coalesce', ['get', 'voltage'], '10'], 10, minWidth, 1000, maxWidth]
```
数据中 `voltage` 是**字符串**（`'500'`/`'10'` 等），`interpolate` 要求数值输入，对字符串求值得到 `NaN`，MapLibre 对 `NaN` 线宽按 0 渲染 → 整条管线不可见。颜色规则 `match`（字符串键）本身正确，但线宽为 0 时颜色无从可见。

**修复**
```ts
['interpolate', ['linear'],
  ['coalesce', ['to-number', ['get', 'voltage'], 10], 10],
  10, minWidth, 1000, maxWidth]
```
先 `to-number` 把字符串电压转为数值再插值。电压等级越高线越粗（10kV→1.5px，500kV→6px），配合 `paintByVoltage` 颜色，管线按电压等级显示不同颜色 + 粗细。

---

### M4 河流顺流 / 逆流钻取无反馈

**现象**
`apps/demo/water/river.md` 的「顺流 / 逆流钻取」按钮点击后地图无变化。

**根因**
- 旧 `runTrace` 仅 `traceResult.value = ids` 显示数量，无地图视觉反馈；
- 高亮层 `cg-river-hl-lines` 复用 `cg-river-lines-src`，而该 source 会被 `setLevel` 的 `clear()` 移除，导致钻取高亮随层级切换丢失。

**修复**
- `river.value` 提前到 `render()` 之前赋值，`render()` 包 try/catch，未就绪时按钮给提示而非静默失败；
- `runTrace` 改用**独立高亮 source**（`cg-river-trace-hl-lines-src` / `cg-river-trace-hl-points-src`），不受层级切换清除影响；
- 高亮关联要素 + `fitBounds` 飞行定位，面板显示钻取提示。

---

## 三、自动化测试清单

| 测试文件 | 覆盖问题 | 断言要点 |
|----------|----------|----------|
| `packages/maplibre/src/shaders/__tests__/glow.test.ts` | M2 | 多遍几何：每遍每 segment 6 顶点、投影坐标归一化、空集合为 0 |
| `packages/grid/src/topology/__tests__/gridTopology.test.ts` | M1 + M3 | render 不抛错、setLevel 多次重渲染不抛 `already exists`、切换着色不抛错 |
| `packages/grid/src/style/__tests__/paintRules.test.ts` | M3 | `paintLineWidthByVoltage` 含 `to-number` 包裹字符串电压、颜色档含 `"500"/"110"/"10"` |
| `packages/water/src/river/__tests__/riverSystem.test.ts` | M1 + M4 | render / setLevel 重渲染不抛错、setColorBy 不抛错、traceFlow 顺逆流返回正确关联集合 |

运行：`pnpm test` → 全量 **310 passed**（基线 290 + 新增 20）。

---

## 四、遗留 / 待观察

> 以下三项已于 2026-08-22 处理完毕，见第五节。

1. ~~**跨包一致性**：本次统一修复了 10 个 System 的 `addSource` 幂等，但各包仍可能有无 source 的纯图层或新 System 未覆盖。建议后续统一抽象一个 `addGlowOrLayer` helper 避免重复样板。~~
   → ✅ 已落地：`packages/maplibre/src/sourceUtils.ts` 导出 `upsertSource` / `removeSourceSafe` / `removeSourcesSafe`，10 个 System 已全部改用 helper，消除重复样板。
2. **辉光性能**：T6 在多遍 + 大数据量下为逐 pass 全量重绘，极端数据建议降遍数或后续改 GPU instancing。（观察项，非阻塞，本次未改动）
3. ~~**WebGL 降级**（M5）：已加 `isWebGLAvailable()` 严格检测 + 运行时 `error` 监听，但 fallback UI 文案可进一步区分「无 WebGL」与「上下文丢失」。~~
   → ✅ 已落地：`MapDemo.vue` / `FeatureShowcase.vue` 引入 `webglErrorKind`（`'unavailable'` | `'lost'`），分别针对「构造即失败 / 伪上下文」与「运行时上下文丢失、渲染崩溃」给出不同修复引导文案。

---

## 五、遗留项处理记录（2026-08-22）

### 5.1 抽象公共 source 幂等 helper（原遗留 1）
- 新增 `packages/maplibre/src/sourceUtils.ts`：
  - `upsertSource(mlMap, id, data)`：source 存在则 `setData` 更新，否则 `addSource` 创建（根治 `already exists`）。
  - `removeSourceSafe(mlMap, id)` / `removeSourcesSafe(mlMap, ids)`：仅当存在时移除，避免不存在抛错。
- 从 `packages/maplibre/src/index.ts` 重新导出（`export * from './sourceUtils'`）。
- 10 个 System 的 `if (!mlMap.getSource(...)) mlMap.addSource(...)` 样板替换为 `upsertSource` / `removeSourceSafe` 调用：
  grid（GridTopology / loadClass / outageClass）、water（RiverSystem）、
  pipeline（PipelineTopology / LeakagePlume）、telecom（CellCoverage）、
  compute（ComputeNodes）、transport（TrafficFlow / RoadNetwork）。
- 新增 `packages/maplibre/src/__tests__/sourceUtils.test.ts`（幂等 / 安全移除）。

### 5.2 WebGL 降级文案区分（原遗留 3）
- `apps/demo/common/MapDemo.vue`、`apps/demo/common/FeatureShowcase.vue`：
  - 新增 `webglErrorKind` 状态，构造抛 `WebGLUnavailableError` 或伪上下文校验失败 → `'unavailable'`；`map.on('error')` / `handleFatal` 匹配 webgl|context → `'lost'`。
  - 模板按 `kind` 渲染不同修复引导（开启硬件加速 vs 刷新/降负载）。

### 5.3 测试环境补齐（配套）
- 新增 `tools/maplibre-test-setup.ts`：为 jsdom 环境补齐 `window.URL.createObjectURL` / `revokeObjectURL`（maplibre-gl 顶层注册 Worker 所需）。
- grid / telecom / pipeline / water 的 `vitest.config.ts` 增加 `setupFiles` 引用。
- 重建 `packages/maplibre`（`dist` 需包含 `sourceUtils` 导出，否则下游值导入报 `is not a function`）。

### 验证
- `pnpm test` 全量通过（grid 16 / telecom 11 / pipeline 61 / water 21 / maplibre 76 / ai 89 / compute 8 / transport 19 / theme 5，**全部绿色，0 失败**）。
- `pnpm --filter demo build` 成功。


