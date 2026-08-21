<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Map, WUHAN_CENTER, type MapInstance } from '@caoguo/maplibre';

const props = withDefaults(
  defineProps<{
    center?: [number, number];
    zoom?: number;
    data?: Record<string, unknown> | null;
    lineColor?: string;
    height?: string;
    /** 按数值属性分级着色（如 diameter），为空则使用统一 lineColor */
    colorBy?: string | null;
    /** 需要高亮（红色加粗）的要素 name 列表 */
    highlight?: string[];
    /** 飞行到指定坐标 */
    flyTo?: [number, number] | null;
  }>(),
  {
    center: () => WUHAN_CENTER,
    zoom: 11,
    data: null,
    lineColor: '#14b8a6',
    height: '100%',
    colorBy: null,
    highlight: () => [],
    flyTo: null,
  },
);

const emit = defineEmits<{ ready: [MapInstance] }>();

const el = ref<HTMLElement | null>(null);
let map: InstanceType<typeof Map> | null = null;

function lineColorExpr(): unknown {
  if (props.colorBy) {
    return [
      'interpolate', ['linear'], ['get', props.colorBy],
      300, '#38bdf8',
      600, '#14b8a6',
      800, '#f59e0b',
      1000, '#f43f5e',
    ];
  }
  return props.lineColor;
}

function highlightFilter(): unknown {
  return ['in', ['get', 'name'], ['literal', props.highlight ?? []]];
}

onMounted(() => {
  if (!el.value) return;
  map = new Map({ container: el.value, center: props.center, zoom: props.zoom });
  map.on('load', () => {
    if (props.data) {
      map?.addSource('demo', { type: 'geojson', data: props.data as object });
      map?.addLayer({
        id: 'demo-line',
        type: 'line',
        source: 'demo',
        paint: {
          'line-color': lineColorExpr() as never,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 14, 4],
          'line-opacity': 0.85,
        },
      });
      // 高亮层：覆盖在基础线之上
      map?.addLayer({
        id: 'demo-highlight',
        type: 'line',
        source: 'demo',
        filter: highlightFilter() as never,
        paint: {
          'line-color': '#f43f5e',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 7],
          'line-blur': 0.6,
        },
      });
      // 管线端点圆点
      map?.addLayer({
        id: 'demo-nodes',
        type: 'circle',
        source: 'demo',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 14, 5],
          'circle-color': '#04141a',
          'circle-stroke-color': props.lineColor,
          'circle-stroke-width': 1.5,
        },
      });
    }
    if (map) emit('ready', map.instance);
  });
});

watch(
  () => props.highlight,
  () => {
    if (map && props.data && map.instance.getLayer('demo-highlight')) {
      map.instance.setFilter('demo-highlight', highlightFilter() as never);
    }
  },
);

watch(
  () => props.flyTo,
  (to) => {
    if (map && to) map.flyTo({ center: to, zoom: 12.5 });
  },
);

onUnmounted(() => map?.remove());
</script>

<template>
  <div ref="el" class="map-demo" :style="{ height }"></div>
</template>

<style scoped>
.map-demo {
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: var(--cg-bg);
}
</style>
