<script setup lang="ts">
const year = new Date().getFullYear();
const cols = [
  {
    title: '产品',
    links: [
      { text: '落地页', href: '/' },
      { text: '文档站', href: '/docs/' },
      { text: '演示中心', href: '/demo/' },
    ],
  },
  {
    title: '六张网',
    links: [
      { text: '地下管网', href: '/demo/' },
      { text: '电网', href: '/demo/' },
      { text: '水网', href: '/demo/' },
      { text: '交通 / 算力 / 通信', href: '/demo/' },
    ],
  },
  {
    title: '开源',
    links: [
      { text: 'GitHub', href: 'https://github.com/caoguo-map/caoguo-map', external: true },
      { text: '贡献指南', href: '/docs/guide/contributing.html' },
      { text: 'MIT 协议', href: '/docs/' },
    ],
  },
  {
    title: '合作伙伴',
    links: [
      { text: '了解合作方案', href: '/partner/' },
      { text: '商务咨询邮箱', href: 'mailto:partner@map.hb.cn' },
      { text: '技术交流', href: 'https://docs.map.hb.cn' },
    ],
  },
];
</script>

<template>
  <footer class="site-footer">
    <div class="cg-container footer-inner">
      <div class="footer-brand">
        <span class="footer-logo">草果地图</span>
        <p class="footer-desc">面向六张网的开源、可私有化地图引擎与 AI 空间智能服务。</p>
      </div>
      <div v-for="c in cols" :key="c.title" class="footer-col">
        <h4>{{ c.title }}</h4>
        <a v-for="l in c.links" :key="l.text" :href="l.href" :target="l.external ? '_blank' : undefined"
          :rel="l.external ? 'noopener' : undefined">{{ l.text }}</a>
      </div>
    </div>
    <div class="cg-container footer-bottom">
      <span>© {{ year }} 草果地图 · 基于 MapLibre GL 构建</span>
      <span>商务咨询 partner@map.hb.cn · 技术交流 docs.map.hb.cn</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: var(--cg-bg-elev);
  border-top: 1px solid var(--cg-border);
  padding: 56px 0 28px;
}

.footer-inner {
  display: grid;
  grid-template-columns: 1.6fr repeat(4, 1fr);
  gap: 32px;
}

.footer-logo {
  font-size: 20px;
  font-weight: 700;
}

.footer-desc {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--cg-text-muted);
  max-width: 320px;
}

.footer-col h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 14px;
  color: var(--cg-text);
}

.footer-col a {
  display: block;
  font-size: 14px;
  color: var(--cg-text-muted);
  padding: 5px 0;
  transition: color 0.2s ease;
}

.footer-col a:hover {
  color: var(--cg-primary-3);
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 44px;
  padding-top: 22px;
  border-top: 1px solid var(--cg-border);
  font-size: 13px;
  color: var(--cg-text-muted);
}

@media (max-width: 768px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
  }
  .footer-brand {
    grid-column: 1 / -1;
  }
}
</style>
