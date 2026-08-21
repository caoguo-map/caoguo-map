---
title: D4 Copilot 交互
---

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DemoLayout from '../common/DemoLayout.vue';
import SimPanel from '../common/SimPanel.vue';
import MapDemo from '../common/MapDemo.vue';
import { wuhanPipes } from '../data/wuhan-pipes';
import { callDeepseek, checkHealth } from '../common/api';

type Msg = { role: 'user' | 'bot'; text: string; loading?: boolean };
const thread = ref<Msg[]>([
  { role: 'user', text: '显示武汉管网爆管影响范围' },
  { role: 'bot', text: '已加载主干 / 支管图层（演示）。现在由 DeepSeek 驱动的 Copilot 可以回答六张网相关问题。' },
]);
const input = ref('');
const highlight = ref<string[]>([]);
const flyTo = ref<[number, number] | null>([114.3055, 30.5928]);
const disabled = ref(false);
const health = ref<{ postgis: boolean; deepseek: boolean } | null>(null);

const presets = [
  '用一句话介绍武汉光谷',
  '管网数字孪生能解决哪些问题',
  '给管网运维人员一句巡检建议',
  '解释一下六张网之间的关系',
];

function runPreset(t: string) {
  pushUser(t);
}

function pushUser(t: string) {
  thread.value.push({ role: 'user', text: t });
  const bot: Msg = { role: 'bot', text: '', loading: true };
  thread.value.push(bot);
  disabled.value = true;
  callDeepseek([
    {
      role: 'system',
      content:
        '你是草果地图（Caoguo Map）的 Copilot，一个面向城市基础设施「六张网」（管网/电网/水网/交通/算力/通信）的数字孪生地图助手。' +
        '回答要专业、简洁、面向工程与运维场景，可适当结合地图交互建议。',
    },
    { role: 'user', content: t },
  ])
    .then((res) => {
      bot.loading = false;
      bot.text = res.ok ? res.content || '（空响应）' : '调用失败：' + (res.message || '未知错误');
    })
    .catch((e) => {
      bot.loading = false;
      bot.text = '调用失败：' + (e instanceof Error ? e.message : String(e));
    })
    .finally(() => {
      disabled.value = false;
    });
}

function send() {
  const t = input.value.trim();
  if (!t || disabled.value) return;
  pushUser(t);
  input.value = '';
}

onMounted(async () => {
  health.value = await checkHealth();
});
</script>

<DemoLayout title="D4 · MapCopilot 交互" subtitle="由 DeepSeek 驱动的自然语言地图助手（结合六张网数字孪生）。">
  <template #map>
    <MapDemo :data="wuhanPipes" :zoom="11.4" color-by="diameter" :highlight="highlight" :fly-to="flyTo" :height="'100%'"></MapDemo>
  </template>
  <template #panel>
    <SimPanel title="Copilot" :hint="health && health.deepseek ? '已连接 DeepSeek' : '代理不可用'">
      <div class="chat">
        <div v-for="(m, i) in thread" :key="i" class="bubble" :class="m.role">
          <span class="who">{{ m.role === 'user' ? '你' : 'Copilot' }}</span>
          <p><span v-if="m.loading" class="typing">思考中…</span>{{ m.text }}</p>
        </div>
      </div>
      <div class="presets">
        <button v-for="p in presets" :key="p" :disabled="disabled" @click="runPreset(p)">{{ p }}</button>
      </div>
      <div class="chat-input">
        <input v-model="input" :disabled="disabled" placeholder="问问地图试试…" @keyup.enter="send" />
        <button :disabled="disabled" @click="send">发送</button>
      </div>
      <p class="hint">说明：本页通过本地 AI 代理调用 DeepSeek。预置指令仍走本地模拟（爆管/健康度等地图联动）。</p>
    </SimPanel>
  </template>
</DemoLayout>

<style scoped>
.chat { display: flex; flex-direction: column; gap: 12px; max-height: 320px; overflow: auto; }
.bubble { max-width: 90%; padding: 10px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.6; }
.bubble .who { display: block; font-size: 11px; color: var(--cg-text-muted); margin-bottom: 4px; }
.bubble p { margin: 0; }
.bubble.user { align-self: flex-end; background: var(--cg-gradient-soft); border: 1px solid var(--cg-border); }
.bubble.bot { align-self: flex-start; background: var(--cg-bg-card); border: 1px solid var(--cg-border); }
.typing { color: var(--cg-text-muted); font-style: italic; }
.presets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.presets button { font-size: 12px; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--cg-border); background: var(--cg-bg-card); color: var(--cg-text-muted); cursor: pointer; }
.presets button:hover { color: var(--cg-text); border-color: var(--cg-primary); }
.presets button:disabled { opacity: 0.5; cursor: not-allowed; }
.chat-input { display: flex; gap: 8px; margin-top: 8px; }
.chat-input input {
  flex: 1; padding: 9px 12px; border-radius: 10px;
  border: 1px solid var(--cg-border); background: var(--cg-bg); color: var(--cg-text); font-size: 13px;
}
.chat-input input:disabled { opacity: 0.6; }
.chat-input button {
  padding: 9px 14px; border-radius: 10px; border: 0;
  background: var(--cg-gradient); color: #04141a; font-weight: 600; cursor: pointer;
}
.chat-input button:disabled { opacity: 0.6; cursor: not-allowed; }
.hint { font-size: 12px; color: var(--cg-text-muted); margin: 10px 0 0; line-height: 1.6; }
</style>
