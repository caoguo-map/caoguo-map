# @caoguo/map-editor

草果地图大屏可视化编辑器 —— 拖拽式大屏搭建工具，零代码创建游戏式地图大屏。

属于 [草果地图](https://github.com/caoguo-map) 开源地图引擎家族，配合
[`@caoguo/maplibre`](https://github.com/caoguo-map/maplibre)（地图引擎）使用，
编辑产出的大屏 JSON 由内置渲染运行时驱动，支持全屏播放与容器嵌入两种模式。

## 安装

```bash
npm i @caoguo/map-editor
```

peer 依赖：`vue@^3.4`、`maplibre-gl@^4.7`。

## 快速上手

### 编辑器（拖拽搭建大屏）

```ts
import { Editor } from '@caoguo/map-editor';
import '@caoguo/map-editor/style.css';
```

### 渲染运行时（JSON → 大屏）

```ts
import { renderFromJSON, renderScreen } from '@caoguo/map-editor';
import '@caoguo/map-editor/style.css';

// 全屏播放器（等比自适应 + 场景轮播）
const handle = renderFromJSON('#app', dashboardJson);
handle.unmount(); // 卸载

// 容器嵌入模式（父容器需给定宽高）
renderScreen('#panel', config, { embedded: true });
```

> 导出的大屏 JSON 已自动剔除数据源密码等敏感字段；数据库/Webhook 类数据源
> 经后端代理取数（编辑器「数据源 → 代理基地址」配置，默认 `http://localhost:8787`）。

## 能力一览

- **24 类画布组件**：地图底图 / 设备图层 / 设备列表 / 详情面板 / 数据卡片 / 折线·柱状·饼·仪表盘·风向玫瑰图表 / 容器与标签页…
- **14 种数据源**：REST 轮询 / WebSocket / 设备图层绑定 / MySQL·PostgreSQL·OceanBase·ClickHouse·InfluxDB·达梦 / Webhook / 静态数据 / Excel·CSV 上传
- **编辑体验**：多选·框选·对齐参考线·网格吸附·撤销重做·快捷键（Ctrl+C/V/Z/S、Delete）·行业模板
- **联动系统**：设备点击 → 详情面板、筛选标签 → 设备图层/图表、告警列表 → 定位
- **主题**：暗/亮双主题 token；导出 JSON / 本地草稿安全分层（导出脱敏）

## 相关仓库

| 仓库 | 说明 |
|------|------|
| [maplibre](https://github.com/caoguo-map/maplibre) | 地图引擎核心 |
| [theme](https://github.com/caoguo-map/theme) | 共享品牌主题 |
| [maplibre-pipeline / -grid / -water / -transport / -compute / -telecom / -ai](https://github.com/caoguo-map) | 六张网行业组件 |

## 开发

本仓库为 `packages/editor` 的拆分只读镜像，完整 monorepo（含本地预览应用与 mock 服务）见主仓。
修改请提交到 monorepo，经 `git subtree split` 同步至此。

## License

[Apache-2.0](./LICENSE)
