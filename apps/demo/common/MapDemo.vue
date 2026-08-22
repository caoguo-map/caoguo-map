<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Map, WUHAN_CENTER, WebGLUnavailableError, type MapInstance } from '@caoguo/maplibre';
import { buildIndustryStyle, type IndustryKey } from '@caoguo/theme';

const props = withDefaults(
  defineProps<{
    center?: [number, number];
    zoom?: number;
    /** GeoJSON FeatureCollection（线/点混合均可） */
    data?: Record<string, unknown> | null;
    lineColor?: string;
    height?: string;
    /** 按数值属性分级着色（如 diameter），为空则使用统一 lineColor */
    colorBy?: string | null;
    /** 需要高亮（红色加粗）的要素 name 列表 */
    highlight?: string[];
    /** 飞行到指定坐标 */
    flyTo?: [number, number] | null;
    /** 自定义底图 style（优先级最高，覆盖 tianditu / OSM 默认底图） */
    style?: unknown;
    /** 六张网行业主题底图变体 key（如 'grid' / 'pipeline'），自动用 buildIndustryStyle 派生 */
    industry?: IndustryKey;
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
const webglError = ref(false);
// 区分两类降级：'unavailable' 浏览器无 WebGL（构造即失败）/ 'lost' 运行时上下文丢失或渲染崩溃
const webglErrorKind = ref<'unavailable' | 'lost'>('unavailable');

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

function applyHighlight() {
  if (!map) return;
  const mi = map.instance;
  if (mi.getLayer('demo-line-hl')) mi.setFilter('demo-line-hl', (['all', ['!=', ['geometry-type'], 'Point'], highlightFilter()]) as never);
  if (mi.getLayer('demo-point-hl')) mi.setFilter('demo-point-hl', (['all', ['==', ['geometry-type'], 'Point'], highlightFilter()]) as never);
}

/** 地图渲染过程中抛出的致命错误（如 WebGL 上下文丢失）兜底到降级提示 */
function handleFatal(e: ErrorEvent | Error) {
  const msg = (e instanceof ErrorEvent ? e.message : e.message) || '';
  if (/webgl|context|fire|redraw|Map\._render/i.test(msg)) {
    webglErrorKind.value = 'lost';
    webglError.value = true;
  }
}

// 天地图授权 token：从 Vite 环境变量读取（不硬编码）。缺失时回退 OSM。
const TIANDITU_TOKEN = (import.meta as { env?: Record<string, string> }).env?.VITE_TIANDITU_TOKEN;

onMounted(() => {
  if (!el.value) return;
  const opts: Record<string, unknown> = {
    container: el.value,
    center: props.center,
    zoom: props.zoom,
  };
  // 行业主题底图变体优先于自定义 style，二者均优先于默认底图。
  if (props.style) {
    opts.style = props.style;
  } else if (props.industry) {
    opts.style = buildIndustryStyle(props.industry);
  }
  if (TIANDITU_TOKEN) {
    opts.tianditu = { token: TIANDITU_TOKEN, type: 'vector' };
  } else {
    console.warn(
      '[MapDemo] 未配置 VITE_TIANDITU_TOKEN，暂回退 OpenStreetMap 底图。' +
        '配置后将自动切换为天地图（国内权威底图）。',
    );
  }
  try {
    map = new Map(opts as never);
  } catch (e) {
    if (e instanceof WebGLUnavailableError) {
      webglErrorKind.value = 'unavailable';
      webglError.value = true;
      return;
    }
    throw e;
  }
  // 某些沙箱环境能创建出「伪」WebGL 上下文，构造不报错但渲染即崩。
  // 这里再校验 maplibre 实际拿到的上下文是否真的可用。
  try {
    const canvas = map.instance.getCanvas();
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!ctx) {
      webglErrorKind.value = 'unavailable';
      webglError.value = true;
      return;
    }
  } catch {
    webglErrorKind.value = 'unavailable';
    webglError.value = true;
    return;
  }
  window.addEventListener('error', handleFatal);
  map.on('error', (e) => {
    if (e && /webgl|context/i.test(String((e as { error?: Error }).error?.message ?? ''))) {
      webglErrorKind.value = 'lost';
      webglError.value = true;
    }
  });
  map.on('load', () => {
    if (props.data) {
      map?.addSource('demo', { type: 'geojson', data: props.data as object });

      // 线/面层（排除纯点位）
      map?.addLayer({
        id: 'demo-line',
        type: 'line',
        source: 'demo',
        filter: ['!=', ['geometry-type'], 'Point'] as never,
        paint: {
          'line-color': lineColorExpr() as never,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 14, 4],
          'line-opacity': 0.85,
        },
      });

      // 点层（基站/变电站/学校等）
      map?.addLayer({
        id: 'demo-point',
        type: 'circle',
        source: 'demo',
        filter: ['==', ['geometry-type'], 'Point'] as never,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 6],
          'circle-color': '#14b8a6',
          'circle-stroke-color': '#04141a',
          'circle-stroke-width': 1.5,
        },
      });

      // 线/面高亮层：覆盖在基础层之上
      map?.addLayer({
        id: 'demo-line-hl',
        type: 'line',
        source: 'demo',
        filter: ['all', ['!=', ['geometry-type'], 'Point'], highlightFilter()] as never,
        paint: {
          'line-color': '#f43f5e',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 7],
          'line-blur': 0.6,
        },
      });

      // 点高亮层：放大 + 红色描边
      map?.addLayer({
        id: 'demo-point-hl',
        type: 'circle',
        source: 'demo',
        filter: ['all', ['==', ['geometry-type'], 'Point'], highlightFilter()] as never,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 10],
          'circle-color': '#f43f5e',
          'circle-stroke-color': '#04141a',
          'circle-stroke-width': 2,
        },
      });
    }
    if (map) emit('ready', map.instance);
  });
});

watch(() => props.highlight, applyHighlight);

watch(
  () => props.flyTo,
  (to) => {
    if (map && to) map.flyTo({ center: to, zoom: 12.5 });
  },
);

onUnmounted(() => {
  window.removeEventListener('error', handleFatal);
  map?.remove();
});
</script>

<template>
  <div class="map-demo-wrap" :style="{ height }">
    <div ref="el" class="map-demo" :style="{ height }"></div>
    <div v-if="webglError" class="map-demo-fallback">
      <div class="map-demo-fallback-icon">🗺️</div>
      <p class="map-demo-fallback-title">当前环境无法渲染地图</p>
      <p class="map-demo-fallback-desc">
        <template v-if="webglErrorKind === 'unavailable'">
          检测到浏览器未启用 WebGL（常见于沙箱、无头环境或禁用了硬件加速）。
          请在支持 WebGL 的桌面浏览器中打开本页，并在系统/浏览器设置中开启硬件加速后重试。
        </template>
        <template v-else>
          WebGL 渲染上下文已丢失或渲染过程中发生致命错误（可能因 GPU 重置、显存不足或驱动崩溃）。
          请刷新页面恢复；若频繁出现，请检查显卡驱动或降低渲染负载（如关闭辉光等特效）。
        </template>
      </p>
    </div>
  </div>
</template>

<style scoped>
.map-demo-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.map-demo {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: var(--cg-bg);
}

.map-demo-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  background: var(--cg-bg);
  color: var(--cg-text-muted);
  min-height: 480px;
}

.map-demo-fallback-icon {
  font-size: 40px;
  opacity: 0.7;
}

.map-demo-fallback-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--cg-text);
}

.map-demo-fallback-desc {
  margin: 0;
  max-width: 360px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
