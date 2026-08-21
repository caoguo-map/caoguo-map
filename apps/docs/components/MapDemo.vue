<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map, WUHAN_CENTER } from '@caoguo/maplibre';

const props = withDefaults(
  defineProps<{
    center?: [number, number];
    zoom?: number;
    data?: Record<string, unknown> | null;
    height?: string;
  }>(),
  {
    center: () => WUHAN_CENTER,
    zoom: 11,
    data: null,
    height: '420px',
  },
);

const el = ref<HTMLElement | null>(null);
let map: InstanceType<typeof Map> | null = null;

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
        paint: { 'line-color': '#14b8a6', 'line-width': 3 },
      });
    }
  });
});
onUnmounted(() => map?.remove());
</script>

<template>
  <div ref="el" class="map-demo" :style="{ height }"></div>
</template>

<style scoped>
.map-demo {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--cg-border);
  background: var(--cg-bg);
}
</style>
