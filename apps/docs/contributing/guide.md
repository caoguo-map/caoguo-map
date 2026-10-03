# 贡献 · 快速上手

欢迎为草果地图贡献代码。本文从环境到 PR 合并走通全流程。

## 环境准备

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 18.18（CI 用 20） | `engines` 字段约束 |
| pnpm | 9.12.0 | `packageManager` 字段锁定，先 `corepack enable` |

```bash
git clone https://github.com/caoguo-map/caoguo-map.git
cd caoguo-map
pnpm install --frozen-lockfile
pnpm build        # 全仓构建（含 vue-tsc / tsup dts 类型检查）
pnpm test         # 全仓 vitest（约 990 例，数十秒）
pnpm dev:docs     # 本地起任意站点：docs / demo / landing / editor
```

## 找到能做的事

- 文档站「常见问题」与 `docs/prd/` 里的 **🟡/❌ 功能点**是主要待办来源（每个 PRD 状态表都标注了落地状态与缺口）；
- 给行业包补能力前，先读《项目架构》了解「纯函数 + 零依赖面板 + 渲染薄壳」三件套约定；
- 文档类贡献直接改 `apps/docs/` 对应页面，`npx vitepress build` 本地验证。

## 分支与提交

```bash
git checkout -b feat/water-evacuation-improvement
# …开发 + 补测试…
git commit -m "feat(water): xxx（一句话说清做了什么）"
git push origin feat/water-evacuation-improvement
```

提交信息沿用 Conventional Commits，scope 用包名简称：

```
feat(pipeline): 新增 xx 能力
fix(editor): 修复 xx
test(qa): 补齐 xx 测试
docs(prd): 更新 xx 状态
```

正文写清**动机与验证结果**（跑了哪些测试、多少用例通过）——本仓库的历史提交都是这个风格，可作参考。

## PR 门槛（CI 即合同）

GitHub Actions 对每个 PR 执行：`pnpm install --frozen-lockfile` → `pnpm -r build` → `pnpm -r test`。合并要求：

1. **构建通过**：vue-tsc / tsup dts 零错误；
2. **测试全绿**：新增能力必须带测试（纯函数单测；渲染类参照四连断言标准，见《项目架构》）；
3. **文档同步**：改了功能要同步对应 PRD 状态表与文档站——本仓库坚持「PRD 承诺 = 代码现实」。

## 报告问题

Issue 请附：环境（Node/pnpm/浏览器）、最小复现代码、期望与实际行为。坐标系问题请先读《坐标系与偏移纠偏》自查 `dataCRS`——一半的「位置不对」是坐标系统没声明。
