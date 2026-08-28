<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Canvas from './Canvas.vue';
import { useEditor } from '../store/useEditor';
import type { DashboardConfig } from '../types';

const props = defineProps<{ config?: DashboardConfig; embedded?: boolean }>();
const { state, setConfig, switchScene } = useEditor();
const err = ref<string | null>(null);

// 大屏等比自适应（响应式画布）：按视口与画布尺寸取最小缩放比，居中铺满
// 嵌入模式：按父容器尺寸计算并监听容器变化（ResizeObserver），非全屏 fixed
const rootRef = ref<HTMLElement | null>(null);
const scale = ref(1);
function applyFit() {
  const c = state.config.canvas;
  if (!c) return;
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  if (props.embedded && rootRef.value) {
    vw = rootRef.value.clientWidth || vw;
    vh = rootRef.value.clientHeight || vh;
  }
  scale.value = Math.min(vw / c.width, vh / c.height, 1) || 1;
}
window.addEventListener('resize', applyFit);
let ro: ResizeObserver | null = null;


const params = new URLSearchParams(window.location.search);
// ?interval=秒（默认 8，0=不轮播）
const interval = ref(Math.max(0, Number(params.get('interval') ?? '8') || 0));
// ?pause=1 初始暂停
const paused = ref(params.get('pause') === '1');
const progress = ref(1); // 当前场景剩余比例 1→0

const sceneList = computed(() => state.config.scenes ?? []);
const currentKey = computed(() => state.activeSceneKey);
const currentIndex = computed(() =>
  Math.max(0, sceneList.value.findIndex((s) => s.key === currentKey.value)),
);

let timer: number | null = null;
let raf: number | null = null;
let lastTs = 0;

function goto(index: number) {
  const list = sceneList.value;
  if (!list.length) return;
  const next = ((index % list.length) + list.length) % list.length;
  switchScene(list[next].key);
  progress.value = 1;
  lastTs = 0;
}

function tick(ts: number) {
  if (paused.value || interval.value <= 0 || sceneList.value.length <= 1) return;
  if (!lastTs) lastTs = ts;
  const dt = ts - lastTs;
  lastTs = ts;
  progress.value = Math.max(0, progress.value - dt / (interval.value * 1000));
  if (progress.value <= 0) goto(currentIndex.value + 1);
}

function loop(ts: number) {
  tick(ts);
  raf = requestAnimationFrame(loop);
}

function startLoop() {
  stopLoop();
  if (interval.value > 0 && sceneList.value.length > 1) {
    lastTs = 0;
    raf = requestAnimationFrame(loop);
  }
}
function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
}

function togglePause() {
  paused.value = !paused.value;
  if (!paused.value) startLoop();
}

function parseConfig(): DashboardConfig | null {
  const data = params.get('data');
  try {
    if (data) {
      const json = decodeURIComponent(escape(window.atob(data)));
      const cfg = JSON.parse(json) as DashboardConfig;
      localStorage.setItem('caoguo-screen', json);
      return cfg;
    }
    const saved = localStorage.getItem('caoguo-screen');
    if (saved) return JSON.parse(saved) as DashboardConfig;
  } catch (e) {
    err.value = '大屏配置解析失败：' + (e as Error).message;
  }
  return null;
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  else if (e.code === 'ArrowRight') goto(currentIndex.value + 1);
  else if (e.code === 'ArrowLeft') goto(currentIndex.value - 1);
}

onMounted(() => {
  // 优先使用 props.config（编程式嵌入）；否则从 URL ?data= 或 localStorage 读取
  const cfg = props.config ?? parseConfig();
  if (!cfg) {
    err.value = err.value || '未找到大屏配置（请在编辑器中点击「投放大屏」生成）。';
    return;
  }
  setConfig(cfg);
  switchScene(cfg.scenes[0]?.key ?? '');
  state.preview = true;
  applyFit();
  if (props.embedded && rootRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => applyFit());
    ro.observe(rootRef.value);
  }
  window.addEventListener('keydown', onKey);
  startLoop();
});

onBeforeUnmount(() => {
  stopLoop();
  ro?.disconnect();
  ro = null;
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', applyFit);
});
</script>

<template>
  <div ref="rootRef" class="cg-screen" :class="{ embedded: props.embedded }">
    <div v-if="err" class="cg-screen-err">{{ err }}</div>
    <template v-else>
      <div class="cg-screen-fit-wrap">
        <div class="cg-screen-fit" :style="{ transform: `scale(${scale})` }">
          <Canvas />
        </div>
      </div>
      <!-- 大屏轮播控制条（非编辑 chrome，仅大屏导航） -->
      <div v-if="sceneList.length > 1" class="cg-screen-bar">
        <button class="cg-screen-nav" @click="goto(currentIndex - 1)" title="上一场景">‹</button>
        <div class="cg-screen-dots">
          <button
            v-for="(s, i) in sceneList"
            :key="s.key"
            class="cg-screen-dot"
            :class="{ active: i === currentIndex }"
            :title="s.title"
            @click="goto(i)"
          >
            <span
              v-if="i === currentIndex && interval > 0"
              class="cg-screen-dot-fill"
              :style="{ transform: `scaleX(${progress})` }"
            ></span>
          </button>
        </div>
        <button class="cg-screen-nav" @click="goto(currentIndex + 1)" title="下一场景">›</button>
        <button class="cg-screen-nav" @click="togglePause" :title="paused ? '继续' : '暂停'">
          {{ paused ? '▶' : '⏸' }}
        </button>
        <span class="cg-screen-title">{{ sceneList[currentIndex]?.title }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cg-screen {
  position: fixed; inset: 0; background: #04070f; overflow: hidden;
}
/* 嵌入模式：随父容器尺寸渲染（父容器需给定宽高） */
.cg-screen.embedded {
  position: relative; inset: auto; width: 100%; height: 100%;
}
.cg-screen-fit-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.cg-screen-fit { transform-origin: center center; }
.cg-screen-err {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #f87171; font-size: 14px; padding: 24px; text-align: center;
}
.cg-screen-bar {
  position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px; z-index: 20;
  background: rgba(10, 14, 26, 0.6); backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 999px; padding: 6px 12px;
}
.cg-screen-nav {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05); color: #e0e6f0; cursor: pointer; font-size: 13px; line-height: 1;
}
.cg-screen-nav:hover { background: rgba(74, 222, 128, 0.18); }
.cg-screen-dots { display: flex; align-items: center; gap: 8px; }
.cg-screen-dot {
  position: relative; width: 10px; height: 10px; border-radius: 50%; padding: 0; cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.3); background: transparent; overflow: hidden;
}
.cg-screen-dot.active { border-color: #4ade80; }
.cg-screen-dot-fill {
  position: absolute; inset: 0; background: #4ade80; transform-origin: left center; border-radius: 50%;
}
.cg-screen-title {
  color: #b8c0d4; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
