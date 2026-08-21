# @caoguo/maplibre

> 草果地图引擎核心 — 基于 MapLibre GL 的国内坐标系/离线瓦片/辉光/LOD 一体化封装

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre.svg)](https://www.npmjs.com/package/@caoguo/maplibre)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre @caoguo/theme
# 或
pnpm add @caoguo/maplibre @caoguo/theme
```

Peer / 运行时依赖：`maplibre-gl@^4.7.1`、`@caoguo/theme`。

## 功能

- **国内坐标系**：GCJ-02 / CGCS2000 / WGS84 自动纠偏（误差 < 50m / 0.5m）。
- **天地图底图**：内置 tianditu WMTS 一键接入（需 token）。
- **离线瓦片**：基于 IndexedDB 的瓦片存储 + `caoguo-offline://` 协议层短路，无需联网即可渲染。
- **辉光管线**：Custom WebGL Shader，渲染管线/路网/水系辉光效果。
- **自适应 LOD**：按缩放级别切换数据精度等级，节省渲染开销。
- **控件**：比例尺 + 实时坐标（`ScaleControl`）、暗/亮主题切换（`ThemeSwitcher`）。
- **样式**：内置 OSM 矢量底图样式 + 主题切换无闪烁（保留视图 diff）。

## 快速开始

```ts
import { Map } from '@caoguo/maplibre';
import { darkStyle } from '@caoguo/theme';

// 5 行代码渲染地图
const map = new Map({
  container: 'map',
  center: [114.3055, 30.5928], // 武汉
  zoom: 12,
  style: darkStyle,
  dataCRS: 'GCJ02',           // 业务数据为高德坐标系
});

// 叠加 GCJ-02 数据（入图前自动纠偏）
const [lng, lat] = map.transformToMap(114.3055, 30.5928);
```

### 切换为天地图底图

```ts
map.useTianditu('vec', {
  token: 'YOUR_TIANDITU_TOKEN', // 必填，缺失会抛 MissingTokenError
  subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
});
```

### 离线瓦片（IndexedDB）

```ts
map.enableOffline();                  // 注册 caoguo-offline:// 协议
await map.packGeoJSON('my-source', {  // 把 GeoJSON 打包到瓦片网格
  type: 'FeatureCollection',
  features: [/* ... */],
}, { maxZoom: 14 });

const tiles = map.offlineTiles('my-source');
map.addSource('my-source', { type: 'geojson', data: 'caoguo-offline://my-source/0/0/0.pbf' });
```

### 辉光管线

```ts
map.addGlowLayer({
  id: 'pipeline-glow',
  lines: [{ id: 'l1', coords: [[lng, lat], [lng2, lat2]], type: 'gas' }],
  colors: { gas: [1, 0.4, 0.2], water: [0.3, 0.6, 1] },
  baseWidth: 6,
  passes: 3,
});
```

### LOD 控制器

```ts
map.addLodController(
  [
    { from: 0,  to: 8,  data: () => fetchLowDetail() },
    { from: 8,  to: 12, data: () => fetchMidDetail() },
    { from: 12, to: 22, data: () => fetchHighDetail() },
  ],
  (e) => map.getSource('layer')?.setData(e.current.data)
);
```

## API 概览

| 导出 | 说明 |
|------|------|
| `Map` (default + named) | 主类，统一入口 |
| `maplibregl` | 透传 MapLibre 原生命名空间 |
| `MapOptions` / `MapInstance` | 类型 |
| `CRS` / `LngLat` / `createTransformer` / `toWgs84` | 坐标系 |
| `addTiandituBaseMap` / `tiandituStyle` / `MissingTokenError` / `TiandituOptions` | 天地图 |
| `createDefaultStore` / `registerOfflineProtocol` / `offlineTileUrl` / `packGeoJSONToStore` / `TileStoreBackend` | 离线 |
| `ScaleControl` / `ThemeSwitcher` | 控件 |
| `CustomLineLayer` / `GlowLine` | 辉光 |
| `LodController` / `LodLevel` / `LodChangeEvent` | LOD |

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+ / Firefox 88+ / Edge 90+）
- 引擎内部 `import 'maplibre-gl/dist/maplibre-gl.css'`，需配合 Vite/Webpack 等打包器
- 纯算法模块（坐标系/图算法）可在 Node 环境测试

## 许可

Apache-2.0