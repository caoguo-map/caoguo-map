<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  Map,
  WUHAN_CENTER,
  WebGLUnavailableError,
  type MapInstance,
  type GlowLine,
  type LodLevel,
  type LodChangeEvent,
} from '@caoguo/maplibre';

// 武汉样例管线数据（WGS84），分组：pipe 管线 / road 路网 / water 水系
const PIPE_LINES: GlowLine[] = [
  { group: 'pipe', coordinates: [[114.3055, 30.5928], [114.335, 30.61], [114.36, 30.64]] },
  { group: 'pipe', coordinates: [[114.3055, 30.5928], [114.28, 30.57], [114.25, 30.55]] },
  { group: 'road', coordinates: [[114.27, 30.66], [114.3055, 30.5928], [114.34, 30.52]] },
  { group: 'water', coordinates: [[114.22, 30.6], [114.28, 30.58], [114.33, 30.6], [114.38, 30.62]] },
];

// LOD 分级：低 zoom 用稀疏管线，高 zoom 用全量
const LOD_LEVELS: LodLevel<string>[] = [
  { id: 'province', minZoom: 0, maxZoom: 9, payload: 'sparse' },
  { id: 'city', minZoom: 10, maxZoom: 13, payload: 'normal' },
  { id: 'detail', minZoom: 14, payload: 'full' },
];

const el = ref<HTMLElement | null>(null);
let map: InstanceType<typeof Map> | null = null;
const webglError = ref(false);
// 区分两类降级：'unavailable' 浏览器无 WebGL（构造即失败）/ 'lost' 运行时上下文丢失或渲染崩溃
const webglErrorKind = ref<'unavailable' | 'lost'>('unavailable');

// 天地图授权 token：从 Vite 环境变量读取（不硬编码）。缺失时回退 OSM。
const TIANDITU_TOKEN = (import.meta as { env?: Record<string, string> }).env?.VITE_TIANDITU_TOKEN;
let scale: ReturnType<Map['addScaleControl']> | null = null;
let theme: ReturnType<Map['addThemeSwitcher']> | null = null;
let lod: ReturnType<Map['addLodController']> | null = null;

const glowOn = ref(true);
const lodLevel = ref('city');
const offlinePacked = ref(false);
const airgapOn = ref(false);
const statusMsg = ref('加载中…');

function applyGlow() {
  if (!map) return;
  if (glowOn.value) {
    const id = map.addGlowLayer({ id: 'cg-glow', lines: PIPE_LINES, baseWidth: 3, passes: 4 });
    statusMsg.value = `辉光图层已挂载：${id}`;
  } else {
    if (map.instance.getLayer('cg-glow')) map.instance.removeLayer('cg-glow');
    statusMsg.value = '辉光已关闭';
  }
}

function handleFatal(e: ErrorEvent | Error) {
  const msg = (e instanceof ErrorEvent ? e.message : e.message) || '';
  if (/webgl|context|fire|redraw|Map\._render/i.test(msg)) {
    webglErrorKind.value = 'lost';
    webglError.value = true;
  }
}

onMounted(() => {
  if (!el.value) return;
  const mapOpts: Record<string, unknown> = {
    container: el.value,
    center: WUHAN_CENTER,
    zoom: 11,
  };
  if (TIANDITU_TOKEN) {
    mapOpts.tianditu = { token: TIANDITU_TOKEN, type: 'vector' };
  } else {
    console.warn(
      '[FeatureShowcase] 未配置 VITE_TIANDITU_TOKEN，暂回退 OpenStreetMap 底图。',
    );
  }
  try {
    map = new Map(mapOpts as never);
  } catch (e) {
    if (e instanceof WebGLUnavailableError) {
      webglErrorKind.value = 'unavailable';
      webglError.value = true;
      return;
    }
    throw e;
  }
  // 某些沙箱环境能创建出「伪」WebGL 上下文，构造不报错但渲染即崩。
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
    if (!map) return;
    scale = map.addScaleControl({ showCoordinate: true });
    theme = map.addThemeSwitcher();
    lod = map.addLodController(LOD_LEVELS, (e: LodChangeEvent<string>) => {
      lodLevel.value = e.level.id;
    });
    // 离线：启用 IndexedDB 离线存储，并把当前管线打包进去
    map.enableOffline();
    applyGlow();
    statusMsg.value = '就绪：比例尺 / 主题 / 辉光 / LOD 已挂载';
  });
});

