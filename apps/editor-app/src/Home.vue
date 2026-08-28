<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{ (e: 'enter', target: 'editor' | 'screen'): void }>();

// 标语循环切换（切换效果）
const slogans = [
  '拖拽即所得，快速搭建数字大屏',
  '地图为底，数据叠加，一屏掌控',
  '从编辑器到大屏投放，无缝衔接',
];
const sloganIndex = ref(0);
let timer: number | undefined;
onMounted(() => {
  timer = window.setInterval(() => {
    sloganIndex.value = (sloganIndex.value + 1) % slogans.length;
  }, 3200);
});
onUnmounted(() => timer && clearInterval(timer));

// 功能菜单
const menus = [
  { key: 'editor', icon: '🎨', title: '可视化编辑器', desc: '拖拽组件、配置属性，所见即所得搭建数据大屏', target: 'editor' as const },
  { key: 'screen', icon: '📺', title: '大屏投放', desc: '一键投放大屏，全屏沉浸式数据展示', target: 'screen' as const },
  { key: 'map', icon: '🗺️', title: '地图底图', desc: '天地图 / OSM 暗色底图，叠加设备与告警图层', target: 'editor' as const },
  { key: 'tpl', icon: '🧩', title: '组件模板', desc: '丰富的图表与数据卡片，一键套用模板起步', target: 'editor' as const },
];
</script>

<template>
  <div class="home">
    <div class="home-glow home-glow-a" />
    <div class="home-glow home-glow-b" />

    <header class="home-top">
      <div class="home-brand">🗺️ 草果地图</div>
      <nav class="home-nav">
        <span>产品</span><span>模板</span><span>文档</span><span class="home-nav-cta">控制台</span>
      </nav>
    </header>

    <main class="home-hero">
      <div class="home-kicker">数字大屏可视化平台</div>
      <h1 class="home-title">让地理数据<br />跃然一屏之上</h1>

      <div class="home-slogan">
        <transition name="slide" mode="out-in">
          <p :key="sloganIndex" class="home-slogan-text">{{ slogans[sloganIndex] }}</p>
        </transition>
      </div>

      <div class="home-menu">
        <button
          v-for="(m, i) in menus"
          :key="m.key"
          class="home-card"
          :style="{ animationDelay: 0.15 * i + 0.3 + 's' }"
          @click="emit('enter', m.target)"
        >
          <div class="home-card-icon">{{ m.icon }}</div>
          <div class="home-card-title">{{ m.title }}</div>
          <div class="home-card-desc">{{ m.desc }}</div>
          <div class="home-card-go">进入 →</div>
        </button>
      </div>
    </main>

    <footer class="home-foot">草果地图 · 地理信息可视化引擎 · 内部预览版</footer>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(1200px 600px at 50% -10%, #0d2138 0%, #060912 55%, #04060d 100%);
  color: #e0e6f0;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.home-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  pointer-events: none;
}
.home-glow-a {
  width: 520px; height: 520px;
  background: rgba(74, 222, 128, 0.25);
  top: -160px; left: -120px;
  animation: float-a 14s ease-in-out infinite;
}
.home-glow-b {
  width: 460px; height: 460px;
  background: rgba(56, 189, 248, 0.18);
  bottom: -180px; right: -100px;
  animation: float-b 16s ease-in-out infinite;
}
@keyframes float-a { 0%,100% { transform: translate(0,0); } 50% { transform: translate(60px, 40px); } }
@keyframes float-b { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-50px, -30px); } }

.home-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 40px;
  animation: fade-down 0.6s ease both;
}
.home-brand { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
.home-nav { display: flex; gap: 24px; font-size: 13px; color: #8b93a7; }
.home-nav span { cursor: pointer; transition: color 0.15s; }
.home-nav span:hover { color: #e0e6f0; }
.home-nav-cta {
  color: #06281a !important;
  background: #4ade80;
  padding: 5px 14px;
  border-radius: 20px;
  font-weight: 600;
}

.home-hero {
  position: relative;
  z-index: 2;
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 40px 0;
  text-align: center;
}
.home-kicker {
  display: inline-block;
  font-size: 12px;
  letter-spacing: 3px;
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 20px;
  padding: 5px 14px;
  margin-bottom: 18px;
  animation: fade-up 0.6s ease both;
}
.home-title {
  font-size: 52px;
  line-height: 1.15;
  font-weight: 800;
  margin: 0 0 18px;
  background: linear-gradient(180deg, #ffffff, #9fb4cf);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: fade-up 0.6s ease 0.1s both;
}
.home-slogan {
  height: 26px;
  margin-bottom: 44px;
  overflow: hidden;
  animation: fade-up 0.6s ease 0.2s both;
}
.home-slogan-text { margin: 0; font-size: 15px; color: #8b93a7; }

.home-menu {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  text-align: left;
}
.home-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 20px 56px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  color: inherit;
  text-align: left;
  font: inherit;
  opacity: 0;
  animation: fade-up 0.6s ease both;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.home-card:hover {
  transform: translateY(-8px);
  border-color: rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.06);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(74, 222, 128, 0.25);
}
.home-card-icon {
  font-size: 30px;
  transition: transform 0.25s ease;
}
.home-card:hover .home-card-icon { transform: scale(1.18); }
.home-card-title { font-size: 16px; font-weight: 700; color: #eef2f8; }
.home-card-desc { font-size: 12px; line-height: 1.6; color: #8b93a7; flex: 1; }
.home-card-go {
  position: absolute;
  left: 20px; bottom: 18px;
  font-size: 13px;
  font-weight: 600;
  color: #4ade80;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
}
.home-card:hover .home-card-go { opacity: 1; transform: translateX(4px); }

.home-foot {
  position: absolute;
  bottom: 18px;
  left: 0; right: 0;
  text-align: center;
  font-size: 11px;
  color: #4b5563;
  z-index: 2;
}

@keyframes fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-down { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
/* slogan 切换 */
.slide-enter-active, .slide-leave-active { transition: all 0.45s ease; }
.slide-enter-from { opacity: 0; transform: translateY(12px); }
.slide-leave-to { opacity: 0; transform: translateY(-12px); }

@media (max-width: 880px) {
  .home-menu { grid-template-columns: repeat(2, 1fr); }
  .home-title { font-size: 38px; }
}
</style>
