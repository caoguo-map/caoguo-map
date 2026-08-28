import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

// @caoguo/map-editor 构建配置（vite 库模式）
// - 解析 .vue SFC（@vitejs/plugin-vue 内置 postcss 处理 scoped style）
// - 单入口，外置 vue / @caoguo/theme
// - 产出 ESM + CJS + style.css
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CaoguoMapEditor',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', '@caoguo/theme'],
      output: {
        globals: { vue: 'Vue', '@caoguo/theme': 'CaoguoTheme' },
        assetFileNames: 'style.css',
      },
    },
    emptyOutDir: true,
  },
});
