import { defineConfig } from 'tsup';

// Phase 0 交付物 D2：@caoguo/theme 可发布 npm 包（JS API + 静态 tokens.css）。
// tokens.css 为静态样式资产，不参与 TS 编译，由 package.json 的 files 直接随包发布。
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['maplibre-gl'],
});
