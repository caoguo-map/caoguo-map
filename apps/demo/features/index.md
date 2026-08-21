---
title: Phase-0 能力演示
---

<script setup lang="ts">
import FeatureShowcase from '../common/FeatureShowcase.vue';
</script>

# Phase-0 能力演示

一个页面串联草果地图引擎 Phase-0 的全部基础能力，验证关键路径端到端闭环：

- **坐标系 / 底图**：WGS84 渲染基准，武汉暗色矢量底图
- **比例尺 + 实时坐标**（T8）：左下角随缩放更新，鼠标移动显示经纬度
- **主题切换**（T8）：右上角按钮在暗/亮主题间切换（diff 模式避免闪烁）
- **管线辉光**（T6）：GeoJSON 线经 CustomLayer 多遍描边形成辉光（开关可控）
- **LOD 控制器**（T7）：随缩放自动切换数据密度等级（右侧面板实时显示）
- **离线瓦片**（T4）：把当前管线打包进 IndexedDB 离线存储，断网仍可调出
- **空气隔离**（T5）：开关断网模式（需部署 SW 脚本后生效，见离线文档）

<FeatureShowcase ></FeatureShowcase>

> 注：天地图（T3）与空气隔离 Service Worker（T5）需运行时 token / 部署 SW 脚本，
> 本演示聚焦无需外部密钥即可验证的能力。完整接入见对应模块文档。
