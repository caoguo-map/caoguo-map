# 快速开始

草果地图（Caoguo Map）是面向「六张网」（地下管网、电网、水网、交通、算力、通信）的开源、可私有化地图引擎。本指南将带你在 10 分钟内跑通第一张地图。

## 前置条件

- Node.js ≥ 18.18
- 包管理器 pnpm ≥ 9（或 npm / yarn）
- 现代浏览器（Chrome / Edge / Firefox / Safari）

## 1. 安装

```bash
# 使用你喜欢的包管理器
pnpm add @caoguo/maplibre maplibre-gl
# 或
npm i @caoguo/maplibre maplibre-gl
```

> 当前展示阶段 `@caoguo/maplibre` 为轻量封装，直接复用 `maplibre-gl`。后续版本将注入坐标系插件、行业 Shader 与离线瓦片，调用方式保持不变。

## 2. 渲染第一张地图

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({
  container: '#app',          // 容器 id 或 HTMLElement
  center: [114.3055, 30.5928], // 武汉
  zoom: 11,
})
```

## 3. 加一条管线

```ts
map.addSource('pipes', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[114.30, 30.59], [114.32, 30.60]] },
      },
    ],
  },
})

map.addLayer({
  id: 'pipes',
  type: 'line',
  source: 'pipes',
  paint: { 'line-color': '#14b8a6', 'line-width': 3 },
})
```

## 4. 在线体验

<MapDemo :zoom="11" />

::: tip 下一步
- 阅读 [第一张地图](/guide/first-map) 了解图层与交互
- 查看 [API 参考 / Map](/api/map)
- 私有化部署见 [Docker 部署](/deployment/docker)
:::
