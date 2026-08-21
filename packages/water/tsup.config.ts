import { defineConfig } from 'tsup';

// 草果地图水网组件包构建配置
// 多入口：核心 / 样式 / 水系 / 淹没模拟 / 水库调度 / 类型
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'style/index': 'src/style/index.ts',
    'river/index': 'src/river/index.ts',
    'flood/index': 'src/flood/index.ts',
    'dam/index': 'src/dam/index.ts',
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
