<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const stats = [
  { label: '开源协议', value: 2, suffix: ' 种', text: 'MIT / Apache-2.0' },
  { label: '覆盖网络', value: 6, suffix: ' 张', text: '六张网全场景' },
  { label: '内置组件', value: 24, suffix: '+', text: '行业图层与控件' },
  { label: '演示样例', value: 16, suffix: ' 个', text: '跨阶段可运行' },
  { label: '合作模式', value: 3, suffix: ' 种', text: '技术/投标/分润' },
];

const display = ref(stats.map(() => 0));
const root = ref<HTMLElement | null>(null);
let io: IntersectionObserver | undefined;

function run() {
  stats.forEach((s, i) => {
    const dur = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      display.value[i] = Math.round(s.value * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

onMounted(() => {
  if (!root.value) return;
  io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        run();
        io?.disconnect();
      }
    });
  });
  io.observe(root.value);
});
onUnmounted(() => io?.disconnect());
</script>

<template>
  <section ref="root" class="cg-section metrics">
    <div class="cg-container metrics-grid">
      <div v-for="(s, i) in stats" :key="s.label" class="metric">
        <div class="metric-value">
          {{ display[i] }}<span class="metric-suffix">{{ s.suffix }}</span>
        </div>
        <div class="metric-label">{{ s.label }}</div>
        <div class="metric-text">{{ s.text }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.metrics {
  background: var(--cg-bg-elev);
  border-top: 1px solid var(--cg-border);
  border-bottom: 1px solid var(--cg-border);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
  text-align: center;
}

.metric-value {
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 700;
  background: var(--cg-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}

.metric-suffix {
  font-size: 0.55em;
}

.metric-label {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--cg-text);
}

.metric-text {
  margin-top: 4px;
  font-size: 13px;
  color: var(--cg-text-muted);
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 36px 16px;
  }
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 36px 16px;
  }
}
</style>
