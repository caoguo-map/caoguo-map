# 贡献 · 代码规范

本仓库不强制 eslint 规则，质量靠 **TypeScript 严格模式 + CI 构建 + 测试约定**保证。以下是评审时实际执行的规范。

## TypeScript

- 严格模式；公共 API 一律显式返回类型（tsup dts 生成 .d.ts，隐式类型会污染下游）；
- 跨 maplibre 类型摩擦处允许 `as never` 断言，但**必须局限于与原生实例的边界**，业务逻辑内禁止；
- 不用 `any` 字面量做数据结构；测试文件里 mock 可用 `as any`（见 `renderEnhance.test.ts` 惯例）。

## 命名与文件组织

| 对象 | 约定 | 例 |
| --- | --- | --- |
| 纯函数文件 | `xxxCore.ts` / 域名.ts | `floodCore.ts`、`evacuation.ts` |
| 面板/卡片 | `panels.ts`、`nodeCard.ts` | 导出 `renderXxxHtml` |
| 组件类 | 大驼峰与产品名一致 | `FloodRender`、`BurstSimulator` |
| 测试 | `__tests__/<模块>.test.ts` | 与被测文件同目录 |
| PRD 编号 | 用例/提交注明功能编号 | `describe('B-2 影响范围渲染')` |

## 函数设计

- **纯函数优先**：几何/评分/聚合逻辑写成 `(input, options?) => result`，副作用留在渲染薄壳；
- options 一律带默认值并在 interface 里写中文 JSDoc（含单位！`/** 风向（弧度，0=东） */`）；
- 不抛错的失败路径返回结构化结果（如 `{ found: false }`、`{ reachable: false, reason }`），把异常留给「调用方违反契约」（如未注入 provider）；
- 导出经 `<模块>/index.ts` 的 `export *` 聚合并注明 PRD 编号。

## 测试规范

- 用例名说**行为与边界**，不写「测试函数 x」；关键边界（恰好等于阈值、NaN、空输入）必须有用例；
- 渲染测试按四连断言标准（图层数恒定 / data-driven 表达式 / geometry filter / 空输入行为）；
- mock map 用 `layers: Set` + `addLayer` 回写的模式（可断言图层数恒定）；
- 修 bug 先写暴露 bug 的失败用例，再修；
- **测试即文档**：实现的反直觉口径（epoch 周序号、严格大于阈值）用测试名固化。

## 中文与文案

- 注释、JSDoc、commit、PRD 全中文；标识符英文；
- 面板/文档面向最终用户的文案用简体中文，避免翻译腔；
- 提交正文写清动机、方案取舍、验证结果（用例数）。

## 文档同步义务

改公开 API → `apps/docs/api/` 对应页；改功能点状态 → 对应 PRD 状态表与 `docs/prd/feature-inventory.md`；新增部署/概念文档 → 挂 `apps/docs/.vitepress/config.ts` 侧边栏并 `vitepress build` 验证。
