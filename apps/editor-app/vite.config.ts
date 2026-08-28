import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

// 编辑器独立运行应用（全屏，不依赖 VitePress 文档主题）
// 直接引用 @caoguo/map-editor 源码（含 .vue），Vite 原生解析，免去先 build 编辑器包。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@caoguo/map-editor': resolve(__dirname, '../../packages/editor/src/index.ts'),
      '@caoguo/maplibre': resolve(__dirname, '../../packages/maplibre/src/index.ts'),
    },
  },
  optimizeDeps: {
    // @caoguo/* 均通过 alias 直接指向源码（含 .vue），无需预构建；
    // 预构建会缓存导出列表，导致新增导出（如 ScreenViewer）报 "does not provide an export"。
    // 仅对第三方 npm 包 maplibre-gl 做预构建。
    include: ['maplibre-gl'],
    exclude: ['@caoguo/map-editor', '@caoguo/maplibre', '@caoguo/theme'],
  },
  server: {
    port: 5190,
    proxy: {
      '/api': {
        target: process.env.CAOGUO_AI_PROXY || 'http://127.0.0.1:8787',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
