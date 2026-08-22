# Station3D 三维变电站

> 隶属 `@caoguo/maplibre-grid` 包。来源：`packages/grid/src/station3d/`

将变电站渲染为 maplibre `fill-extrusion` 体块，叠加到 3D 地形上。可选叠加附属设备（铁塔/配变/用户），并支持多种视角预设。

---

## 基础用法

```ts
import { Map } from '@caoguo/maplibre';
import { Station3D, switchStationView } from '@caoguo/maplibre-grid';

const map = new Map({ container, style, center: [114.31, 30.51], zoom: 12 });

const s3d = new Station3D({ map, dataset, renderAccessories: true });
s3d.render();

// 切换到 3D 透视视角
switchStationView(map, '3d-perspective', { center: [114.31, 30.51] });
```

## `Station3DOptions`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `map` | `CaoguoMap` | 必填 | 地图实例 |
| `dataset` | `GridTopologyDataset` | 必填 | 电网数据集 |
| `layerPrefix` | `string` | `'cg-station3d'` | 层 ID 前缀 |
| `enableTerrainOnRender` | `boolean` | `true` | render 时自动启用 terrain |
| `renderAccessories` | `boolean` | `false` | 叠加附属设备（铁塔/配变/用户） |

## `StationViewMode`

| 模式 | zoom | pitch | bearing | 用途 |
|---|---|---|---|---|
| `'2d-top'` | 12 | 0 | 0 | 平面俯视 |
| `'3d-perspective'` | 14 | 60 | -30 | 默认透视 |
| `'3d-low-orbit'` | 15 | 75 | 45 | 低空环绕 |
| `'isometric'` | 14 | 45 | 0 | 等距视角 |

## `switchStationView(map, mode, options)`

```ts
function switchStationView(
  map: CaoguoMap,
  mode: StationViewMode,
  options: { center: [number, number]; animateMs?: number }
): ViewPreset
```

调用 maplibre 原生 `flyTo`，缺失则降级 `jumpTo`，再次降级 `setPitch`/`setBearing` 单方法。所有调用 try-catch 包裹不抛异常。

## `focusOnStation(map, options)`

```ts
function focusOnStation(map: CaoguoMap, options: {
  center: [number, number];
  voltage?: '1000' | '500' | '220' | '110' | '35' | '10' | '0.4';
  animateMs?: number;
}): ViewPreset
```

固定使用 `3d-perspective` 视角聚焦变电站。

## 附属设备聚合（纯函数）

```ts
import { stationAccessoryDevices, allStationAccessories } from '@caoguo/maplibre-grid';

const acc = stationAccessoryDevices('s1', dataset);
// → { stationId, devices: GridDevice[], lineCount }

const all = allStationAccessories(dataset);
// → StationAccessory[]
```

判定规则：与 substation 通过至少一条 `GridLine` 相连，且 `kind !== 'substation'` 的设备。