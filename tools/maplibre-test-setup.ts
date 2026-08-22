/**
 * 共享 vitest setup：为 jsdom 环境补齐 maplibre-gl 在加载期所需的浏览器 API。
 *
 * maplibre-gl 在模块顶层执行 `window.URL.createObjectURL(new Blob(...))` 来注册
 * Web Worker URL。jsdom 默认不实现 createObjectURL，会导致任何「值导入
 * @caoguo/maplibre」的测试在模块收集阶段即抛错。这里在测试环境统一补齐，
 * 使依赖 maplibre 运行时的 System/组件测试能正常加载。
 */
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    // @ts-expect-error 补齐 jsdom 缺失的 API
    window.URL.createObjectURL = () => 'blob:mock-worker-url';
  }
  if (!window.URL.revokeObjectURL) {
    // @ts-expect-error 补齐 jsdom 缺失的 API
    window.URL.revokeObjectURL = () => {};
  }
}
