# 水网 · Phase 2 MVP

草果地图水网组件包 `@caoguo/maplibre-water`，聚焦水网（流域 / 河段 / 水库 / 闸站 / 堤防），
交付**水系拓扑图、洪水淹没模拟、水库联合调度** 3 类组件 + 水文算法库。

## 模块组成

| 模块 | 路径 | 能力 |
| --- | --- | --- |
| RiverSystem | [`/water/river`](/water/river) | 水系层级渲染 + 顺逆流钻取 + 按流量/蓄水率/堤防安全着色 |
| FloodInundation | [`/water/flood`](/water/flood) | SCS-CN 径流 + 推理公式洪峰 + flood fill 淹没范围 |
| DamOperation | [`/water/dam`](/water/dam) | 多水库泄量调整 + 下游水位影响推演 + 多方案对比 |

## 设计要点

1. **算法纯函数 + 渲染薄壳**
   - 水文模型（SCS-CN / 推理公式 / 淹没提取）、调度推演均为纯函数，可在 Node 端运行

2. **简化水文模型（浏览器端可运行）**
   - 降雨→径流：SCS-CN 模型 `Q = (P - 0.2S)² / (P + 0.8S)`
   - 洪峰流量：推理公式法 `Qp = 0.278 × C × i × A / t`
   - 淹没提取：DEM 栅格 + 计算水位 → flood fill → 淹没多边形

3. **可视化兼容性好**
   - 颜色搭配 caoguo-dark/light 主题，配色规则见 [caoguo-water 主题](/water/river)

4. **离线 + 可集成**
   - 无后端依赖，所有计算在前端完成

## 演示数据

演示使用武汉模拟水网（合成数据，含 1 流域 + 3 河流 + 3 水库 + 2 闸站 + 2 堤防 + 2 雨量站 + 2 水位站）。
详见 `apps/demo/data/wuhan-water.ts`。

## 快速集成示例

```ts
import { CaoguoMap } from '@caoguo/maplibre';
import { RiverSystem, simulateFlood, simulateDamSchedule } from '@caoguo/maplibre-water';

const map = new CaoguoMap({ container, center, zoom });
map.on('load', () => {
  // 1) 水系拓扑
  const river = new RiverSystem({ map, dataset, colorBy: 'flow' });
  river.render();

  // 2) 淹没模拟
  const result = simulateFlood(dataset, dem, { rainfall: 100 }, [1, 1]);
  console.log(result.maxDepth);

  // 3) 水库调度
  const schedule = simulateDamSchedule(dataset, { outflows: { 'res-1': 100 } });
  console.log(schedule.downstreamLevels);
});
```

## 路线图

- **Phase 2（当前）** - 水系拓扑 / 淹没模拟 / 联合调度（3 个 MVP）
- **Phase 3** - 接入真实 DEM（30m）+ 多情景对比 + 撤退路径推荐
