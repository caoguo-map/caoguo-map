# AI Debug · 地图诊断工具

`@caoguo/maplibre-ai` 的 Debug 模块回答一个高频问题：「我的地图为什么卡？」。采集性能/瓦片/内存指标后，规则引擎给出结构化诊断与优化建议——离线可用，不需要把数据发给大模型。

## 能力构成

| 能力 | 入口 | 回答的问题 |
| --- | --- | --- |
| 性能分析 | `analyzePerformance(m)` | 帧率低/脚本长任务/首帧慢，瓶颈在哪 |
| 瓦片监控 | `analyzeTiles(m)` | 瓦片加载失败率、超载（默认阈值 200 并发） |
| 内存泄漏 | `detectMemoryLeak(snapshots)` | 多次内存快照是否呈单调增长趋势 |
| 综合诊断 | `diagnose({ perf, tiles?, memory? })` | 一条命令出完整报告 + 优化建议 |

## 快速上手：一条命令诊断

```ts
import { diagnose } from '@caoguo/maplibre-ai'

const report = diagnose({
  perf: {
    fps: 24,                 // 当前帧率
    longTasks: 12,           // 长任务次数
    firstContentfulPaint: 2800,
    // …其余 ProfilerMetrics 指标
  },
  tiles: { loaded: 1840, failed: 23, pending: 310 },
  memory: memSnapshots,      // 可选：间隔采集的内存快照数组
})

report.perfIssues     // ProfilerIssue[]：每条含规则与建议
report.tiles          // 瓦片监控报告（失败率/是否超载）
report.memory         // 内存泄漏报告（未传则 undefined）
report.suggestions    // 汇总的优化建议（按优先级）
```

## 采集指标的建议方式

指标由调用方采集，模块只做**规则分析**（`DIAGNOSIS_RULES` 可查）：

```ts
// 性能：PerformanceObserver 采集长任务与绘制
new PerformanceObserver((list) => { /* 累计 longTasks */ })
  .observe({ entryTypes: ['longtask'] })

// 内存：间隔快照（MB）
setInterval(() => snapshots.push({
  t: Date.now(),
  usedJSHeapSize: performance.memory?.usedJSHeapSize / 1048576,
}), 30_000)
```

内存泄漏判定看**趋势**而非单点：多次快照单调增长 + GC 后不回落才告警，避免把「正在渲染大图层」误报成泄漏。

## 典型诊断输出

```jsonc
{
  "perfIssues": [
    { "rule": "low-fps", "message": "帧率 24 低于 30 建议线", "suggestion": "检查图层总数与数据驱动表达式数量" }
  ],
  "tiles": { "failureRate": 0.012, "overloaded": true, "suggestion": "开启 LOD 控制器或降低 maxZoom" },
  "suggestions": [ "…" ]
}
```

建议落点与引擎能力一一对应：图层过多 → 《性能调优与 LOD》；瓦片超载 → 《瓦片服务》自建源；样式热更新频繁 → 《样式与主题》的 `setPaintProperty` 替代 `setStyle`。

## 边界声明

AI Debug 是**规则诊断**：它基于阈值与模式匹配给出工程建议，不能替代浏览器 DevTools 的精确定位，也不含 LLM 调用（需要语义级分析时，把 `DebugReport` 作为上下文交给 Copilot/LLM 即可）。

::::: tip 相关页面
- 按诊断建议优化：《性能调优与 LOD》
- 大模型接入：《LLM Provider》
:::::
