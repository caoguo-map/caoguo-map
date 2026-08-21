# 常见问题 · 瓦片加载慢

**Q：底图瓦片加载很慢，怎么优化？**

A：分场景处理：

- **公网环境**：确认网络与 CDN；天地图底图需有效 `token`，缺失会失败（抛 `MissingTokenError`）。
- **内网/离线**：使用离线瓦片方案，运行时不发网：
  ```ts
  map.enableOffline()
  await map.packGeoJSON('pipe', geojson, { maxZoom: 14 })
  map.addSource('pipe-offline', { type: 'vector', tiles: map.offlineTiles('pipe') })
  ```
- **要素过多**：低 zoom 下用 LOD 降密度（见《性能调优与 LOD》），避免一次性渲染全量。

**Q：离线打包后还是去请求网络？**

A：检查 source 是否真正使用了 `caoguo-offline://` 协议（`map.offlineTiles(sourceId)` 生成的 URL）。若仍用 `https://` 在线瓦片，则会发网。
