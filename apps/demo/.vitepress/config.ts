import { defineConfig } from 'vitepress';

const TITLE = '草果地图 · 演示中心';
const DESCRIPTION = '草果地图六张网场景的交互式演示：基础地图、GeoJSON 可视化、NLPG 查询、Copilot 交互。';

const AI_PROXY_TARGET = process.env.CAOGUO_AI_PROXY || 'http://127.0.0.1:8787';

// GitHub Pages 组织项目站点根路径为 /<repo>/（如 /caoguo-map/）。
// CI 部署时由 GITHUB_REPOSITORY 派生；本地 dev 回退 /（dev server 根即 demo）。
const REPO = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const SITE_BASE = REPO ? `/${REPO}/` : '/';

export default defineConfig({
  base: SITE_BASE,
  title: TITLE,
  description: DESCRIPTION,
  lang: 'zh-CN',
  vite: {
    server: {
      proxy: {
        '/api': {
          target: AI_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
  },
  cleanUrls: true,
  appearance: 'force-dark',
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'description', content: DESCRIPTION }],
  ],
  themeConfig: {
    nav: [
      { text: '总览', link: '/', exact: true },
      { text: '文档', link: '/docs/' },
      { text: 'GitHub', link: 'https://github.com/caoguo-map/caoguo-map' },
    ],
    sidebar: [
      {
        text: '通用工具 · Phase 0',
        items: [
          { text: 'D1 基础地图', link: '/basic/' },
          { text: 'D2 GeoJSON 可视化', link: '/geojson/' },
          { text: 'D3 NLPG 查询', link: '/nlpg/' },
          { text: 'D4 Copilot 交互', link: '/copilot/' },
          { text: 'D5 Phase-0 能力演示', link: '/features/' },
        ],
      },
      {
        text: '行业主题 · 六张网配色',
        items: [{ text: '六张网行业主题配色', link: '/themes/' }],
      },
      {
        text: '地下管网 · Phase 1',
        items: [
          { text: 'P1 管网拓扑可视化', link: '/pipeline/topology' },
          { text: 'P2 爆管推演', link: '/pipeline/burst' },
          { text: 'P3 健康评估', link: '/pipeline/health' },
          { text: 'P4 管网 NLPG 查询', link: '/pipeline/nlpg' },
        ],
      },
      {
        text: '电网 · Phase 2',
        items: [
          { text: '电网总览', link: '/grid/' },
          { text: 'G1 电网拓扑浏览器', link: '/grid/topology' },
          { text: 'G2 停电分析器', link: '/grid/outage' },
          { text: 'G3 负荷热力图', link: '/grid/load' },
        ],
      },
      {
        text: '水网 · Phase 2',
        items: [
          { text: '水网总览', link: '/water/' },
          { text: 'R1 水系拓扑图', link: '/water/river' },
          { text: 'F1 洪水淹没模拟', link: '/water/flood' },
          { text: 'DO1 水库联合调度', link: '/water/dam' },
        ],
      },
      {
        text: '交通网 · Phase 3',
        items: [
          { text: '交通网总览', link: '/transport/' },
          { text: 'T1 路网编辑器', link: '/transport/road' },
          { text: 'T2 交通流量可视化', link: '/transport/traffic' },
          { text: 'T3 事件响应图', link: '/transport/incident' },
        ],
      },
      {
        text: '算力网 · Phase 3',
        items: [
          { text: '算力网总览', link: '/compute/' },
          { text: 'C1 算力节点地图', link: '/compute/nodes' },
          { text: 'C2 延迟热力图', link: '/compute/latency' },
          { text: 'C3 算力供需预测', link: '/compute/predict' },
          { text: 'C4 自然语言查询', link: '/compute/nlp' },
        ],
      },
      {
        text: '通信网 · Phase 3',
        items: [
          { text: '通信网总览', link: '/telecom/' },
          { text: 'T1 基站覆盖地图', link: '/telecom/coverage' },
          { text: 'T2 网络健康度面板', link: '/telecom/health' },
        ],
      },
      {
        text: 'AI 工具链 · Phase 0+',
        items: [
          { text: 'AI 总览', link: '/ai/' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/caoguo-map/caoguo-map' },
    ],
    footer: {
      message: '草果地图 · 基于 MapLibre GL 构建 · MIT / Apache-2.0 开源',
      copyright: 'Copyright © 2026 草果地图 Caoguo Map',
    },
  },
});
