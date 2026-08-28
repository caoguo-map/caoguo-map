<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ComponentNode, MapLayer, DataSource } from '../../types';
import { useDataSources } from '../../store/useDataSources';
import { useHistory } from '../../store/useHistory';
import DataSourceFields from './DataSourceFields.vue';

const props = defineProps<{ node?: ComponentNode | MapLayer }>();
const ds = useDataSources();
const { commit } = useHistory();

// 引用模式：有 dataSourceId 即引用，否则内联
const mode = computed<'ref' | 'inline'>(() => (props.node?.dataSourceId ? 'ref' : 'inline'));
const refId = computed<string>({
  get: () => props.node?.dataSourceId ?? '',
  set: (v) => {
    if (!props.node) return;
    commit();
    props.node.dataSourceId = v || undefined;
    // 切换为引用时，清空内联配置避免歧义（保留不删也可，这里清空）
    if (v) props.node.dataSource = undefined;
  },
});

const inlineDs = computed<DataSource | undefined>({
  get: () => props.node?.dataSource,
  set: (v) => {
    if (!props.node) return;
    commit();
    props.node.dataSource = v;
  },
});

// 引用模式下新建数据源并引用
const newName = ref('');
function onNewRef() {
  const name = '数据源 ' + (ds.list.value.length + 1);
  const created = ds.create(name, { type: 'static' });
  if (props.node) {
    commit();
    props.node.dataSourceId = created.id;
    props.node.dataSource = undefined;
  }
}

// 解析预览
const resolved = computed(() => ds.resolveForNode(props.node));
const resolvedName = computed(() => ds.nameForNode(props.node));

// 图表类组件需配置维度/度量字段（数据契约映射）
const CHART_TYPES = ['trend-chart', 'bar-chart', 'pie-chart', 'gauge-chart', 'wind-rose'];
const isChart = computed(() => !!props.node && CHART_TYPES.includes(props.node.type));
function setChartField(key: 'dimensionField' | 'metricField', v: string) {
  if (!props.node) return;
  commit();
  props.node.config = { ...props.node.config, [key]: v || undefined };
}
const dimensionField = computed<string>(() => (props.node?.config as any)?.dimensionField ?? '');
const metricField = computed<string>(() => (props.node?.config as any)?.metricField ?? '');
</script>

<template>
  <div class="cg-field-group">
    <div class="cg-group-title">数据源</div>

    <div class="cg-ds-mode">
      <button :class="{ active: mode === 'ref' }" @click="refId = refId">引用已有</button>
      <button :class="{ active: mode === 'inline' }" @click="refId = ''">内联配置</button>
    </div>

    <template v-if="mode === 'ref'">
      <label class="cg-field">
        <span>选择数据源</span>
        <select :value="refId" @change="refId = ($event.target as HTMLSelectElement).value">
          <option value="">— 未选择 —</option>
          <option v-for="d in ds.list.value" :key="d.id" :value="d.id">{{ d.name }}（{{ d.type }}）</option>
        </select>
      </label>
      <button class="cg-ds-new" @click="onNewRef">+ 新建并引用</button>

      <div v-if="resolvedName" class="cg-ds-resolved">
        已引用：<b>{{ resolvedName }}</b>
        <span class="cg-ds-resolved-type">{{ resolved?.type }}</span>
      </div>
      <div v-else class="cg-ds-hint">尚未选择数据源，将无数据。</div>
    </template>

    <template v-else>
      <DataSourceFields v-model="inlineDs" />
    </template>

    <template v-if="isChart && props.node?.dataSourceId">
      <div class="cg-group-title" style="margin-top: 12px">图表字段映射</div>
      <label class="cg-field">
        <span>维度字段（分组）</span>
        <input :value="dimensionField" placeholder="如 type / name" @input="setChartField('dimensionField', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="cg-field">
        <span>度量字段（数值）</span>
        <input :value="metricField" placeholder="如 load / flow / moisture（留空自动取首个数值字段）" @input="setChartField('metricField', ($event.target as HTMLInputElement).value)" />
      </label>
      <div class="cg-ds-hint">留空时维度默认用 name，度量自动取首个数值字段。数据源行按维度汇总求和。</div>
    </template>
  </div>
</template>

<style scoped>
.cg-field-group { border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 10px; margin-top: 10px; }
.cg-group-title { font-size: 12px; color: #8b93a7; margin-bottom: 8px; font-weight: 600; }
.cg-ds-mode { display: flex; gap: 6px; margin-bottom: 12px; }
.cg-ds-mode button {
  flex: 1; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #8b93a7; border-radius: 6px; padding: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s;
}
.cg-ds-mode button.active { background: #4ade80; color: #06281a; border-color: #4ade80; font-weight: 600; }
.cg-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; font-size: 12px; color: #b8c0d4; }
.cg-field select {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e6f0; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none;
}
.cg-ds-new {
  width: 100%; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.35);
  color: #6ee7a8; border-radius: 6px; padding: 6px; font-size: 12px; cursor: pointer; margin-bottom: 10px;
}
.cg-ds-new:hover { background: rgba(74, 222, 128, 0.18); }
.cg-ds-resolved { font-size: 12px; color: #b8c0d4; background: rgba(74, 222, 128, 0.08); border: 1px solid rgba(74, 222, 128, 0.25); border-radius: 6px; padding: 8px 10px; }
.cg-ds-resolved b { color: #e0e6f0; }
.cg-ds-resolved-type { margin-left: 6px; font-size: 10px; color: #8b93a7; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 4px; padding: 1px 5px; }
.cg-ds-hint { font-size: 12px; color: #fbbf24; background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 6px; padding: 8px 10px; }
</style>
