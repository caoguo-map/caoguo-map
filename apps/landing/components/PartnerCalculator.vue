<script setup lang="ts">
import { ref, computed } from 'vue';

const contract = ref(500); // 项目合同额（万元）
const type = ref('智慧水务');
const useCaoguo = ref(true); // 是否使用草果地图

// 不同项目类型的复杂度系数（影响人月）
const coef: Record<string, number> = {
  智慧水务: 1.0,
  智慧园区: 0.9,
  地下管网: 1.2,
  智慧交通: 1.1,
};

// 测算假设（内部口径，仅供参考）
const ASSUME = {
  licenseRate: 0.16, // 传统商业 GIS 授权占合同额比例
  pmPerMillion: 8, // 传统：每百万合同额的人力投入（人月）
  pmCost: 3, // 人月成本（万元/人月）
  otherRate: 0.12, // 其他成本占合同额比例
  caoguoPmFactor: 0.5, // 草果人力人月系数（组件复用，减半）
  caoguoCycleFactor: 0.6, // 草果交付周期系数（提速）
};

interface Plan {
  license: number;
  pm: number;
  cycle: number;
  labor: number;
  other: number;
  profit: number;
  margin: number;
}

function calc(trad: boolean): Plan {
  const base = contract.value / 100; // 百万单位
  const pm = base * ASSUME.pmPerMillion * coef[type.value];
  const license = trad ? contract.value * ASSUME.licenseRate : 0;
  const realPm = trad ? pm : pm * ASSUME.caoguoPmFactor;
  const labor = realPm * ASSUME.pmCost;
  const other = contract.value * ASSUME.otherRate;
  const profit = contract.value - license - labor - other;
  const margin = profit / contract.value;
  const team = trad ? 8 : 4;
  const cycle = trad
    ? Math.max(1, Math.round(pm / team))
    : Math.max(1, Math.round((pm * ASSUME.caoguoPmFactor) / team / ASSUME.caoguoCycleFactor));
  return { license, pm: Math.round(realPm), cycle, labor, other, profit, margin };
}

const trad = computed(() => calc(true));
const caoguo = computed(() => calc(false));

// 当前选择的方案
const picked = computed(() => (useCaoguo.value ? caoguo.value : trad.value));
const marginLift = computed(() =>
  Math.round((caoguo.value.margin - trad.value.margin) * 100),
);

function fmt(n: number) {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}
function pct(n: number) {
  return (n * 100).toFixed(0) + '%';
}
</script>

