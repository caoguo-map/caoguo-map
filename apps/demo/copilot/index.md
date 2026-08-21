---
title: D4 Copilot 交互
---

<script setup lang="ts">
import { ref } from 'vue';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';
import MapDemo from '../common/MapDemo.vue';
import { wuhanPipes } from '../data/wuhan-pipes';

type Msg = { role: 'user' | 'bot'; text: string };
const thread = ref<Msg[]>([
  { role: 'user', text: '显示武汉管网爆管影响范围' },
  { role: 'bot', text: '已加载主干 / 支管图层，并执行爆管影响范围模拟（演示）。' },
]);
const input = ref('');
const highlight = ref<string[]>([]);
const flyTo = ref<[number, number] | null>([114.3055, 30.5928]);

function reply(text: string): string {
  if (text.includes('爆管')) {
    highlight.value = wuhanPipes.features.map((f) => f.properties.name as string);
    flyTo.value = [114.3055, 30.5928];
    return '已在地图高亮全部管线，并执行爆管影响范围模拟：受影响半径约 300m，建议优先排查主干管。';
  }
  if (text.includes('主干管 A')) {
    highlight.value = ['主干管 A'];
    flyTo.value = [114.34, 30.615];
    return '已为「主干管 A」切换红色高亮样式，并飞行定位到其末端。';
  }
  if (text.includes('健康度') || text.includes('摘要')) {
    return '4 条管线，平均压力 0.33 MPa，最大管径 800，健康度评分 92 / 100。整体运行状态良好。';
  }
  return '收到。这是演示环境，我可以根据指令高亮管线、飞行定位并生成摘要，试试「把主干管 A 高亮成红色」。';
}

function send() {
  const t = input.value.trim();
  if (!t) return;
  thread.value.push({ role: 'user', text: t });
  thread.value.push({ role: 'bot', text: reply(t) });
  input.value = '';
}
</script>

<DemoLayout title="D4 · MapCopilot 交互" subtitle="用自然语言指挥地图（演示：预置指令 + 实时地图反馈）。">
  <template #map>
    <MapDemo :data="wuhanPipes" :zoom="11.4" color-by="diameter" :highlight="highlight" :fly-to="flyTo" :height="'100%'" />
  </template>
  <template #panel>
    <SimPanel title="Copilot" hint="可交互演示">
      <div class="chat">
        <div v-for="(m, i) in thread" :key="i" class="bubble" :class="m.role">
          <span class="who">{{ m.role === 'user' ? '你' : 'Copilot' }}</span>
          <p>{{ m.text }}</p>
        </div>
      </div>
      <div class="chat-input">
        <input v-model="input" placeholder="问问地图试试…（演示）" @keyup.enter="send" />
        <button @click="send">发送</button>
      </div>
      <p class="hint">试试：「显示爆管影响范围」「把主干管 A 高亮成红色」「生成健康度摘要」</p>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.chat { display: flex; flex-direction: column; gap: 12px; max-height: 320px; overflow:auto; }
.bubble { max-width: 90%; padding: 10px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.6; }
.bubble .who { display: block; font-size: 11px; color: var(--cg-text-muted); margin-bottom: 4px; }
.bubble p { margin: 0; }
.bubble.user { align-self: flex-end; background: var(--cg-gradient-soft); border: 1px solid var(--cg-border); }
.bubble.bot { align-self: flex-start; background: var(--cg-bg-card); border: 1px solid var(--cg-border); }
.chat-input { display: flex; gap: 8px; margin-top: 8px; }
.chat-input input {
  flex: 1; padding: 9px 12px; border-radius: 10px;
  border: 1px solid var(--cg-border); background: var(--cg-bg); color: var(--cg-text); font-size: 13px;
}
.chat-input button {
  padding: 9px 14px; border-radius: 10px; border: 0;
  background: var(--cg-gradient); color: #04141a; font-weight: 600; cursor: pointer;
}
.hint { font-size: 12px; color: var(--cg-text-muted); margin: 10px 0 0; line-height: 1.6; }
</style>
