<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ code: string; lang?: string }>();
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <div class="code-viewer cg-card">
    <div class="cv-head">
      <span class="cv-lang">{{ lang || 'ts' }}</span>
      <button class="cv-copy" :class="{ ok: copied }" @click="copy">
        {{ copied ? '已复制' : '查看源码 / 复制' }}
      </button>
    </div>
    <pre class="cv-block"><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.code-viewer {
  padding: 0;
  overflow: hidden;
}

.cv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--cg-border);
  background: rgba(255, 255, 255, 0.02);
}

.cv-lang {
  font-size: 12px;
  color: var(--cg-text-muted);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.cv-copy {
  border: 1px solid var(--cg-border);
  background: transparent;
  color: var(--cg-text-muted);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.cv-copy:hover { color: var(--cg-text); border-color: var(--cg-border-strong); }
.cv-copy.ok { color: var(--cg-green); border-color: var(--cg-green); }

.cv-block {
  margin: 0;
  padding: 16px 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #cbd5e1;
  overflow-x: auto;
  max-height: 320px;
}
</style>
