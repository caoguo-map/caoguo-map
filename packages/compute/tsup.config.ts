import { defineConfig } from 'tsup';

// 草果地图算力网组件包构建配置
// 多入口：核心 / 样式 / 节点 / 延迟 / 供需预测 / NLPG / 类型
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'style/index': 'src/style/index.ts',
    'nodes/index': 'src/nodes/index.ts',
    'latency/index': 'src/latency/index.ts',
    'predict/index': 'src/predict/index.ts',
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
