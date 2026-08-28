<script setup lang="ts">
import { computed } from 'vue';
import type { EditorNode } from '../../types';
import { useHistory } from '../../store/useHistory';

const props = defineProps<{ node: EditorNode }>();
const { commit } = useHistory();

const pos = computed(() => props.node.position);

function patchPos(part: Partial<typeof pos.value>) {
  commit();
  Object.assign(pos.value, part);
}

const style = computed(() => props.node.style ?? {});
function patchStyle(key: string, val: string) {
  commit();
  if (!props.node.style) props.node.style = {};
  props.node.style[key] = val;
}
</script>

<template>
  <div class="cg-field-group">
    <div class="cg-group-title">位置与大小</div>
    <div class="cg-row">
      <label class="cg-field"><span>X</span><input type="number" :value="pos.x" @change="patchPos({ x: Number(($event.target as HTMLInputElement).value) })" /></label>
      <label class="cg-field"><span>Y</span><input type="number" :value="pos.y" @change="patchPos({ y: Number(($event.target as HTMLInputElement).value) })" /></label>
    </div>
    <div class="cg-row">
      <label class="cg-field"><span>W</span><input type="number" :value="pos.w" @change="patchPos({ w: Number(($event.target as HTMLInputElement).value) })" /></label>
      <label class="cg-field"><span>H</span><input type="number" :value="pos.h" @change="patchPos({ h: Number(($event.target as HTMLInputElement).value) })" /></label>
    </div>
  </div>

  <div class="cg-field-group">
    <div class="cg-group-title">样式</div>
    <label class="cg-field"><span>背景色</span><input :value="style.background ?? ''" placeholder="rgba(10,14,26,0.88)" @change="patchStyle('background', ($event.target as HTMLInputElement).value)" /></label>
    <label class="cg-field"><span>圆角 (px)</span><input type="number" :value="style.borderRadius ?? ''" placeholder="10" @change="patchStyle('borderRadius', ($event.target as HTMLInputElement).value + 'px')" /></label>
    <label class="cg-field"><span>边框</span><input :value="style.border ?? ''" placeholder="1px solid #333" @change="patchStyle('border', ($event.target as HTMLInputElement).value)" /></label>
    <label class="cg-field"><span>内边距 (px)</span><input :value="style.padding ?? ''" placeholder="12" @change="patchStyle('padding', ($event.target as HTMLInputElement).value + 'px')" /></label>
    <label class="cg-field"><span>文字色</span><input :value="style.color ?? ''" placeholder="#e0e6f0" @change="patchStyle('color', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.cg-field-group { border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 10px; margin-top: 10px; }
.cg-group-title { font-size: 12px; color: #8b93a7; margin-bottom: 8px; font-weight: 600; }
.cg-row { display: flex; gap: 8px; }
.cg-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; font-size: 12px; color: #b8c0d4; flex: 1; }
.cg-field input, .cg-field select {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e6f0; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none;
}
</style>
