# 交通网 · Phase 3 MVP

草果地图交通网组件包 `@caoguo/maplibre-transport`，聚焦交通（路网 / 交通流 / 事件响应），
交付**路网编辑器、交通流量可视化、事件响应图** 3 类组件 + 拥堵预测算法。

## 模块组成

| 模块 | 路径 | 能力 |
| --- | --- | --- |
| RoadNetwork | [`/transport/road`](/transport/road) | 路网按道路等级/速度/状态着色 + 设施标注 |
| TrafficFlow | [`/transport/traffic`](/transport/traffic) | 实时路况着色 + 拥堵预测 + OD 矩阵 |
| IncidentMap | [`/transport/incident`](/transport/incident) | 事件标记 + 影响范围 + 附近资源 + 绕行方案 |

## 设计要点

1. **算法纯函数 + 渲染薄壳**
   - 拥堵预测（历史同时段 + 实时趋势线性回归）、事件影响分析均为纯函数
   - 组件层只负责订阅结果并绘图

2. **拥堵预测模型**（PRD §3.2.2）
   - `predicted = hist + trend * minutes_ahead`，附置信区间

3. **可视化兼容性好**
   - 道路等级着色：高速橙 / 国道红 / 省道紫 / 城市灰
   - 实时速度着色：停滞红 → 拥堵橙 → 缓行黄 → 畅通绿 → 高速青

## 演示数据

演示使用武汉模拟路网（合成数据，含 11 路段 + 14 节点 + 3 事件）。
详见 `apps/demo/data/wuhan-transport.ts`。

## 快速集成示例

```ts
import { CaoguoMap } from '@caoguo/maplibre';
import { RoadNetwork, TrafficFlow, IncidentMap } from '@caoguo/maplibre-transport';

const map = new CaoguoMap({ container, center, zoom });
map.on('load', () => {
  // 1) 路网渲染
  const road = new RoadNetwork({ map, dataset, colorBy: 'roadClass' });
  road.render();

  // 2) 交通流 + 拥堵预测
  const flow = new TrafficFlow({ map, dataset });
  const pred = flow.predict('r02', 30);

  // 3) 事件响应
  const incident = new IncidentMap({ map, dataset });
  const impact = incident.analyze(dataset.incidents[0]);
});
```

## 路线图

- **Phase 3（当前）** - 路网 / 交通流 / 事件响应（3 个 MVP）
- **后续** - 接入实时路况源 + 拥堵传播动画增强 + 3D 城市道路
