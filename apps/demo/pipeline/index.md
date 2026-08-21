# 地下管网 · Phase 1 MVP

草果地图管网组件包 `@caoguo/maplibre-pipeline`，聚焦地下管网（燃气 / 供水 / 供热 / 排水 / 电力管沟 / 通信管沟），
交付**拓扑可视化、爆管推演、健康评估、NLPG 查询** 4 类组件 + 算法库（基于图论）。

## 模块组成

| 模块 | 路径 | 能力 |
| --- | --- | --- |
| Topology | [`/pipeline/topology`](/pipeline/topology) | 管段/节点按类型、状态、管径、材质着色；连通性高亮 |
| Burst | [`/pipeline/burst`](/pipeline/burst) | 选管段 → 自动找隔离阀 → 推演下游影响范围 + 重要用户识别 |
| Health | [`/pipeline/health`](/pipeline/health) | 6 维加权评分（年龄/材质/土壤/历史/压力/阴保）+ 热力图聚类 |
| NLPG | [`/pipeline/nlpg`](/pipeline/nlpg) | 自然语言查询 → 提取管网专属意图 → 联动 Burst/Topology |

## 设计要点

1. **算法纯函数 + 渲染薄壳**
   - 60+ 纯函数均可在 Node 端运行（`npm test` 全 PASS）
   - 组件层只负责订阅结果并绘图，方便业务方在任意框架下集成

2. **算法基于图论**
   - BFS / DFS / Dijkstra 一应俱全，对管网 5K 节点规模毫秒级

3. **可视化兼容性好**
   - 颜色搭配 caoguo-dark/light 主题
   - 配色规则详见 [caoguo-pipeline 主题](../pipeline/topology)

4. **离线 + 可集成**
   - 无后端依赖，依赖包体积 < 50KB

## 演示数据

演示使用武汉模拟管网（合成数据，含 7 阀门 + 1 储水罐 + 5 制水厂节点 + 15 管段 + 6 用户）。
详见 `apps/demo/data/wuhan-pipeline.ts`。

## 快速集成示例

```ts
import { CaoguoMap } from '@caoguo/maplibre';
import { PipelineTopology, BurstSimulator, PipelineHealth, PipelineNlp } from '@caoguo/maplibre-pipeline';

const map = new CaoguoMap({ container, center, zoom });
map.on('load', () => {
  // 1) 拓扑渲染
  const topo = new PipelineTopology({ map, dataset, colorBy: 'type' });
  topo.render();

  // 2) 爆管推演（点击管段触发）
  const burst = new BurstSimulator({ map, dataset, scenario: 'water' });
  const result = burst.simulate('p04');
  console.log(result.valvePlan.summary);

  // 3) 健康评估
  const health = new PipelineHealth({ map, dataset });
  const hr = health.evaluate();
  console.log('优先维护：', hr.maintenance.slice(0, 3));

  // 4) NLPG 自然语言
  const nlp = new PipelineNlp({ burstSimulator: burst });
  nlp.query('朝阳门外爆管');
});
```

## 路线图

- **Phase 1（当前）** - 拓扑/爆管/健康/NLPG（4 个 MVP）
- **Phase 2** - 接入真实业务数据 + Flowable 流程引擎 + 移动端离线
- **Phase 3** - 多端协同 + 物联感知 + 数字孪生
