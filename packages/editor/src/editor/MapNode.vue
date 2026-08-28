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
import { readThresholdRule, resolveDeviceColor } from '../thresholds';
import type { ComponentNode, MapLayer } from '../types';

const props = defineProps<{ node: ComponentNode }>();
const { activeScene, selectedId, state, switchScene } = useEditor();
const { setSelectedDevice, store: deviceStore } = useDeviceStore();

// 同场景内的设备图层（取第一个）
const deviceLayer = computed<MapLayer | undefined>(() =>
  activeScene.value?.layers.find((l) => l.type === 'device-layer'),
);
// 设备图层配置（markerSize / pulseOnWarning / schemas 类型定制）
const layerCfg = computed(() => (deviceLayer.value?.config ?? {}) as Record<string, any>);
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

function buildMarkerElement(dev: { type: string; status: string; name?: string }, color: string, pulse: boolean): HTMLDivElement {
  // 消费设备图层配置：markerSize（此前硬编码 36）/ pulseOnWarning / schemas 类型定制图标与标签
  const size = Number(layerCfg.value.markerSize) || 36;
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
  const schema = (layerCfg.value.schemas ?? {})[dev.type] as { label?: string; icon?: string } | undefined;
  if (schema?.icon) {
    // Schema 自定义图标（emoji 直接以文本渲染）
    const span = document.createElement('span');
    span.textContent = schema.icon;
    span.style.fontSize = Math.max(12, size - 14) + 'px';
    span.style.lineHeight = '1';
    el.appendChild(span);
  } else {
    el.innerHTML = svgMarkup(deviceIcon(dev.type), color, size - 12);
  }
  if (layerCfg.value.pulseOnWarning !== false && pulse) {
    el.style.animation = 'cg-marker-pulse 1.4s infinite';
  }
  el.title = schema?.label ?? dev.name ?? '';
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
  const thrRule = readThresholdRule(layerCfg.value);
  const list = filter === 'all' ? devices.value : devices.value.filter((d) => d.status === filter);
  for (const d of list) {
    if (typeof d.lng !== 'number' || typeof d.lat !== 'number') continue;
    // 本地阈值规则着色优先于后端 status 着色
    const color = resolveDeviceColor(thrRule, d, deviceColor(d.status));
    const pulse =
      d.status === 'warning' ||
      d.status === 'fault' ||
      color === '#f87171' ||
      color === '#fbbf24';
    const el = buildMarkerElement(d, color, pulse);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      // 下钻：若设备图层配置了 drillDownSceneKey，则跳转到子场景并聚焦该设备；否则走原详情面板联动
      const drillKey = (deviceLayer.value?.config as Record<string, any> | undefined)?.drillDownSceneKey;
      if (drillKey && state.config.scenes.some((s) => s.key === drillKey)) {
        setSelectedDevice(d.id);
        switchScene(drillKey);
      } else {
        setSelectedDevice(d.id);
        if (deviceLayer.value) selectedId.value = deviceLayer.value.id;
      }
    });
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([d.lng, d.lat])
      .addTo(inst);
    markersRef.value.push(marker);
  }
}

/** 切换/选中设备后，将地图视窗平移聚焦到该设备坐标（下钻进入子场景时使用） */
function flyToDevice(id: string | null) {
  const wrapper = wrapperRef.value as any;
  if (!wrapper || !id) return;
  const ml = wrapper.getMap?.();
  if (!ml) return;
  const d = devices.value.find((x) => x.id === id);
  if (d && typeof d.lng === 'number' && typeof d.lat === 'number') {
    ml.flyTo?.({
      center: [d.lng, d.lat],
      zoom: Math.max((ml.getZoom?.() as number) ?? 12, 14),
      duration: 800,
    });
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

  // 控件（消费 showNavigation / showScale 配置，此前未实现）
  const mapCfg = props.node.config as Record<string, any>;
  const ml = map.getMap();
  if (mapCfg.showNavigation) ml.addControl(new maplibregl.NavigationControl(), 'top-right');
  if (mapCfg.showScale) ml.addControl(new maplibregl.ScaleControl(), 'bottom-left');

  map.on('load', () => {
    applyInteractionMode();
    renderMarkers();
    // 若进入该场景时已选中设备（如下钻进入），聚焦到该设备
    flyToDevice(deviceStore.selectedDeviceId);
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

// 选中设备变化 → 平移聚焦（支持告警面板跨场景定位）
watch(
  () => deviceStore.selectedDeviceId,
  (id) => {
    if (state.preview) flyToDevice(id);
  },
);

onBeforeUnmount(() => {
  clearMarkers();
  wrapperRef.value?.remove();
  wrapperRef.value = null;
});

// 设备数据变化 → 重绘 marker（含阈值字段值变化，确保本地阈值着色随实时数据刷新）
watch(
  () => {
    const f = layerCfg.value.thrField as string | undefined;
    return devices.value.map((d) => `${d.id}:${d.lng},${d.lat}:${d.status}:${f ? d[f] : ''}`).join('|');
  },
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

// 本地阈值规则变化 → 重新着色 marker
watch(
  () => [layerCfg.value.thrField, layerCfg.value.thrWarn, layerCfg.value.thrCrit] as const,
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
