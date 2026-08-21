<script setup lang="ts">
</script>

<template>
  <section class="cg-section cta">
    <div class="cg-container cta-inner">
      <div class="cta-glow" aria-hidden="true"></div>
      <h2 class="cta-title">把地图能力，<span class="cg-gradient-text">装进你的内网</span></h2>
      <p class="cta-lead">开源、可私有化、为关键基础设施而生。无论自研还是接项目，今天就开始你的第一张行业地图。</p>

      <div class="cta-cols">
        <div class="cta-col">
          <h3 class="cta-col-title">面向开发者 / 甲方</h3>
          <div class="cta-actions">
            <a class="cg-btn cg-btn-primary" href="/docs/guide/quickstart.html">开始使用</a>
            <a class="cg-btn cg-btn-ghost" href="/demo/">浏览演示</a>
            <a class="cg-btn cg-btn-ghost" href="https://github.com/caoguo-map/caoguo-map" target="_blank"
              rel="noopener">GitHub 仓库</a>
          </div>
        </div>
        <div class="cta-col">
          <h3 class="cta-col-title">面向合作伙伴</h3>
          <div class="cta-actions">
            <a class="cg-btn cg-btn-accent" href="/partner/">了解合作方案</a>
            <a class="cg-btn cg-btn-ghost" href="mailto:partner@map.hb.cn">商务咨询邮箱</a>
          </div>
        </div>
      </div>

      <div class="cta-contact">
        <span>商务咨询：<a href="mailto:partner@map.hb.cn">partner@map.hb.cn</a></span>
        <span class="cta-sep">·</span>
        <span>技术交流：<a href="https://docs.map.hb.cn">docs.map.hb.cn</a></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta {
  background: var(--cg-bg);
  position: relative;
  overflow: hidden;
}

.cta-inner {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: clamp(48px, 7vw, 88px) 24px;
  border-radius: var(--cg-radius-lg);
  border: 1px solid var(--cg-border);
  background: var(--cg-bg-card);
  backdrop-filter: blur(var(--cg-glass-blur));
  -webkit-backdrop-filter: blur(var(--cg-glass-blur));
  overflow: hidden;
}

.cta-glow {
  position: absolute;
  inset: -40% 20% auto 20%;
  height: 320px;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.28), transparent 70%);
  filter: blur(20px);
  pointer-events: none;
}

.cta-title {
  font-size: clamp(28px, 4.5vw, 48px);
  font-weight: 700;
  margin: 0 0 16px;
}

.cta-lead {
  font-size: clamp(15px, 1.5vw, 18px);
  color: var(--cg-text-muted);
  max-width: 560px;
  margin: 0 auto 32px;
  line-height: 1.7;
}

.cta-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  margin-bottom: 30px;
}

.cta-col {
  padding: 26px 24px;
  border-radius: var(--cg-radius);
  border: 1px solid var(--cg-border);
  background: rgba(255, 255, 255, 0.02);
}

.cta-col-title {
  font-size: 17px;
  font-weight: 650;
  margin: 0 0 18px;
  color: var(--cg-text);
}

.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
}

.cta-contact {
  font-size: 14px;
  color: var(--cg-text-muted);
}

.cta-contact a {
  color: var(--cg-primary);
  text-decoration: none;
}

.cta-contact a:hover {
  text-decoration: underline;
}

.cta-sep {
  margin: 0 12px;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .cta-cols {
    grid-template-columns: 1fr;
  }
}
</style>
