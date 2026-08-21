import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { injectTheme } from '@caoguo/theme';
import '@caoguo/theme/tokens.css';
import './landing.css';

// 滚动入场：为各区块内容加 .cg-reveal，进入视口时加 .cg-reveal-in
function setupReveal() {
  if (typeof window === 'undefined') return;
  const els = Array.from(
    document.querySelectorAll<HTMLElement>('.cg-section > .cg-container'),
  );
  if (!els.length || !('IntersectionObserver' in window)) return; // 不支持则保持可见
  els.forEach((el) => el.classList.add('cg-reveal'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('cg-reveal-in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  els.forEach((el) => io.observe(el));
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupReveal);
  } else {
    setupReveal();
  }
}

export default {
  extends: DefaultTheme,
  enhanceApp() {
    injectTheme('caoguo-dark');
  },
} satisfies Theme;
