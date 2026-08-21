# 算力网 · Phase 3 MVP

草果地图算力网组件包 `@caoguo/maplibre-compute`，聚焦算力网（数据中心 / 边缘节点 / 光缆），
交付**算力节点地图、延迟热力图、供需预测** 3 类组件 + 图算法库。

## 模块组成

| 模块 | 路径 | 能力 |
| --- | --- | --- |
| ComputeNodes | [`/compute/nodes`](/compute/nodes) | 节点分布（按类型/利用率/状态着色）+ 光缆路由可视化 |
| LatencyMap | [`/compute/latency`](/compute/latency) | 延迟分级 + 最优接入推荐 + 延迟告警 |
| SupplyDemand | [`/compute/predict`](/compute/predict) | 未来 7 天算力缺口预测 |

## 设计要点

1. **算法纯函数 + 渲染薄壳**
   - 供需预测、最低延迟路径、最优接入推荐均为纯函数

2. **着色规则**（PRD §4.1.3）
   - 节点按 GPU 利用率：空闲绿 → 低负载青 → 中负载黄 → 高负载橙 → 满载红
   - 光缆按利用率着色 + 线宽按带宽分级

3. **可视化兼容性好**
   - 颜色搭配 caoguo-dark/light 主题

## 演示数据

演示使用武汉模拟算力网（合成数据，含 6 节点 + 6 光缆）。
详见 `apps/demo/data/wuhan-compute.ts`。

## 快速集成示例

```ts
import { CaoguoMap } from '@caoguo/maplibre';
import { ComputeNodes, LatencyMap, predictSupplyDemand } from '@caoguo/maplibre-compute';

const map = new CaoguoMap({ container, center, zoom });
map.on('load', () => {
  // 1) 节点地图
  const nodes = new ComputeNodes({ map, dataset, nodeColorBy: 'gpuUtil' });
  nodes.render();

  // 2) 延迟地图
  const latency = new LatencyMap({ map, dataset });
  const best = latency.recommendBestNode(114.3, 30.5);

  // 3) 供需预测
  const gaps = predictSupplyDemand(dataset, { daysAhead: 7 });
});
```

## 路线图

- **Phase 3（当前）** - 节点 / 延迟 / 供需预测（3 个 MVP）
- **后续** - 接入实时 GPU 监控 + 资源调度引擎 + 三维数据中心
