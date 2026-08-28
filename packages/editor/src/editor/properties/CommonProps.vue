<script setup lang="ts">
import { computed } from 'vue';
import type { EditorNode } from '../../types';
import { useHistory } from '../../store/useHistory';
import { useEditor } from '../../store/useEditor';

const props = defineProps<{ node: EditorNode }>();
const { commit } = useHistory();
const { activeScene } = useEditor();

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

// 父容器：嵌套在 tab-container 里的子组件显示「归属 Tab」选择
const parentTabs = computed<{ label: string }[] | null>(() => {
  if (!activeScene.value) return null;
  const walk = (nodes: EditorNode[]): { label: string }[] | null => {
    for (const n of nodes) {
      if ((n.children ?? []).some((c) => c.id === props.node.id)) {
        if (n.type !== 'tab-container') return null;
        const tabs = (n.config?.tabs as { label: string }[] | undefined) ?? [];
        return Array.isArray(tabs) ? tabs : [];
      }
      const hit = walk(n.children ?? []);
      if (hit) return hit;
    }
    return null;
  };
  return walk(activeScene.value.components);
});

function patchTab(index: number) {
  commit();
  props.node.tab = index;
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
    <label class="cg-field"><span>内边距 (px)</span><input type="number" :value="style.padding ?? ''" placeholder="12" @change="patchStyle('padding', ($event.target as HTMLInputElement).value + 'px')" /></label>
    <label class="cg-field"><span>文字色</span><input :value="style.color ?? ''" placeholder="#e0e6f0" @change="patchStyle('color', ($event.target as HTMLInputElement).value)" /></label>
  </div>

  <div v-if="parentTabs" class="cg-field-group">
    <div class="cg-group-title">标签页归属</div>
    <label class="cg-field">
      <span>归属 Tab</span>
      <select :value="props.node.tab ?? 0" @change="patchTab(Number(($event.target as HTMLSelectElement).value))">
        <option v-for="(t, i) in parentTabs" :key="i" :value="i">{{ t.label || 'Tab ' + (i + 1) }}</option>
      </select>
    </label>
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