<template>
  <div class="calc">
    <div class="calc-controls cg-card">
      <div class="calc-row">
        <label>项目合同额（万元）</label>
        <div class="calc-slider">
          <input type="range" min="50" max="5000" step="50" v-model.number="contract" />
          <input class="calc-num" type="number" min="50" max="5000" v-model.number="contract" />
        </div>
      </div>

      <div class="calc-row">
        <label>项目类型</label>
        <select v-model="type">
          <option v-for="t in Object.keys(coef)" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="calc-row calc-switch">
        <label>是否使用草果地图</label>
        <button class="switch" :class="{ on: useCaoguo }" role="switch" :aria-checked="useCaoguo.toString()"
          @click="useCaoguo = !useCaoguo">
          <span class="knob"></span>
          <span class="switch-text">{{ useCaoguo ? '使用草果' : '传统商业 GIS' }}</span>
        </button>
      </div>
    </div>

    <div class="calc-result cg-card">
      <h3 class="calc-title">利润测算对比</h3>
      <table class="calc-table">
        <thead>
          <tr>
            <th>指标</th>
            <th>传统商业 GIS</th>
            <th :class="{ hl: useCaoguo }">草果地图</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>软件授权费</td>
            <td>{{ fmt(trad.license) }} 万</td>
            <td :class="{ hl: useCaoguo }">0 万</td>
          </tr>
          <tr>
            <td>人力投入</td>
            <td>{{ trad.pm }} 人月</td>
            <td :class="{ hl: useCaoguo }">{{ caoguo.pm }} 人月</td>
          </tr>
          <tr>
            <td>交付周期</td>
            <td>{{ trad.cycle }} 个月</td>
            <td :class="{ hl: useCaoguo }">{{ caoguo.cycle }} 个月</td>
          </tr>
          <tr>
            <td>预估净利润率</td>
            <td>{{ pct(trad.margin) }}</td>
            <td :class="{ hl: useCaoguo }">{{ pct(caoguo.margin) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="calc-summary" :class="{ accent: useCaoguo }">
        <template v-if="useCaoguo">
          选择草果地图，预计净利润率 <strong>{{ pct(picked.margin) }}</strong>，
          相较传统方案提升约 <strong>{{ marginLift }} 个百分点</strong>。
        </template>
        <template v-else>
          当前为传统方案，切换为草果地图预计净利润率可提升至
          <strong>{{ pct(caoguo.margin) }}</strong>（提升约 {{ marginLift }} 个百分点）。
        </template>
      </div>
      <p class="calc-note">* 测算基于内部假设（人月成本 3 万/人月、授权占合同额 16% 等），实际因项目规模与人力结构而异，仅供参考。</p>
    </div>
  </div>
</template>

<style scoped>
.calc {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 24px;
  margin-top: 24px;
}

.calc-controls,
.calc-result {
  padding: 28px 26px;
}

.calc-row {
  margin-bottom: 22px;
}

.calc-row:last-child {
  margin-bottom: 0;
}

.calc-row label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--cg-text);
  margin-bottom: 10px;
}

.calc-slider {
  display: flex;
  align-items: center;
  gap: 14px;
}

.calc-slider input[type='range'] {
  flex: 1;
  accent-color: var(--cg-accent);
}

.calc-num {
  width: 92px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--cg-border-strong);
  background: var(--cg-bg-card);
  color: var(--cg-text);
  font-size: 14px;
}

.calc-row select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cg-border-strong);
  background: var(--cg-bg-card);
  color: var(--cg-text);
  font-size: 14px;
}

/* 开关 */
.calc-switch .switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  border: 1px solid var(--cg-border-strong);
  background: var(--cg-bg-card);
  color: var(--cg-text-muted);
  cursor: pointer;
  font-size: 14px;
}

.calc-switch .switch.on {
  color: #0a0f1e;
  background: var(--cg-accent);
  border-color: var(--cg-accent);
  font-weight: 600;
}

.calc-switch .knob {
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--cg-border-strong);
  position: relative;
  transition: background 0.2s ease;
}

.calc-switch .switch.on .knob {
  background: rgba(10, 15, 30, 0.35);
}

.calc-switch .knob::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.calc-switch .switch.on .knob::after {
  transform: translateX(14px);
}

/* 结果表 */
.calc-title {
  font-size: 18px;
  font-weight: 650;
  margin: 0 0 18px;
}

.calc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.calc-table th,
.calc-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid var(--cg-border);
}

.calc-table thead th {
  background: var(--cg-bg-elev);
  color: var(--cg-text);
  font-weight: 600;
}

.calc-table td:first-child {
  color: var(--cg-text-muted);
}

.calc-table th.hl,
.calc-table td.hl {
  color: var(--cg-accent);
  background: var(--cg-accent-soft);
  font-weight: 600;
}

.calc-summary {
  margin-top: 20px;
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--cg-bg-elev);
  border: 1px solid var(--cg-border);
  font-size: 15px;
  line-height: 1.7;
  color: var(--cg-text);
}

.calc-summary.accent {
  background: var(--cg-accent-soft);
  border-color: color-mix(in srgb, var(--cg-accent) 40%, transparent);
}

.calc-summary strong {
  color: var(--cg-accent);
}

.calc-note {
  margin: 14px 0 0;
  font-size: 12.5px;
  color: var(--cg-text-muted);
  line-height: 1.6;
}

@media (max-width: 880px) {
  .calc {
    grid-template-columns: 1fr;
  }
}
</style>
