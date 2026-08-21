import { defineConfig } from 'tsup';

// 草果地图交通网组件包构建配置
// 多入口：核心 / 样式 / 路网 / 交通流 / 事件 / NLPG / 类型
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'style/index': 'src/style/index.ts',
    'road/index': 'src/road/index.ts',
    'traffic/index': 'src/traffic/index.ts',
    'incident/index': 'src/incident/index.ts',
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
