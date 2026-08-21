import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { injectTheme } from '@caoguo/theme';
import '@caoguo/theme/tokens.css';
import MapDemo from '../../components/MapDemo.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    injectTheme('caoguo-dark');
    app.component('MapDemo', MapDemo);
  },
} satisfies Theme;
