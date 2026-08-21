# 示例 · 基础地图

最小可运行的草果地图。

```html
<div id="app" style="width: 100%; height: 480px;"></div>
```

```ts
import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app', zoom: 11 })
map.on('load', () => {
  console.log('地图已就绪')
})
```

- 默认中心为武汉 `[114.3055, 30.5928]`，默认样式为暗色演示样式。
- 容器需有明确高度，否则地图不可见。

:::: tip 下一步
- 切换底图：见《主题与可视化增强》的 `addThemeSwitcher`
- 叠加业务数据：见《数据导入与离线打包》
::::
