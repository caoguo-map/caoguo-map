import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { injectTheme } from '@caoguo/theme';
import { setGlobalConfig } from '@caoguo/maplibre';
import '@caoguo/theme/tokens.css';
import './style.css';
import DemoLayout from '../../common/DemoLayout.vue';
import SimPanel from '../../common/SimPanel.vue';
import CodeViewer from '../../common/CodeViewer.vue';
import MapDemo from '../../common/MapDemo.vue';

// 天地图浏览器端 token（由 Vite 注入，不硬编码到库或页面）。
// 未配置时所有地图回退 OpenStreetMap。
const TIANDITU_TOKEN = (import.meta as { env?: Record<string, string> }).env?.VITE_TIANDITU_TOKEN;
if (TIANDITU_TOKEN) {
  setGlobalConfig({ tiandituToken: TIANDITU_TOKEN });
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    injectTheme('caoguo-dark');
    app.component('DemoLayout', DemoLayout);
    app.component('SimPanel', SimPanel);
    app.component('CodeViewer', CodeViewer);
    app.component('MapDemo', MapDemo);
  },
} satisfies Theme;
