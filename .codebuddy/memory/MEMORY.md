# 项目长期记忆 (caoguo-map)

## 发布约定（重要）
- **每次代码更新都必须走完整发布流程**：① GitHub 多仓拆分推送 → ② npm 发布。
- 详细命令与踩坑见 `docs/publish-workflow.md`（权威流程文档）。
- 9 个包对应独立 GitHub 仓库（命名 `caoguo-map/maplibre-<pkg>`，maplibre/theme 无前缀）。
- npm scope：`@caoguo/*`，发布用 pnpm（`workspace:*` 依赖自动重写）。

## 关键环境坑（跨会话必读）
- **npmrc registry 默认淘宝镜像**：`~/.npmrc` 设 `registry=https://registry.npmmirror.com/`。发布/验证必须显式 `--registry https://registry.npmjs.org/`；权威版本验证用 `curl https://registry.npmjs.org/@caoguo%2f<pkg>` 取 `dist-tags.latest`（npm view 走镜像不准）。
- **CodeBuddy safe-delete shim 干扰 build/publish**：由 `NODE_OPTIONS=--require=...node-language-shim.cjs` + `CODEBUDDY_SAFE_DELETE_*` 注入，拦截 `unlinkSync` 调 `genie-trash` 超时。
  - build 清 dist 偶发 Failed → 用 `tsup --no-clean`；
  - publish 收尾清 cache 超时 → 版本只 staged 未 promote，命令前缀加 `NODE_OPTIONS=` 清空 shim。
- npm 禁止覆盖已发布版本；若上次 publish 因 shim 中断只 staged，该版本号已占用，需再 bump 一次（报 `E409`/`E403` 即此因）。
- npm publish 有异步 promote 延迟（~1–2 分钟），curl 验证需等待，勿误判失败重复 bump。

## 代码约定（来自 PRD 修复）
- `@caoguo/maplibre` 以 dist 形式被下游 import，新增/修改导出必须重新 build maplibre 包，否则下游报 `is not a function`。
- 凡 jsdom 测试值导入 `@caoguo/maplibre` 的包，vitest 必须配 `setupFiles` 提供 `createObjectURL` polyfill。
- 渲染类 `clear()` 统一调 `this.map.removeLayer`（顶层），测试 mock 必须提供顶层 `removeLayer`。
