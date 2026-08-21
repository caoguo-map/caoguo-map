import { defineConfig } from 'tsup';

// 草果地图通信网组件包构建配置
// 多入口：核心 / 样式 / 覆盖 / 健康度 / NLPG / 类型
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'style/index': 'src/style/index.ts',
    'coverage/index': 'src/coverage/index.ts',
    'health/index': 'src/health/index.ts',
    'nlpg/index': 'src/nlpg/index.ts',
    'types/index': 'src/types/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: [
    'maplibre-gl',
    '@caoguo/maplibre',
    '@caoguo/theme',
    'vue',
  ],
});
