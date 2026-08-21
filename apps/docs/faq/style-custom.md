# 常见问题 · 样式定制

**Q：如何切换暗色/亮色主题？**

A：内置 `caoguo-dark` / `caoguo-light` 两套官方主题：

```ts
import { Map, caoguoStyle } from '@caoguo/maplibre'

const map = new Map({ container: '#app', style: caoguoStyle('caoguo-dark') })
map.on('load', () => map.addThemeSwitcher()) // 右上角按钮切换
```

**Q：可以自定义底图源（如换成天地图）吗？**

A：可以。天地图为 CGCS2000 权威底图，需注入 `token`：

```ts
map.on('load', () => map.addTianditu({ type: 'vec', token: 'YOUR_TIANDITU_TOKEN' }))
```

`token` 缺失会抛 `MissingTokenError`，请妥善保管不要硬编码在前端源码。

**Q：样式能完全自定义吗？**

A：`buildStyle(theme, opts)` 支持自定义 `sourceUrl` / `glyphs` / `notoFonts`；也可用任意标准 MapLibre 样式对象作为 `style`。详见《主题与可视化增强》。
