<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const scrolled = ref(false);
const menuOpen = ref(false);

function onScroll() {
  scrolled.value = window.scrollY > 24;
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <header class="site-nav" :class="{ scrolled }">
    <div class="nav-inner">
      <a class="brand" href="/" @click="menuOpen = false">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="30" height="30">
            <defs>
              <linearGradient id="nav-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#14b8a6" />
                <stop offset="0.5" stop-color="#0ea5e9" />
                <stop offset="1" stop-color="#22d3ee" />
              </linearGradient>
            </defs>
            <path d="M32 8 L54 21 L54 43 L32 56 L10 43 L10 21 Z" fill="none" stroke="url(#nav-g)" stroke-width="3" />
            <circle cx="32" cy="32" r="5.5" fill="url(#nav-g)" />
            <circle cx="32" cy="32" r="12" fill="none" stroke="url(#nav-g)" stroke-width="1.4" opacity="0.55" />
          </svg>
        </span>
        <span class="brand-name">草果地图</span>
      </a>

      <nav class="nav-links" :class="{ open: menuOpen }">
        <a href="/docs/">文档</a>
        <a href="/demo/">演示</a>
        <a class="nav-partner" href="/partner/">合作伙伴</a>
        <a href="/partner/#contact">联系</a>
        <a href="https://github.com/caoguo-map/caoguo-map" target="_blank" rel="noopener">GitHub</a>
        <a class="nav-cta" href="/docs/guide/quickstart.html">开始使用</a>
      </nav>

      <button class="nav-toggle" :aria-expanded="menuOpen.toString()" aria-label="切换菜单"
        @click="menuOpen = !menuOpen">
        <span :class="{ x: menuOpen }"></span>
        <span :class="{ x: menuOpen }"></span>
        <span :class="{ x: menuOpen }"></span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.site-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
  border-bottom: 1px solid transparent;
}

.site-nav.scrolled {
  background: var(--cg-bg-glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom-color: var(--cg-border);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 18px;
}

.brand-mark {
  display: inline-flex;
  filter: drop-shadow(0 0 8px rgba(20, 184, 166, 0.4));
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
  font-size: 15px;
}

.nav-links a {
  color: var(--cg-text-muted);
  transition: color 0.2s ease;
}

.nav-links a:hover {
  color: var(--cg-text);
}

.nav-partner {
  padding: 7px 16px;
  border-radius: 999px;
  color: var(--cg-accent) !important;
  font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--cg-accent) 45%, transparent);
  background: color-mix(in srgb, var(--cg-accent) 12%, transparent);
}

.nav-partner:hover {
  background: color-mix(in srgb, var(--cg-accent) 22%, transparent);
}

.nav-cta {
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--cg-gradient);
  color: #04141a !important;
  font-weight: 600;
  box-shadow: var(--cg-glow);
}

.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  width: 40px;
  height: 40px;
  background: transparent;
  border: 0;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.nav-toggle span {
  width: 22px;
  height: 2px;
  background: var(--cg-text);
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.nav-toggle span.x:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.nav-toggle span.x:nth-child(2) {
  opacity: 0;
}

.nav-toggle span.x:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

@media (max-width: 768px) {
  .nav-toggle {
    display: flex;
  }

  .nav-links {
    position: absolute;
    top: 64px;
    left: 16px;
    right: 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 12px;
    border-radius: var(--cg-radius);
    background: var(--cg-bg-glass);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--cg-border);
    transform: translateY(-12px);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  .nav-links.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .nav-links a {
    padding: 12px 14px;
    border-radius: 10px;
  }

  .nav-cta {
    text-align: center;
  }
}
</style>
