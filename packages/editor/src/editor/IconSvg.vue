<script setup lang="ts">
import { computed } from 'vue';
import { ICON_PATHS, type IconName } from '../icons';

const props = withDefaults(
  defineProps<{
    name: IconName | string;
    size?: number;
  }>(),
  { size: 20 },
);

const paths = computed<string[]>(() => ICON_PATHS[props.name as IconName] ?? ICON_PATHS.box);
</script>

<template>
  <svg
    class="cg-icon-svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<style scoped>
.cg-icon-svg {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
