# 安装

草果地图以 npm 包形式分发，推荐使用 pnpm 管理 monorepo 或多包依赖。

## 方式一：作为依赖安装

```bash
pnpm add @caoguo/maplibre maplibre-gl
```

`maplibre-gl` 是运行时对等依赖，需与 `@caoguo/maplibre` 一同安装。

## 方式二：从源码（monorepo）

```bash
git clone https://github.com/caoguo-map/caoguo-map.git
cd caoguo-map
pnpm install
pnpm dev:docs     # 文档站
pnpm dev:demo     # 演示中心
pnpm dev:landing  # 落地页
```

## 构建产物

| 包 | 说明 |
| --- | --- |
| `@caoguo/maplibre` | 地图引擎封装（含类型与暗色演示样式） |
| `@caoguo/theme` | 共享品牌主题（暗/亮 token） |

## 浏览器支持

| 浏览器 | 版本 |
| --- | --- |
| Chrome / Edge | ≥ 90 |
| Firefox | ≥ 88 |
| Safari | ≥ 15 |

::: warning 坐标系说明
当前演示样式使用 WGS-84 / GCJ-02 近似底图。正式版本将内置 GCJ-02、BD-09 坐标纠偏插件，详见 [路线图](/)。
:::
