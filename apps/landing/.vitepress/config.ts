import { defineConfig } from 'vitepress';

const TITLE = '草果地图 · 六张网的开源地图引擎';
const DESCRIPTION =
  '草果地图是面向地下管网、电网、水网、交通、算力、通信六张网的开源、可私有化地图引擎与 AI 空间智能服务。开源免费、完全私有化、为行业场景加速。';
const OG_IMAGE = 'https://map.hb.cn/og-image.png';

export default defineConfig({
  base: '/',
  title: TITLE,
  description: DESCRIPTION,
  lang: 'zh-CN',
  cleanUrls: true,
  appearance: 'force-dark',
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'canonical', href: 'https://map.hb.cn/' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'description', content: DESCRIPTION }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: TITLE }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
    ['meta', { property: 'og:url', content: 'https://map.hb.cn/' }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: TITLE }],
    ['meta', { name: 'twitter:description', content: DESCRIPTION }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
  ],
  themeConfig: {
    nav: [
      { text: '文档', link: '/docs/' },
      { text: '演示', link: '/demo/' },
      { text: 'GitHub', link: 'https://github.com/caoguo-map/caoguo-map' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/caoguo-map/caoguo-map' },
    ],
  },
});
