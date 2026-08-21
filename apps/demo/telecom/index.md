# 通信网 · Phase 3 MVP

草果地图通信网组件包 `@caoguo/maplibre-telecom`，聚焦通信网（基站覆盖 / 信号热力 / 网络健康），
交付**基站覆盖地图、网络健康度面板** 2 类组件 + 覆盖分析算法。

## 模块组成

| 模块 | 路径 | 能力 |
| --- | --- | --- |
| CellCoverage | [`/telecom/coverage`](/telecom/coverage) | 基站按运营商/技术着色 + 覆盖区域叠加 + 盲区识别 + 扇区可视化 |
| NetworkHealth | [`/telecom/health`](/telecom/health) | 在线率统计 + 故障告警 + 故障趋势 |

## 设计要点

1. **算法纯函数 + 渲染薄壳**
   - 覆盖盲区识别（射线法）、重叠率计算、故障趋势聚合均为纯函数

2. **着色规则**（PRD §5.1.3）
   - 基站按运营商：移动绿 / 联通红 / 电信蓝 / 广电橙
   - 信号强度（RSRP）热力：极弱红 → 弱橙 → 一般黄 → 好绿 → 极好青

3. **运营商品牌主题**（PRD §5.3）
   - 三大运营商预设品牌主题，一键切换

## 演示数据

演示使用武汉模拟通信网（合成数据，含 5 基站 + 5 覆盖区域 + 8 信号采样点）。
详见 `apps/demo/data/wuhan-telecom.ts`。

## 快速集成示例

```ts
import { CaoguoMap } from '@caoguo/maplibre';
import { CellCoverage, NetworkHealth } from '@caoguo/maplibre-telecom';

const map = new CaoguoMap({ container, center, zoom });
map.on('load', () => {
  // 1) 基站覆盖
  const coverage = new CellCoverage({ map, dataset, colorBy: 'carrier' });
  coverage.render();

  // 2) 网络健康度
  const health = new NetworkHealth({ dataset });
  const rate = health.onlineRateByCarrier();
});
```

## 路线图

- **Phase 3（当前）** - 基站覆盖 / 网络健康（2 个 MVP）
- **后续** - 接入真实 MR 数据 + 覆盖仿真 + 网络优化建议
