import { defineConfig } from 'tsup';

// 草果地图电网组件包构建配置
// 多入口：核心 / 样式 / 拓扑 / 停电分析 / 负荷热力 / 类型
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'style/index': 'src/style/index.ts',
    'topology/index': 'src/topology/index.ts',
    'outage/index': 'src/outage/index.ts',
    'load/index': 'src/load/index.ts',
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
