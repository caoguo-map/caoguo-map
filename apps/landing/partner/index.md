---
layout: false
title: 合作伙伴 · 草果地图
---

<script setup lang="ts">
import SiteNav from '../components/SiteNav.vue';
import PartnerCalculator from '../components/PartnerCalculator.vue';
import SiteFooter from '../components/SiteFooter.vue';

const modes = [
  {
    title: '技术合作',
    desc: '免费获取源码、私有化部署包与行业组件，配套文档与示例快速上手。',
    path: 'M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2 M16 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2 M9 12h6',
  },
  {
    title: '联合投标',
    desc: '草果地图作为底层引擎随方案背书，强化国产化与自主可控资质。',
    path: 'M4 21V8l8-4 8 4v13 M9 21v-6h6v6 M4 8l8 4 8-4',
  },
  {
    title: '分润合作',
    desc: '面向最终客户的持续运维与增值模块，按项目享受长期分润。',
    path: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  },
];
</script>

<SiteNav />

<main>
  <section class="cg-section partner-hero">
    <div class="cg-container">
      <span class="cg-eyebrow">面向合作伙伴</span>
      <h1 class="ph-title">用草果地图，把 GIS 外包项目的<span class="cg-gradient-text">利润做厚</span></h1>
      <p class="ph-lead">
        系统集成商、ISV、外包公司——把地图引擎换成草果，授权成本归零、交付提速一倍，
        沉淀下来的组件还能在下一个项目复用。下面用利润计算器，算算你的项目能多赚多少。
      </p>
      <a class="cg-btn cg-btn-accent" href="#calc">立即测算我的项目 →</a>
    </div>
  </section>

  <section id="calc" class="cg-section">
    <div class="cg-container">
      <span class="cg-eyebrow">利润计算器</span>
      <h2 class="cg-h2">输入项目参数，<span class="cg-gradient-text">实时测算</span></h2>
      <p class="cg-lead">拖动合同额、选择项目类型，对比传统商业 GIS 与草果地图的授权、人力、周期与净利润率。</p>
      <PartnerCalculator />
    </div>
  </section>

  <section class="cg-section">
    <div class="cg-container">
      <span class="cg-eyebrow">合作模式</span>
      <h2 class="cg-h2">三种合作模式，<span class="cg-gradient-text">按需选择</span></h2>
      <div class="mode-grid">
        <article v-for="m in modes" :key="m.title" class="cg-card m-card" :style="{ '--accent': 'var(--cg-accent)' }">
          <div class="m-badge">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path :d="m.path" />
            </svg>
          </div>
          <h4 class="m-title">{{ m.title }}</h4>
          <p class="m-desc">{{ m.desc }}</p>
        </article>
      </div>
    </div>
  </section>

  <section id="contact" class="cg-section">
    <div class="cg-container partner-contact">
      <span class="cg-eyebrow">联系我们</span>
      <h2 class="cg-h2">聊聊你的<span class="cg-gradient-text">合作方案</span></h2>
      <p class="cg-lead">无论是技术对接、联合投标还是分润合作，我们都乐意与你深入沟通。</p>
      <div class="contact-cards">
        <a class="cg-card contact-card" href="mailto:partner@map.hb.cn">
          <span class="contact-k">商务咨询</span>
          <span class="contact-v">partner@map.hb.cn</span>
        </a>
        <a class="cg-card contact-card" href="https://docs.map.hb.cn" target="_blank" rel="noopener">
          <span class="contact-k">技术交流</span>
          <span class="contact-v">docs.map.hb.cn</span>
        </a>
        <a class="cg-card contact-card" href="https://github.com/caoguo-map/caoguo-map" target="_blank" rel="noopener">
          <span class="contact-k">开源仓库</span>
          <span class="contact-v">github.com/caoguo-map</span>
        </a>
      </div>
    </div>
  </section>
</main>

<SiteFooter />

<style scoped>
.partner-hero {
  padding-top: 120px;
  background:
    radial-gradient(ellipse at 80% 10%, var(--cg-accent-soft), transparent 55%),
    var(--cg-bg);
}

.ph-title {
  font-size: clamp(34px, 5vw, 60px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 14px 0 22px;
}

.ph-lead {
  font-size: clamp(16px, 1.6vw, 19px);
  line-height: 1.7;
  color: var(--cg-text-muted);
  max-width: 640px;
  margin: 0 0 30px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 40px;
}

.m-card {
  padding: 28px 26px;
}

.m-badge {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  margin-bottom: 18px;
}

.m-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 10px;
}

.m-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--cg-text-muted);
  margin: 0;
}

.partner-contact {
  text-align: center;
}

.contact-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 40px;
  text-align: left;
}

.contact-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 24px;
  text-decoration: none;
  transition: transform 0.15s ease, border-color 0.2s ease;
}

.contact-card:hover {
  transform: translateY(-3px);
  border-color: var(--cg-accent);
}

.contact-k {
  font-size: 13px;
  color: var(--cg-text-muted);
}

.contact-v {
  font-size: 17px;
  font-weight: 600;
  color: var(--cg-text);
  word-break: break-all;
}

@media (max-width: 880px) {
  .mode-grid,
  .contact-cards {
    grid-template-columns: 1fr;
  }
}
</style>
