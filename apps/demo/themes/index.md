---
title: 六张网行业主题配色
---

<script setup lang="ts">
import IndustryPalette from '../common/IndustryPalette.vue';
import MapDemo from '../common/MapDemo.vue';
import { wuhanPipes } from '../data/wuhan-pipes';
import { INDUSTRY_META } from '@caoguo/theme';
</script>

# 六张网行业主题 · 真实配色

六张网（管网 / 电网 / 水网 / 交通 / 算力 / 通信）的语义配色已沉淀进 `@caoguo/theme` 的
`INDUSTRY_PALETTES`，作为跨网权威色板；并通过 `registerIndustryThemes()` 注册为可直接
`buildStyle({ theme: 'caoguo-ind-<key>' })` 使用的行业底图变体。

下方色板由 `INDUSTRY_PALETTES` 实时渲染：每张网含 **语义色**（要素 / 类型）、**分级色**（流量 /
负载 / 信号热力梯度）与 **状态色**（安全 / 预警 / 危险）。

<IndustryPalette />

## 行业专属矢量图层（按语义色渲染）

业务图层（管线、电网、水系…）的颜色现已统一取自 `INDUSTRY_PALETTES`，保证「六张网真实配色」
单一来源。下方以武汉管网为例，使用管网主色 `{{ INDUSTRY_META.pipeline.primary }}` 渲染主干 / 支管图层：

<MapDemo
  :data="wuhanPipes"
  :zoom="11.4"
  :line-color="INDUSTRY_META.pipeline.primary"
  :height="'420px'"
/>
