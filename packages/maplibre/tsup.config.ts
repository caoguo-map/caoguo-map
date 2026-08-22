import { defineConfig } from 'tsup';

// Phase 0 交付物 D1：@caoguo/maplibre 可发布 npm 包。
// - 多入口：核心封装 / 样式 / 数据源 / 离线
// - 对外保留 maplibre-gl、@caoguo/theme、idb（避免重复打包、保持版本解耦）
// - 产出 ESM + CJS + 类型声明 + sourcemap
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    styles: 'src/styles.ts',
    'sources/index': 'src/sources/index.ts',
    'offline/index': 'src/offline/index.ts',
    'controls/index': 'src/controls/index.ts',
    'crs/index': 'src/crs/index.ts',
    'lod/index': 'src/lod/index.ts',
    'shaders/index': 'src/shaders/index.ts',
    terrain: 'src/terrain.ts',
    sourceUtils: 'src/sourceUtils.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['maplibre-gl', '@caoguo/theme', 'idb'],
  // 入口中的 `import 'maplibre-gl/dist/maplibre-gl.css'` 会被提取为 dist/style.css
  esbuildOptions(options) {
    options.banner = {};
  },
});
