import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { injectTheme } from '@caoguo/theme';
import '@caoguo/theme/tokens.css';
import DemoLayout from '../../common/DemoLayout.vue';
import SimPanel from '../../common/SimPanel.vue';
import CodeViewer from '../../common/CodeViewer.vue';
import MapDemo from '../../common/MapDemo.vue';

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
