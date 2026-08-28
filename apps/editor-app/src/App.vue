<script setup lang="ts">
import { ref, computed } from 'vue';
import { Editor, ScreenViewer } from '@caoguo/map-editor';
import Home from './Home.vue';

// 视图状态：home 首页 / editor 编辑器 / screen 大屏投放
const view = ref<'home' | 'editor' | 'screen'>('home');
// ?screen=1 直达大屏
const screenMode = computed(() => new URLSearchParams(window.location.search).get('screen') === '1');
if (screenMode.value) view.value = 'screen';

function enter(target: 'editor' | 'screen') {
  view.value = target;
}
function goHome() {
  view.value = 'home';
}
</script>

<template>
  <transition name="swap" mode="out-in">
    <Home v-if="view === 'home'" @enter="enter" />
    <div v-else class="app-shell">
      <button class="home-fab" @click="goHome" title="返回首页">← 首页</button>
      <ScreenViewer v-if="view === 'screen'" />
      <Editor v-else />
    </div>
  </transition>
</template>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
.app-shell { position: relative; width: 100%; height: 100%; }
.home-fab {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 50;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(13, 18, 32, 0.85);
  color: #e0e6f0;
  font-size: 12px;
  padding: 7px 14px;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: all 0.15s;
}
.home-fab:hover { border-color: rgba(74, 222, 128, 0.5); color: #4ade80; }

/* 首页 ↔ 功能 切换过渡 */
.swap-enter-active,
.swap-leave-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.swap-enter-from { opacity: 0; transform: scale(0.98); }
.swap-leave-to { opacity: 0; transform: scale(1.02); }
</style>
