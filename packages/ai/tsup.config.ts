import { defineConfig } from 'tsup';

// 草果地图 AI 工具链构建配置
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'debug/index': 'src/debug/index.ts',
    'stylegen/index': 'src/stylegen/index.ts',
    'copilot/index': 'src/copilot/index.ts',
    'geoai/index': 'src/geoai/index.ts',
    'nlpg/index': 'src/nlpg/index.ts',
    'llm/index': 'src/llm/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: [
    'maplibre-gl',
    '@caoguo/theme',
  ],
});
