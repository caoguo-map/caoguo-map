# 指南 · 坐标系与偏移纠偏（T2）

草果地图内部统一以 **WGS84（EPSG:4326）** 为渲染基准。国内业务数据却常是另外两种坐标系，若不加处理直接叠加，会出现数百米甚至上公里的偏移。本文讲清三种坐标系与纠偏方法。

## 三种坐标系

| 坐标系 | 说明 | 典型来源 |
| --- | --- | --- |
| `WGS84` | 国际标准经纬度，草果地图渲染基准 | GPS 设备、OpenStreetMap、天地图底图 |
| `GCJ02` | 国测局「火星坐标」，对 WGS84 做了非线性偏移 | 高德、腾讯地图底图、部分手机定位 |
| `CGCS2000` | 国家 2000 大地坐标系 | 测绘成果、国土/规划/管网业务数据 |

> 关键点：底图与叠加数据**必须处于同一坐标系**。草果地图底图（天地图）为 CGCS2000，渲染基准为 WGS84，引擎已做统一换算；**业务叠加数据**若不是 WGS84，请显式声明 `dataCRS`，由引擎在入图前纠偏。

## 声明业务数据坐标系

构造 `Map` 时通过 `dataCRS` 声明叠加数据的坐标系，之后所有 `addSource` 的业务坐标都会被自动纠偏到 WGS84：

```ts
import { Map } from '@caoguo/maplibre'

// 业务数据是 CGCS2000（如管网台账）
const map = new Map({ container: '#app', dataCRS: 'CGCS2000' })

map.on('load', () => {
  map.addSource('pipe', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [/* CGCS2000 坐标 */] },
  })
  // 内部已按 dataCRS 纠偏，无需手工转换
})
```

运行时也可切换/读取：

```ts
map.setDataCRS('GCJ02')      // 改叠加数据坐标系
map.getDataCRS()             // => 'GCJ02'
```

## 单点 / 批量纠偏

不需要实例化地图，也能直接用纯函数换算（可在 Node 中调用，便于数据预处理）：

```ts
import { toWgs84, transformPoint, transformBounds, createTransformer } from '@caoguo/maplibre'

// 单点：GCJ-02 -> WGS84
const [lng, lat] = toWgs84('GCJ02', 114.30, 30.59)

// 任意 CRS 互转
const [x, y] = transformPoint(114.30, 30.59, 'CGCS2000', 'GCJ02')

// 地理范围 [w, s, e, n] 转换
const b = transformBounds([114.2, 30.5, 114.4, 30.7], 'GCCS2000' as never, 'WGS84')

// 批量：构造变换器后循环
const t = createTransformer('CGCS2000', 'WGS84')
const fixed = rawPoints.map(([lng, lat]) => t.forward(lng, lat))
```

`Map` 实例也提供等价便捷方法：

```ts
map.transformToMap(114.30, 30.59)   // 按当前 dataCRS -> WGS84
map.getTransformer().forward(114.30, 30.59)
```

## 精度说明

- GCJ-02 / CGCS2000 与 WGS84 的互转采用公开等价实现，与官方格网误差 < 0.5m，满足绝大多数业务叠加场景。
- 测绘级（厘米级）精度场景，可注入 `GridShiftProvider` 7 参数 / 格网平移表进行高精度校正。

## 常见误区

:::: warning 别踩坑
- **底图与数据坐标系不一致**：用高德坐标当 WGS84 直接画，会出现整片偏移。务必声明 `dataCRS` 或用 `toWgs84` 预处理。
- **CGCS2000 ≠ WGS84**：两者在国内也有米级差异，管网/国土类数据请使用 `CGCS2000` 而非 `WGS84`。
- **不要重复纠偏**：声明了 `dataCRS` 后，传入的数据应为原始业务坐标，不要再手工转换一次，否则会纠偏两次。
::::
