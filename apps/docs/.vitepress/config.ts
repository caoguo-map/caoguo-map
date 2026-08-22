import { defineConfig } from 'vitepress';

const TITLE = '草果地图文档';
const DESCRIPTION = '草果地图 —— 面向六张网的开源可私有化地图引擎 开发文档。';

export default defineConfig({
  base: '/docs/',
  title: TITLE,
  description: DESCRIPTION,
  lang: 'zh-CN',
  cleanUrls: true,
  appearance: 'force-dark',
  ignoreDeadLinks: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'description', content: DESCRIPTION }],
  ],
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/quickstart' },
      { text: 'API', link: '/api/map' },
      { text: '部署', link: '/deployment/docker' },
      { text: '演示中心', link: 'https://map.hb.cn/demo/' },
      { text: 'GitHub', link: 'https://github.com/caoguo-map/caoguo-map' },
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/quickstart' },
          { text: '安装', link: '/guide/installation' },
          { text: '第一张地图', link: '/guide/first-map' },
          { text: '主题与可视化增强', link: '/guide/themes' },
          {
            text: '核心概念',
            collapsed: true,
            items: [
              { text: '坐标系与偏移纠偏', link: '/guide/concepts/coordinates' },
            ],
          },
          {
            text: '实用教程',
            collapsed: true,
            items: [
              { text: '数据导入与离线打包', link: '/guide/guides/data-import' },
              { text: '性能调优与 LOD', link: '/guide/guides/performance' },
            ],
          },
        ],
      },
      {
        text: 'API 参考',
        items: [
          { text: 'Map', link: '/api/map' },
          { text: '图层 Layer', link: '/api/layer' },
          { text: '数据源 Source', link: '/api/source' },
          { text: '离线能力', link: '/api/offline' },
          {
            text: '控件与相机',
            collapsed: true,
            items: [
              { text: '比例尺 ScaleControl', link: '/api/control/scale' },
              { text: '相机 Camera', link: '/api/camera' },
            ],
          },
          { text: '事件 Event', link: '/api/event' },
        ],
      },
      {
        text: '示例',
        items: [
          { text: '基础地图', link: '/examples/basic-map' },
          { text: 'GeoJSON 图层', link: '/examples/geojson-layer' },
          { text: '热力图', link: '/examples/heatmap' },
          { text: '矢量瓦片', link: '/examples/vector-tiles' },
          { text: '信息弹窗', link: '/examples/popup-info' },
          { text: '管线辉光', link: '/examples/glow-pipeline' },
        ],
      },
      {
        text: '常见问题',
        items: [
          { text: '坐标偏移', link: '/faq/coordinates' },
          { text: '瓦片加载慢', link: '/faq/tiles-slow' },
          { text: '样式定制', link: '/faq/style-custom' },
          { text: '离线 / 内网', link: '/faq/offline' },
          { text: '浏览器兼容性', link: '/faq/compatibility' },
        ],
      },
      {
        text: '部署',
        items: [
          { text: 'Docker 部署', link: '/deployment/docker' },
          { text: '离线 / 空气隔离', link: '/deployment/air-gap' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/caoguo-map/caoguo-map' },
    ],
    search: { provider: 'local' },
    footer: {
      message: '基于 MapLibre GL 构建 · MIT / Apache-2.0 开源',
      copyright: 'Copyright © 2026 草果地图',
    },
  },
});
