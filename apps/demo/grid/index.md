# 电网 · Phase 2 MVP

草果地图电网组件包 `@caoguo/maplibre-grid`，聚焦电网（发电 / 输电 / 变电 / 配电 / 用户），
交付**拓扑浏览器、停电分析、负荷热力图** 3 类组件 + 图算法库。

## 模块组成

| 模块 | 路径 | 能力 |
| --- | --- | --- |
| GridTopology | [`/grid/topology`](/grid/topology) | 5 级钻取 + 供电路径追踪 + 按电压/状态/负荷/年份着色 |
| OutageAnalyzer | [`/grid/outage`](/grid/outage) | 选故障设备 → 下游遍历 → 受影响用户统计 + 备用路径 |
| LoadHeatmap | [`/grid/load`](/grid/load) | 负荷率着色（绿→黄→红）+ 过载预警 + 24h 负荷预测 |

## 设计要点

1. **算法纯函数 + 渲染薄壳**
   - 图算法（邻接表 / 方向 BFS）、停电分析、负荷预测均为纯函数，可在 Node 端运行
   - 组件层只负责订阅结果并绘图，业务方可在任意框架下集成

2. **5 级层级钻取**
   - 发电（L1）→ 输电（L2）→ 变电（L3）→ 配电（L4）→ 用户（L5）
   - 供电路径追踪从任一用户反向 BFS 到发电侧

3. **可视化兼容性好**
   - 颜色搭配 caoguo-dark/light 主题，配色规则见 [caoguo-grid 主题](/grid/topology)

4. **离线 + 可集成**
   - 无后端依赖，所有计算在前端完成

## 演示数据

演示使用武汉模拟电网（合成数据，含 3 电厂 + 3 铁塔 + 3 变电站 + 5 配变 + 7 用户 + 12 线路）。
详见 `apps/demo/data/wuhan-grid.ts`。

## 快速集成示例

```ts
import { CaoguoMap } from '@caoguo/maplibre';
import { GridTopology, OutageAnalyzer, LoadHeatmap } from '@caoguo/maplibre-grid';

const map = new CaoguoMap({ container, center, zoom });
map.on('load', () => {
  // 1) 电网拓扑
  const topo = new GridTopology({ map, dataset, colorBy: 'voltage' });
  topo.render();
  topo.setLevel('L3'); // 只显示变电层

  // 2) 停电分析
  const analyzer = new OutageAnalyzer({ map, dataset });
  const result = analyzer.analyze('sub-center');
  console.log(result.affectedUsers.important);

  // 3) 负荷热力图
  const heatmap = new LoadHeatmap({ map, dataset });
  heatmap.render();
  heatmap.highlightOverload();
});
```

## 路线图

- **Phase 2（当前）** - 拓扑 / 停电分析 / 负荷热力（3 个 MVP）
- **Phase 3** - 接入真实 SCADA 数据 + 三维变电站 + 台风多故障叠加
