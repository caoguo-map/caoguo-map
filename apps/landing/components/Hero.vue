<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Map, WUHAN_CENTER } from '@caoguo/maplibre';

const mapEl = ref<HTMLElement | null>(null);
let map: InstanceType<typeof Map> | null = null;
let timer: number | undefined;

onMounted(() => {
  if (!mapEl.value || typeof window === 'undefined') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    map = new Map({
      container: mapEl.value,
      center: WUHAN_CENTER,
      zoom: 11.2,
      pitch: 48,
      bearing: 0,
    });
    map.on('load', () => {
      if (reduce) return; // 尊重无障碍偏好，静止展示
      let b = 0;
      const spin = () =>
        (timer = window.setInterval(() => {
          b = (b + 0.04) % 360;
          map?.instance.setBearing(b);
        }, 50));
      spin();
      // 标签页隐藏时暂停旋转，省电且避免后台空转
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (timer) clearInterval(timer);
          timer = undefined;
        } else {
          spin();
        }
      });
    });
  } catch (e) {
    // 离线环境底图加载失败时，靠下方渐变兜底，不阻塞首屏
    console.warn('[hero] map init skipped:', e);
  }
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (map) map.remove();
});
</script>

<template>
  <section class="hero">
    <div ref="mapEl" class="hero-map" aria-hidden="true"></div>
    <div class="hero-veil" aria-hidden="true"></div>

    <div class="hero-content cg-container">
      <span class="cg-eyebrow">面向六张网 · 开源可私有化</span>
      <h1 class="hero-title">
        草果地图<br />
        <span class="cg-gradient-text">把空间智能，装进你的内网</span>
      </h1>
      <p class="hero-lead">
        地下管网、电网、水网、交通、算力、通信——一套开源地图引擎，
        断网可用、数据不出域，为关键基础设施场景而生。
      </p>
      <!-- 主入口：面向开发者 -->
      <div class="hero-group">
        <span class="hero-group-label">面向开发者</span>
        <div class="hero-actions">
          <a class="cg-btn cg-btn-primary" href="/docs/guide/quickstart.html">开始使用</a>
          <a class="cg-btn cg-btn-ghost" href="/docs/">查看文档</a>
          <a class="cg-btn cg-btn-ghost" href="/demo/">在线体验</a>
        </div>
      </div>

      <!-- 副入口：面向合作伙伴 -->
      <div class="hero-group hero-partner">
        <div class="hero-divider"><span>或</span></div>
        <span class="hero-partner-tag">🤝 面向合作伙伴</span>
        <p class="hero-partner-text">
          系统集成商 / ISV / 外包公司？用草果地图接更多项目，<strong>利润率提升 2–3 倍</strong>。
        </p>
        <a class="cg-btn cg-btn-accent" href="/partner/">了解合作方案 →</a>
      </div>
    </div>

    <a class="hero-scroll" href="#painpoints" aria-label="向下滚动">
      <span></span>
    </a>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 20% 30%, rgba(14, 165, 233, 0.16), transparent 55%),
    radial-gradient(ellipse at 80% 70%, rgba(20, 184, 166, 0.14), transparent 55%),
    var(--cg-bg);
}

.hero-map {
  position: absolute;
  inset: 0;
  opacity: 0.55;
}

.hero-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(10, 15, 30, 0.4) 0%, rgba(10, 15, 30, 0.2) 40%, var(--cg-bg) 100%),
    radial-gradient(circle at 50% 50%, transparent 30%, rgba(10, 15, 30, 0.5) 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: clamp(40px, 6.5vw, 76px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin: 0 0 22px;
}

.hero-lead {
  font-size: clamp(16px, 1.6vw, 20px);
  line-height: 1.7;
  color: var(--cg-text-muted);
  max-width: 600px;
  margin: 0 0 34px;
}

.hero-group {
  margin-bottom: 26px;
}

.hero-group-label {
  display: block;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cg-text-muted);
  margin-bottom: 12px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.hero-divider {
  position: relative;
  text-align: center;
  margin: 4px 0 18px;
  color: var(--cg-text-muted);
  font-size: 13px;
}

.hero-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--cg-border);
}

.hero-divider span {
  position: relative;
  background: var(--cg-bg);
  padding: 0 14px;
}

.hero-partner {
  max-width: 540px;
  padding: 20px 22px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--cg-accent-soft) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--cg-accent) 30%, transparent);
}

.hero-partner-tag {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: var(--cg-accent);
  margin-bottom: 8px;
}

.hero-partner-text {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--cg-text);
}

.hero-partner-text strong {
  color: var(--cg-accent);
}

@media (max-width: 768px) {
  .hero-group {
    margin-bottom: 20px;
  }
  .hero-partner {
    padding: 16px;
  }
}

.hero-scroll {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  width: 26px;
  height: 42px;
  border: 2px solid var(--cg-border-strong);
  border-radius: 14px;
  z-index: 2;
}

.hero-scroll span {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 4px;
  height: 8px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--cg-primary-3);
  animation: scrolldot 1.6s ease-in-out infinite;
}

@keyframes scrolldot {
  0% { opacity: 0; transform: translateY(0); }
  40% { opacity: 1; }
  80% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 0; }
}

@media (max-width: 768px) {
  .hero {
    min-height: 92vh;
  }
  .hero-actions .cg-btn {
    flex: 1 1 auto;
  }
}
</style>
