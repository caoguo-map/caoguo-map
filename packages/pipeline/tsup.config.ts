import { defineConfig } from 'tsup';

// 草果地图管网组件包构建配置
// 多入口：核心 / 样式 / 图算法 / 爆管推演 / 泄漏模拟 / 健康评估 / 拓扑 / NLPG / 类型
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'style/index': 'src/style/index.ts',
    'graph/index': 'src/graph/index.ts',
    'burst/index': 'src/burst/index.ts',
    'leakage/index': 'src/leakage/index.ts',
    'health/index': 'src/health/index.ts',
    'topology/index': 'src/topology/index.ts',
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
