---
title: D1 基础地图
---

<script setup lang="ts">
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';
import CodeViewer from '../common/CodeViewer.vue';
import MapDemo from '../common/MapDemo.vue';
import { WUHAN_CENTER } from '@caoguo/maplibre';

const code = `import { Map, WUHAN_CENTER } from '@caoguo/maplibre'

const map = new Map({
  container: '#app',
  center: WUHAN_CENTER, // [114.3055, 30.5928]
  zoom: 11,
  pitch: 45,
})`;
</script>

<DemoLayout title="D1 · 基础地图" subtitle="初始化一张武汉暗色底图，支持缩放、平移与俯仰。">
  <template #map>
    <MapDemo :zoom="11" :height="'100%'" ></MapDemo>
  </template>
  <template #panel>
    <SimPanel title="说明" hint="最小可用示例">
      <p>这是草果地图的最小示例。底图使用内置<strong>暗色演示样式</strong>（公开 OSM 栅格），上线前请替换为私有化底图。</p>
      <ul>
        <li>拖动平移、滚轮缩放</li>
        <li>右键旋转方位角</li>
        <li>数据完全在前端渲染</li>
      </ul>
    </SimPanel>
    <CodeViewer :code="code" lang="ts" ></CodeViewer>
  </template>
</DemoLayout>
