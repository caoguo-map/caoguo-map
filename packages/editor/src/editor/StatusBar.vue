<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ComponentNode } from '../types';
import { useEditor } from '../store/useEditor';

const props = defineProps<{ node: ComponentNode }>();
const { goBackScene, canGoBack } = useEditor();

const cfg = computed(() => ({
  title: '智慧草果数字大屏',
  showClock: true,
  showBack: true,
  bgColor: 'rgba(10,15,28,0.9)',
  titleColor: '#ffffff',
  ...(props.node.config as Record<string, any>),
}));

const now = ref(new Date());
let timer: number | undefined;
function tick() {
  now.value = new Date();
}
function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
onMounted(() => {
  timer = window.setInterval(tick, 1000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <div class="cg-status-bar" :style="{ background: cfg.bgColor, color: cfg.titleColor }">
    <div class="cg-sb-left">
      <button v-if="cfg.showBack && canGoBack()" class="cg-sb-back" type="button" @click="goBackScene()">‹ 返回</button>
      <span v-if="cfg.title" class="cg-sb-title">{{ cfg.title }}</span>
    </div>
    <div v-if="cfg.showClock" class="cg-sb-clock">
      {{ now.getFullYear() }}-{{ pad(now.getMonth() + 1) }}-{{ pad(now.getDate()) }}
      {{ pad(now.getHours()) }}:{{ pad(now.getMinutes()) }}:{{ pad(now.getSeconds()) }}
    </div>
  </div>
</template>

<style scoped>
.cg-status-bar {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; box-sizing: border-box; font-size: 16px; font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.cg-sb-left { display: flex; align-items: center; gap: 16px; }
.cg-sb-title { letter-spacing: 1px; }
.cg-sb-back {
  border: 1px solid rgba(255, 255, 255, 0.25); background: transparent; color: inherit; cursor: pointer;
  font-size: 13px; padding: 3px 10px; border-radius: 4px;
}
.cg-sb-clock { font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums; opacity: 0.85; }
</style>
