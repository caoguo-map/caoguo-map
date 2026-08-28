import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 渲染运行时（W4）落地前尚无测试文件，先允许空跑通过
    passWithNoTests: true,
  },
});
