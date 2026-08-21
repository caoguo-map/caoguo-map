<script setup lang="ts">
import { ref } from 'vue';

const networks = [
  {
    key: 'pipeline',
    name: '地下管网',
    tag: '六张网 · 标杆场景',
    desc: '管线拓扑、爆管模拟、泄漏扩散与管网健康度评估，城市生命线的数字孪生底座。',
    features: ['管网拓扑自动成图', '爆管影响范围模拟', '泄漏 plume 扩散', '管网健康度评分'],
    color: '#14b8a6',
  },
  {
    key: 'grid',
    name: '电网',
    tag: '六张网',
    desc: '电网拓扑可视化、停电影响分析与负荷热力，支撑调度与应急研判。',
    features: ['电网拓扑成图', '停电影响分析', '负荷热力图', '输配电路径追踪'],
    color: '#f59e0b',
  },
  {
    key: 'water',
    name: '水网',
    tag: '六张网',
    desc: '河网水系、洪涝淹没模拟与闸坝联合调度，防汛抗旱的空间决策工具。',
    features: ['河网水系渲染', '洪涝淹没模拟', '闸坝联合调度', '水位—降雨关联'],
    color: '#0ea5e9',
  },
  {
    key: 'transport',
    name: '交通',
    tag: '六张网',
    desc: '路网结构、实时交通流与事件地图，城市交通治理的可视化中枢。',
    features: ['路网结构渲染', '交通流热力', '事件地图', '拥堵溯源'],
    color: '#22d3ee',
  },
  {
    key: 'compute',
    name: '算力',
    tag: '六张网',
    desc: '算力节点分布、时延地图与资源调度视图，东数西算的可视化抓手。',
    features: ['算力节点分布', '网络时延地图', '资源调度视图', '跨域流量'],
    color: '#a78bfa',
  },
  {
    key: 'telecom',
    name: '通信',
    tag: '六张网',
    desc: '基站覆盖、网络健康与信号质量地图，5G 规划的落地工具。',
    features: ['基站覆盖渲染', '网络健康度', '信号质量地图', '盲区识别'],
    color: '#4ade80',
  },
];

const active = ref(0);
</script>

<template>
  <section class="cg-section net">
    <div class="cg-container">
      <span class="cg-eyebrow">一套引擎 · 六张网</span>
      <h2 class="cg-h2">为关键基础设施而生的<span class="cg-gradient-text">地图能力</span></h2>
      <p class="cg-lead">不是通用地图的搬运，而是把行业 Know-How 沉淀进图层、仿真与交互。</p>

      <div class="net-tabs" role="tablist">
        <button v-for="(n, i) in networks" :key="n.key" class="net-tab" :class="{ active: active === i }"
          role="tab" :aria-selected="(active === i).toString()" @click="active = i">
          <span class="dot" :style="{ background: n.color }"></span>{{ n.name }}
        </button>
      </div>

      <div class="net-panel cg-card">
        <div class="net-info">
          <span class="net-tag">{{ networks[active].tag }}</span>
          <h3 class="net-name">{{ networks[active].name }}</h3>
          <p class="net-desc">{{ networks[active].desc }}</p>
          <ul class="net-feats">
            <li v-for="f in networks[active].features" :key="f">
              <span class="check" :style="{ color: networks[active].color }">✓</span>{{ f }}
            </li>
          </ul>
          <a class="cg-btn cg-btn-primary" href="/demo/">查看演示中心</a>
        </div>
        <div class="net-visual" :style="{ '--accent': networks[active].color }">
          <div class="net-grid"></div>
          <div class="net-glow"></div>
          <span class="net-visual-label">{{ networks[active].name }} · 示意图</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.net {
  background: var(--cg-bg-elev);
}

.net-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 44px 0 28px;
}

.net-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--cg-border);
  background: var(--cg-bg-card);
  color: var(--cg-text-muted);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.net-tab .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.net-tab:hover {
  color: var(--cg-text);
}

.net-tab.active {
  color: var(--cg-text);
  border-color: var(--cg-primary-3);
  background: var(--cg-gradient-soft);
}

.net-panel {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 0;
  overflow: hidden;
  padding: 0;
}

.net-info {
  padding: 40px;
}

.net-tag {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--cg-primary-3);
}

.net-name {
  font-size: 30px;
  font-weight: 700;
  margin: 10px 0 14px;
}

.net-desc {
  font-size: 15px;
  line-height: 1.7;
  color: var(--cg-text-muted);
  margin: 0 0 22px;
}

.net-feats {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: grid;
  gap: 12px;
}

.net-feats li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.check {
  font-weight: 700;
}

.net-visual {
  position: relative;
  min-height: 320px;
  background:
    radial-gradient(circle at 60% 40%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%),
    var(--cg-bg);
  border-left: 1px solid var(--cg-border);
  overflow: hidden;
}

.net-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--cg-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--cg-border) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at 60% 40%, black 30%, transparent 75%);
}

.net-glow {
  position: absolute;
  width: 220px;
  height: 220px;
  left: 55%;
  top: 38%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 50%, transparent), transparent 70%);
  filter: blur(8px);
  animation: pulse 3.5s ease-in-out infinite;
}

.net-visual-label {
  position: absolute;
  bottom: 16px;
  right: 18px;
  font-size: 13px;
  color: var(--cg-text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.08); }
}

@media (max-width: 900px) {
  .net-panel {
    grid-template-columns: 1fr;
  }
  .net-visual {
    border-left: 0;
    border-top: 1px solid var(--cg-border);
    min-height: 220px;
  }
}
</style>
