# 常见问题 · 坐标偏移

**Q：我的管线画出来整体偏了几百米，怎么回事？**

A：几乎都是坐标系不一致。草果地图以 WGS84 为渲染基准，而你的业务数据很可能是 GCJ-02（高德/腾讯）或 CGCS2000（测绘成果）。

解决：

- 构造 `Map` 时声明 `dataCRS`：
  ```ts
  new Map({ container: '#app', dataCRS: 'CGCS2000' })
  ```
- 或预处理：
  ```ts
  import { toWgs84 } from '@caoguo/maplibre'
  const [lng, lat] = toWgs84('GCJ02', rawLng, rawLat)
  ```

**Q：CGCS2000 和 WGS84 不是一样的吗？**

A：不一样。国内两者有米级差异，管网/国土类数据务必用 `CGCS2000`，否则叠加到底图会有偏移。详见《坐标系与偏移纠偏》。

**Q：我声明了 dataCRS，还需要手动转换坐标吗？**

A：不需要，也不要转换——引擎会在入图时自动纠偏，重复转换会纠偏两次。
