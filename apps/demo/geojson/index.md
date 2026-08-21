---
title: D2 GeoJSON 可视化
---

<script setup lang="ts">
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';
import CodeViewer from '../common/CodeViewer.vue';
import MapDemo from '../common/MapDemo.vue';
import { wuhanPipes } from '../data/wuhan-pipes';

const code = `import { Map } from '@caoguo/maplibre'
import { wuhanPipes } from './data/wuhan-pipes'

const map = new Map({ container: '#app', zoom: 11.4 })
map.on('load', () => {
  map.addSource('pipes', { type: 'geojson', data: wuhanPipes })
  map.addLayer({
    id: 'pipes',
    type: 'line',
    source: 'pipes',
    paint: { 'line-color': '#14b8a6', 'line-width': 3 },
  })
})`;
</script>

<DemoLayout title="D2 · GeoJSON 可视化" subtitle="把一份武汉管线 GeoJSON 渲染为矢量线图层。">
  <template #map>
    <MapDemo :data="wuhanPipes" :zoom="11.4" color-by="diameter" :height="'100%'" />
  </template>
  <template #panel>
    <SimPanel title="图层说明" hint="4 条管线">
      <p>数据驱动声明式渲染：<code>addSource</code> 注册数据，<code>addLayer</code> 描述绘制。按管径<strong>分级着色</strong>，端点自动生成节点圆点，支持动态 <code>setData</code> 更新。</p>
      <div class="legend">
        <span><i style="background:#38bdf8"></i>支管 ≤300</span>
        <span><i style="background:#14b8a6"></i>中压 600</span>
        <span><i style="background:#f59e0b"></i>主干 ≥800</span>
      </div>
    </SimPanel>
    <CodeViewer :code="code" lang="ts" />
  </template>
</DemoLayout>

<style scoped>
.legend { display:flex; flex-wrap:wrap; gap:14px; margin-top:4px; }
.legend span { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--cg-text-muted); }
.legend i { width:14px; height:4px; border-radius:2px; display:inline-block; }
</style>
