# 草果地图 Caoguo Map

> 面向「六张网」（地下管网 · 电网 · 水网 · 交通 · 算力 · 通信）的开源、可私有化地图引擎与 AI 空间智能服务。

草果地图致力于解决传统 GIS 平台「贵、锁、慢」三大痛点：开源免费、可完全私有化部署、针对行业场景做空间智能加速。

## 仓库结构（pnpm monorepo）

```
caoguo-map/
├── packages/
│   ├── maplibre/   # @caoguo/maplibre          —— 地图引擎封装骨架（基于 maplibre-gl）
│   ├── theme/      # @caoguo/theme             —— 共享品牌主题（暗/亮 token）
│   ├── pipeline/   # @caoguo/maplibre-pipeline —— 地下管网（Phase 1）
│   ├── grid/       # @caoguo/maplibre-grid     —— 电网（Phase 2）
│   ├── water/      # @caoguo/maplibre-water    —— 水网（Phase 2）
│   ├── transport/  # @caoguo/maplibre-transport —— 交通网（Phase 3）
│   ├── compute/    # @caoguo/maplibre-compute  —— 算力网（Phase 3）
│   ├── telecom/    # @caoguo/maplibre-telecom  —— 通信网（Phase 3）
│   └── ai/         # @caoguo/maplibre-ai       —— AI Debug + 样式生成器 v2（Phase 3）
└── apps/
    ├── landing/    # 落地页  map.hb.cn
    ├── docs/       # 文档站  map.hb.cn/docs
    └── demo/       # 演示中心 map.hb.cn/demo
```

## 技术栈

- 构建：pnpm workspace + Vite
- 展示框架：VitePress + Vue 3 + TypeScript
- 地图渲染：`maplibre-gl`（当前直接引入，后续由 `@caoguo/maplibre` 接管引擎定制：坐标系插件 / Shader / 离线瓦片）
- 后端（后续阶段）：NLPG（Node.js + LLM + PostGIS）、GeoAI 管线（Python 地址解析 + Node API 层）

## 本地开发

```bash
pnpm install

pnpm dev:landing   # 落地页
pnpm dev:docs      # 文档站
pnpm dev:demo      # 演示中心
```

## 构建

```bash
pnpm build                 # 构建全部
pnpm build:landing         # 仅落地页
pnpm build:docs            # 仅文档站
pnpm build:demo            # 仅演示中心
```

> 当前阶段（Phase 3）：六张网组件包（管网 / 电网 / 水网 / 交通 / 算力 / 通信）全部可用，
> 演示中心提供交互式 Demo。引擎 fork 定制、NLPG / GeoAI 后端能力将在后续阶段回填，
> 业务代码通过 `@caoguo/maplibre` 统一入口，后续替换 import 源即可，无需改动调用方。
