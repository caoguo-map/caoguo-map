<script setup lang="ts">
import { ref } from 'vue';

const code = `import { Map } from '@caoguo/maplibre'

const map = new Map({ container: '#app', center: [114.3, 30.6] })
map.addSource('pipes', { type: 'geojson', data: pipes })
map.addLayer({ id: 'pipes', type: 'line', source: 'pipes' })
// 5 行，管网地图即可渲染`;

const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(code);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <section class="cg-section code">
    <div class="cg-container code-wrap">
      <div class="code-left">
        <span class="cg-eyebrow">上手成本</span>
        <h2 class="cg-h2">5 行代码，<span class="cg-gradient-text">地图就跑起来</span></h2>
        <p class="cg-lead">熟悉的 API 形态，无需学习私有协议。从 GIS 工程师到前端，半天即可交付第一张行业地图。</p>
        <ul class="code-points">
          <li>统一 TS 类型，编辑器智能提示</li>
          <li>GeoJSON / 矢量瓦片开箱支持</li>
          <li>与 MapLibre 生态插件兼容</li>
        </ul>
        <a class="cg-btn cg-btn-ghost" href="/docs/guide/quickstart.html">阅读快速开始</a>
      </div>

      <div class="code-right">
        <div class="code-head">
          <span class="dots"><i></i><i></i><i></i></span>
          <span class="fname">app.ts</span>
          <button class="copy" :class="{ ok: copied }" @click="copy">
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
        <pre class="code-block"><code>{{ code }}</code></pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.code {
  background: var(--cg-bg);
}

.code-wrap {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  align-items: center;
}

.code-points {
  list-style: none;
  padding: 0;
  margin: 22px 0 28px;
  display: grid;
  gap: 12px;
}

.code-points li {
  position: relative;
  padding-left: 26px;
  font-size: 15px;
  color: var(--cg-text-muted);
}

.code-points li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--cg-primary-3);
  font-weight: 700;
}

.code-right {
  border-radius: var(--cg-radius);
  border: 1px solid var(--cg-border);
  background: #07101f;
  overflow: hidden;
  box-shadow: var(--cg-shadow);
}

.code-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--cg-border);
  background: rgba(255, 255, 255, 0.02);
}

.dots {
  display: inline-flex;
  gap: 6px;
}

.dots i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--cg-border-strong);
}

.dots i:nth-child(1) { background: #ef4444; opacity: 0.7; }
.dots i:nth-child(2) { background: #f59e0b; opacity: 0.7; }
.dots i:nth-child(3) { background: #4ade80; opacity: 0.7; }

.fname {
  font-size: 13px;
  color: var(--cg-text-muted);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.copy {
  margin-left: auto;
  border: 1px solid var(--cg-border);
  background: transparent;
  color: var(--cg-text-muted);
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.copy:hover { color: var(--cg-text); border-color: var(--cg-border-strong); }
.copy.ok { color: var(--cg-green); border-color: var(--cg-green); }

.code-block {
  margin: 0;
  padding: 22px 20px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 14px;
  line-height: 1.75;
  color: #cbd5e1;
  overflow-x: auto;
}

@media (max-width: 900px) {
  .code-wrap {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>
