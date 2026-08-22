<script setup lang="ts">
import { INDUSTRY_META, INDUSTRY_PALETTES } from '@caoguo/theme';
import type { IndustryKey } from '@caoguo/theme';

const keys = Object.keys(INDUSTRY_META) as IndustryKey[];
</script>

<template>
  <div class="industry-palette">
    <section v-for="k in keys" :key="k" class="ind-card">
      <header class="ind-head">
        <span class="ind-dot" :style="{ background: INDUSTRY_META[k].primary }"></span>
        <h3>
          {{ INDUSTRY_META[k].label }}
          <code>{{ INDUSTRY_META[k].themeId }}</code>
        </h3>
      </header>

      <div class="ind-row">
        <span class="ind-label">语义色</span>
        <span
          v-for="(c, name) in INDUSTRY_PALETTES[k].palette"
          :key="name"
          class="swatch"
          :style="{ background: c }"
          :title="`${name} ${c}`"
          >{{ name }}</span
        >
      </div>

      <div class="ind-row">
        <span class="ind-label">分级</span>
        <span class="ramp">
          <span
            v-for="(c, i) in INDUSTRY_PALETTES[k].ramp"
            :key="i"
            class="ramp-cell"
            :style="{ background: c }"
            :title="c"
          ></span>
        </span>
      </div>

      <div class="ind-row">
        <span class="ind-label">状态</span>
        <span
          v-for="(c, name) in INDUSTRY_PALETTES[k].status"
          :key="name"
          class="swatch swatch-sm"
          :style="{ background: c }"
          :title="`${name} ${c}`"
          >{{ name }}</span
        >
      </div>
    </section>
  </div>
</template>

<style scoped>
.industry-palette {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin: 16px 0;
}
.ind-card {
  border: 1px solid var(--cg-border, #1e293b);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--cg-surface, #0b1220);
}
.ind-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.ind-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}
.ind-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.ind-head code {
  font-size: 11px;
  opacity: 0.6;
  margin-left: 4px;
}
.ind-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0;
  flex-wrap: wrap;
}
.ind-label {
  flex: 0 0 40px;
  font-size: 12px;
  color: var(--cg-text-muted, #94a3b8);
  padding-top: 2px;
}
.swatch {
  font-size: 11px;
  color: #04141a;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  min-width: 36px;
  text-align: center;
}
.swatch-sm {
  font-size: 10px;
  padding: 2px 6px;
  min-width: 0;
}
.ramp {
  display: inline-flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--cg-border, #1e293b);
}
.ramp-cell {
  width: 28px;
  height: 20px;
}
</style>