function toggleGlow() {
  glowOn.value = !glowOn.value;
  // 先移除再按需挂载
  if (map && map.instance.getLayer('cg-glow')) map.instance.removeLayer('cg-glow');
  if (glowOn.value) applyGlow();
}

async function packOffline() {
  if (!map) return;
  const store = map.getOfflineStore();
  if (!store) {
    statusMsg.value = '离线存储未启用';
    return;
  }
  // 把样例管线按瓦片网格打包进离线存储（覆盖当前视野附近层级）
  await map.packGeoJSON(
    'demo-pipe',
    {
      type: 'FeatureCollection',
      features: PIPE_LINES.map((l, i) => ({
        type: 'Feature',
        properties: { id: i, group: l.group },
        geometry: { type: 'LineString', coordinates: l.coordinates },
      })),
    },
    { maxZoom: 14 }
  );
  offlinePacked.value = true;
  statusMsg.value = '已打包管线到离线存储（IndexedDB）';
}

function toggleAirgap() {
  airgapOn.value = !airgapOn.value;
  // 空气隔离开关：通过 postMessage 通知已注册的 SW（需部署 SW 脚本）
  statusMsg.value = airgapOn.value
    ? '空气隔离：开启（断网可用，需部署 SW 脚本）'
    : '空气隔离：关闭（在线优先）';
}

onUnmounted(() => {
  window.removeEventListener('error', handleFatal);
  scale?.remove();
  theme?.remove();
  lod?.remove();
  map?.remove();
});
</script>

<template>
  <div class="fs">
    <div class="fs-map-wrap">
      <div ref="el" class="fs-map" />
      <div v-if="webglError" class="fs-fallback">
        <div class="fs-fallback-icon">🗺️</div>
        <p class="fs-fallback-title">当前环境无法渲染地图</p>
        <p class="fs-fallback-desc">
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
    <div class="fs-panel">
      <h3>Phase-0 能力面板</h3>
      <button class="fs-btn" @click="toggleGlow">{{ glowOn ? '关闭辉光' : '开启辉光' }}</button>
      <button class="fs-btn" @click="packOffline">{{ offlinePacked ? '已打包离线' : '打包管线离线' }}</button>
      <button class="fs-btn" @click="toggleAirgap">{{ airgapOn ? '关闭空气隔离' : '开启空气隔离' }}</button>
      <div class="fs-row">
        <span>比例尺/坐标</span><b>已挂载</b>
      </div>
      <div class="fs-row">
        <span>主题</span><b>暗/亮可切（右上角）</b>
      </div>
      <div class="fs-row">
        <span>LOD 等级</span><b>{{ lodLevel }}</b>
      </div>
      <div class="fs-status">{{ statusMsg }}</div>
      <p class="fs-tip">
        LOD 随缩放自动切换密度；主题切换右上角按钮；空气隔离需部署 SW 脚本后生效（见离线文档）。
      </p>
    </div>
  </div>
</template>

<style scoped>
.fs { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; min-height: 520px; }
.fs-map-wrap { position: relative; width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid var(--cg-border); }
.fs-map { width: 100%; height: 520px; background: var(--cg-bg); }
.fs-fallback { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; background: var(--cg-bg); color: var(--cg-text-muted); height: 520px; }
.fs-fallback-icon { font-size: 40px; opacity: 0.7; }
.fs-fallback-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--cg-text); }
.fs-fallback-desc { margin: 0; max-width: 360px; font-size: 13px; line-height: 1.6; }
.fs-panel { display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 1px solid var(--cg-border); border-radius: 12px; background: var(--cg-bg-soft); }
.fs-panel h3 { margin: 0 0 4px; font-size: 16px; }
.fs-btn { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--cg-border); background: var(--cg-gradient-soft); color: var(--cg-text); cursor: pointer; font-size: 13px; }
.fs-btn:hover { border-color: var(--cg-primary-3); }
.fs-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--cg-text-muted); }
.fs-row b { color: var(--cg-text); }
.fs-status { font-size: 12.5px; color: var(--cg-primary-3); min-height: 18px; }
.fs-tip { font-size: 12px; color: var(--cg-text-muted); line-height: 1.6; margin: 4px 0 0; }
@media (max-width: 960px) { .fs { grid-template-columns: 1fr; } .fs-map { height: 380px; } }
</style>
