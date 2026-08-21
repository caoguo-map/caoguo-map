# 常见问题 · 浏览器兼容性

**Q：草果地图支持哪些浏览器？**

A：基于 MapLibre GL v4，支持现代 Chromium 内核（Chrome/Edge 新版）、Firefox、Safari 16+。需要 WebGL2。

**Q：老旧 IE / 国产内核浏览器（如旧版 360、红莲花）能跑吗？**

A：不支持 WebGL2 的环境无法渲染。建议在 G 端终端统一升级到 Chromium 内核浏览器；或采用服务端预渲染截图 + 静态展示的降级方案。

**Q：Vue / React 项目怎么集成？**

A：草果地图是框架无关的 JS 封装，通过 `npm i @caoguo/maplibre` 安装，在 `onMounted` / `useEffect` 中 `new Map({ container })` 即可。容器需有明确高度。详见《安装》与《第一张地图》。
