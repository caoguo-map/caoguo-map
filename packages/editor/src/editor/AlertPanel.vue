<template>
  <div v-if="alerts.length" class="cg-alerts" :class="{ collapsed }">
    <div class="cg-alerts-head" :class="{ flash }" @click="collapsed = !collapsed">
      <span class="cg-alerts-title">
        <span class="dot crit" v-if="critCount" :title="`${critCount} 告警`" />
        <span class="dot warn" v-if="warnCount" :title="`${warnCount} 预警`" />
        本地告警 · {{ alerts.length }}
      </span>
      <span class="cg-alerts-actions">
        <button class="cg-alerts-snd" :class="{ off: !soundEnabled }" :title="soundEnabled ? '关闭提示音' : '开启提示音'" @click.stop="toggleSound">{{ soundEnabled ? '♪' : '✕' }}</button>
        <span class="cg-alerts-toggle">{{ collapsed ? '展开' : '收起' }}</span>
      </span>
    </div>
    <ul v-show="!collapsed" class="cg-alerts-list">
      <li
        v-for="a in alerts"
        :key="a.key"
        class="cg-alert-item"
        :class="a.level"
        @click="locate(a)"
        :title="`${a.sceneName} · ${a.deviceName} · ${a.field}=${a.value}`"
      >
        <span class="cg-alert-level">{{ a.level === 'crit' ? '告警' : '预警' }}</span>
        <span class="cg-alert-main">
          <span class="cg-alert-dev">{{ a.deviceName }}</span>
          <span class="cg-alert-meta">{{ a.field }} = {{ a.value }} · {{ a.sceneName }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useAlerts } from '../store/useAlerts';

const { alerts, critCount, warnCount, locate, soundEnabled, toggleSound } = useAlerts();
const collapsed = ref(false);

// 新告警出现时头部闪烁一次（视觉推送反馈）
const flash = ref(false);
let flashTimer: ReturnType<typeof setTimeout> | null = null;
watch(alerts, (list, prev) => {
  const prevKeys = new Set((prev ?? []).map((a) => a.key));
  const hasNew = list.some((a) => !prevKeys.has(a.key) && a.level === 'crit');
  if (hasNew) {
    flash.value = true;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flash.value = false), 1200);
  }
});
onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer);
});
</script>

<style scoped>
.cg-alerts {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 50;
  width: 280px;
  max-height: 46vh;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  color: #e2e8f0;
  backdrop-filter: blur(6px);
  overflow: hidden;
}
.cg-alerts-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  transition: box-shadow 0.3s, background 0.3s;
}
.cg-alerts-head.flash {
  background: rgba(248, 113, 113, 0.18);
  box-shadow: 0 0 16px rgba(248, 113, 113, 0.55);
  animation: cgAlertFlash 1.2s ease-out;
}
@keyframes cgAlertFlash {
  0%, 100% { box-shadow: 0 0 0 rgba(248, 113, 113, 0); }
  30% { box-shadow: 0 0 20px rgba(248, 113, 113, 0.7); }
}
.cg-alerts-title { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.cg-alerts-actions { display: inline-flex; align-items: center; gap: 8px; }
.cg-alerts-snd {
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
  border-radius: 5px;
  width: 20px; height: 18px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
.cg-alerts-snd.off { opacity: 0.5; color: #94a3b8; }
.cg-alerts-toggle { opacity: 0.6; font-size: 11px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.crit { background: #f87171; box-shadow: 0 0 8px #f87171; }
.dot.warn { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; }
.cg-alerts-list { list-style: none; margin: 0; padding: 4px; overflow-y: auto; }
.cg-alert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.cg-alert-item:hover { background: rgba(148, 163, 184, 0.15); }
.cg-alert-level {
  flex: none;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.cg-alert-item.crit .cg-alert-level { color: #f87171; background: rgba(248, 113, 113, 0.18); }
.cg-alert-item.warn .cg-alert-level { color: #fbbf24; background: rgba(251, 191, 36, 0.18); }
.cg-alert-main { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
.cg-alert-dev { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cg-alert-meta { opacity: 0.65; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
