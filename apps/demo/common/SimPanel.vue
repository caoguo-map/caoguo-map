<script setup lang="ts">
defineProps<{ title: string; hint?: string }>();
</script>

<template>
  <div class="sim-panel cg-card">
    <div class="sp-head">
      <h3>{{ title }}</h3>
      <span v-if="hint" class="sp-hint">{{ hint }}</span>
    </div>
    <div class="sp-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sim-panel {
  padding: 18px 18px 20px;
}

.sp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.sp-head h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.sp-hint {
  font-size: 12px;
  color: var(--cg-text-muted);
}

.sp-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
