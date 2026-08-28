<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, shallowRef, computed } from 'vue';
import maplibregl from 'maplibre-gl';
import {
  Map,
  localBasemapStyle,
  isWebGLAvailable,
  getGlobalConfig,
} from '@caoguo/maplibre';
import { useEditor } from '../store/useEditor';
import { useDeviceData } from '../store/useDeviceData';
import { useDeviceStore } from '../store/useDeviceStore';
import { ICON_PATHS, type IconName } from '../icons';
import { deviceIcon, deviceColor } from '../devices';
import type { ComponentNode, MapLayer } from '../types';

const props = defineProps<{ node: ComponentNode }>();
const { activeScene, selectedId, state } = useEditor();
const { setSelectedDevice, store: deviceStore } = useDeviceStore();

// 同场景内的设备图层（取第一个）
const deviceLayer = computed<MapLayer | undefined>(() =>
  activeScene.value?.layers.find((l) => l.type === 'device-layer'),
);
const { devices, error: dataError } = useDeviceData(deviceLayer);

const containerRef = ref<HTMLDivElement | null>(null);
const wrapperRef = shallowRef<InstanceType<typeof Map> | null>(null);
const markersRef = shallowRef<maplibregl.Marker[]>([]);
const webglError = ref(false);
const tokenTip = ref('');

function svgMarkup(iconName: string, color: string, size: number): string {
  const paths = ICON_PATHS[iconName as IconName] ?? ICON_PATHS.box;
  const inner = paths.map((d) => `<path d="${d}"/>`).join('');
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" ` +
    `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  );
}

function buildMarkerElement(dev: { type: string; status: string; name?: string }): HTMLDivElement {
  const size = 36;
  const color = deviceColor(dev.status);
  const el = document.createElement('div');
  el.className = 'cg-dev-marker';
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.borderRadius = '50%';
  el.style.background = 'rgba(8,12,22,0.85)';
  el.style.border = `2px solid ${color}`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.boxShadow = `0 0 10px ${color}66`;
  el.style.cursor = 'pointer';
  el.innerHTML = svgMarkup(deviceIcon(dev.type), color, size - 12);
  if (dev.status === 'warning' || dev.status === 'fault') {
    el.style.animation = 'cg-marker-pulse 1.4s infinite';
  }
  el.title = dev.name ?? '';
  return el;
}

function clearMarkers() {
  markersRef.value.forEach((m) => m.remove());
  markersRef.value = [];
}

function renderMarkers() {
  const inst = wrapperRef.value?.getMap();
  if (!inst) return;
  clearMarkers();
  const filter = deviceStore.filterStatus;
  const list = filter === 'all' ? devices.value : devices.value.filter((d) => d.status === filter);
  for (const d of list) {
    if (typeof d.lng !== 'number' || typeof d.lat !== 'number') continue;
    const el = buildMarkerElement(d);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setSelectedDevice(d.id);
      if (deviceLayer.value) selectedId.value = deviceLayer.value.id;
    });
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([d.lng, d.lat])
      .addTo(inst);
    markersRef.value.push(marker);
  }
}

function buildOptions() {
  const cfg = props.node.config as Record<string, any>;
  const center = (cfg.center as [number, number]) ?? [114.31, 30.59];
  const zoom = typeof cfg.zoom === 'number' ? cfg.zoom : 12;
  const tiles: string = cfg.tiles ?? 'local';
  const token = getGlobalConfig()?.tiandituToken;

  let style: any = localBasemapStyle();
  let tianditu: { token: string; type?: any } | undefined;
  if (tiles === 'tianditu') {
    if (token) tianditu = { token, type: 'img' };
    else tokenTip.value = '未配置天地图 Token，已回退到本地底图';
  }
  return { center, zoom, style, tianditu };
}

function mountMap() {
  if (!containerRef.value) return;
  if (!isWebGLAvailable()) {
    webglError.value = true;
    return;
  }
  const opts = buildOptions();
  const map = new Map({
    container: containerRef.value,
    center: opts.center,
    zoom: opts.zoom,
    style: opts.style,
    tianditu: opts.tianditu,
  });
  wrapperRef.value = map;

  map.on('load', () => {
    applyInteractionMode();
    renderMarkers();
  });
}

/** 编辑态禁用地图交互（避免与节点拖动冲突）；预览态启用平移/缩放/旋转 */
function applyInteractionMode() {
  const inst = wrapperRef.value as any;
  if (!inst) return;
  if (state.preview) {
    inst.dragPan?.enable();
    inst.dragRotate?.enable();
    inst.scrollZoom?.enable();
    inst.doubleClickZoom?.enable();
    inst.touchZoomRotate?.enable();
  } else {
    inst.dragPan?.disable();
    inst.dragRotate?.disable();
    inst.scrollZoom?.disable();
    inst.doubleClickZoom?.disable();
    inst.touchZoomRotate?.disable();
  }
}

onMounted(mountMap);

onBeforeUnmount(() => {
  clearMarkers();
  wrapperRef.value?.remove();
  wrapperRef.value = null;
});

// 设备数据变化 → 重绘 marker
watch(
  () => devices.value.map((d) => `${d.id}:${d.lng},${d.lat}:${d.status}`).join('|'),
  () => {
    const inst = wrapperRef.value?.getMap();
    if (inst) renderMarkers();
  },
);

// 配置变化：中心点 / 缩放 / 底图类型
watch(
  () => [props.node.config?.center, props.node.config?.zoom, props.node.config?.tiles] as const,
  () => {
    const inst = wrapperRef.value as any;
    if (!inst) return;
    const cfg = props.node.config as Record<string, any>;
    if (cfg.center) inst.jumpTo?.({ center: cfg.center, zoom: cfg.zoom ?? 12 });
  },
  { deep: true },
);

// 预览态切换 → 启用/禁用地图交互
watch(
  () => state.preview,
  () => applyInteractionMode(),
);

// 筛选状态变化 → 重绘 marker（按状态显隐）
watch(
  () => deviceStore.filterStatus,
  () => {
    const inst = wrapperRef.value?.getMap();
    if (inst) renderMarkers();
  },
);
</script>

<template>
  <div class="cg-map-node">
    <div ref="containerRef" class="cg-map-canvas" />
    <div v-if="webglError" class="cg-map-fallback">当前环境不支持 WebGL，无法渲染地图</div>
    <div v-else-if="tokenTip" class="cg-map-tip">{{ tokenTip }}</div>
    <div v-else-if="dataError" class="cg-map-tip cg-map-err">数据错误：{{ dataError }}</div>
  </div>
</template>

<style scoped>
.cg-map-node {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 4px;
  background: #0b1020;
}
.cg-map-canvas {
  position: absolute;
  inset: 0;
}
.cg-map-fallback,
.cg-map-tip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 6px 10px;
  font-size: 12px;
  color: #ffd479;
  background: rgba(0, 0, 0, 0.55);
  text-align: center;
}
.cg-map-err { color: #f87171; background: rgba(60, 10, 10, 0.7); }
</style>

<style>
@keyframes cg-marker-pulse {
  0% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.5); }
  70% { box-shadow: 0 0 0 12px rgba(248, 113, 113, 0); }
  100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
}
</style>
