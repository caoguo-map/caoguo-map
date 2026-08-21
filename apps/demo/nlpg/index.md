---
title: D3 NLPG 查询
---

<script setup lang="ts">
import { ref, computed } from 'vue';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';
import MapDemo from '../common/MapDemo.vue';
import { wuhanPipes } from '../data/wuhan-pipes';

const query = ref('光谷附近 500 米内的管线');
const examples = [
  '光谷附近 500 米内的管线',
  '江汉路片区主干管',
  '直径大于 600 的管线',
];

const POIS = {
  光谷: [114.4, 30.49],
  江汉路: [114.27, 30.58],
} as Record<string, [number, number]>;

const pipes = wuhanPipes.features.map((f) => ({
  name: f.properties.name as string,
  diameter: f.properties.diameter as number,
}));

const highlight = ref<string[]>([]);
const flyTo = ref<[number, number] | null>(null);
const steps = ref<string[]>([]);

function run(q: string) {
  const text = q.trim();
  const names: string[] = [];
  let fly: [number, number] | null = null;
  const log: string[] = [`解析：「${text}」`];

  // 1) 地理实体 → 中心点
  for (const [poi, coord] of Object.entries(POIS)) {
    if (text.includes(poi)) {
      fly = coord;
      log.push(`→ 地理实体解析：${poi} → 中心点`);
      break;
    }
  }
  if (!fly) log.push('→ 地理实体解析：未识别 POI，使用全图');

  // 2) 类型过滤
  if (text.includes('主干')) {
    names.push(...pipes.filter((p) => p.name.includes('主干')).map((p) => p.name));
    log.push('→ 要素过滤：主干管');
  } else if (text.includes('支管')) {
    names.push(...pipes.filter((p) => p.name.includes('支管')).map((p) => p.name));
    log.push('→ 要素过滤：支管');
  }

  // 3) 管径过滤
  const m = text.match(/直径\s*(大于|大于等?于|>|≥)\s*(\d+)/);
  if (m) {
    const n = Number(m[2]);
    const matched = pipes.filter((p) => p.diameter > n).map((p) => p.name);
    names.push(...matched);
    log.push(`→ 管径约束：diameter > ${n} → 命中 ${matched.length} 条`);
  }

  // 默认全量
  if (names.length === 0) {
    names.push(...pipes.map((p) => p.name));
    log.push('→ 未识别过滤条件，返回全部管线');
  }

  const uniq = [...new Set(names)];
  log.push(`→ 命中 ${uniq.length} 条管线，已在地图高亮`);
  highlight.value = uniq;
  flyTo.value = fly;
  steps.value = log;
}

run(query.value);
</script>

<DemoLayout title="D3 · NLPG 自然语言查询" subtitle="用一句话把地理意图转为空间查询（演示：前端模拟解析 + 实时高亮）。">
  <template #map>
    <MapDemo :data="wuhanPipes" :zoom="11.4" color-by="diameter" :highlight="highlight" :fly-to="flyTo" :height="'100%'" ></MapDemo>
  </template>
  <template #panel>
    <SimPanel title="自然语言查询" hint="前端模拟">
      <input v-model="query" class="nlpg-input" placeholder="例如：光谷附近 500 米内的管线" @keyup.enter="run(query)" />
      <div class="nlpg-examples">
        <button v-for="e in examples" :key="e" @click="query = e; run(e)">{{ e }}</button>
      </div>
      <button class="cg-btn cg-btn-primary nlpg-run" @click="run(query)">执行查询</button>
      <pre v-if="steps.length" class="nlpg-result">{{ steps.join('\n') }}</pre>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.nlpg-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cg-border);
  background: var(--cg-bg);
  color: var(--cg-text);
  font-size: 14px;
}
.nlpg-examples { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.nlpg-examples button {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--cg-border);
  background: var(--cg-bg-card);
  color: var(--cg-text-muted);
  cursor: pointer;
}
.nlpg-examples button:hover { color: var(--cg-text); border-color: var(--cg-border-strong); }
.nlpg-run { width: 100%; margin-top: 10px; }
.nlpg-result {
  margin: 12px 0 0;
  padding: 12px;
  border-radius: 10px;
  background: #07101f;
  border: 1px solid var(--cg-border);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12.5px;
  line-height: 1.7;
  color: #cbd5e1;
  white-space: pre-wrap;
}
</style>
