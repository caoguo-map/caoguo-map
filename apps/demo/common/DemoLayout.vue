<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string }>();
</script>

<template>
  <div class="demo-layout">
    <header v-if="title" class="demo-head">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>
    <div class="demo-body">
      <section class="demo-map">
        <slot name="map" />
      </section>
      <aside class="demo-side">
        <slot name="panel" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.demo-layout {
  margin-top: 8px;
}

.demo-head {
  margin-bottom: 20px;
}

.demo-head h1 {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 6px;
}

.demo-head p {
  font-size: 14px;
  color: var(--cg-text-muted);
  margin: 0;
}

.demo-body {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
  align-items: start;
}

.demo-map {
  border-radius: var(--cg-radius);
  overflow: hidden;
  border: 1px solid var(--cg-border);
  min-height: 480px;
  background: var(--cg-bg);
}

.demo-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 960px) {
  .demo-body {
    grid-template-columns: 1fr;
  }
  .demo-map {
    min-height: 360px;
  }
}
</style>
