<script setup lang="ts">
const points = [
  {
    title: '贵',
    sub: '授权费高、按核计费',
    desc: '传统商业 GIS 按 CPU 核、并发数收费，关键基础设施项目动辄数十万授权。',
    sol: '草果地图零授权费',
    fix: 'Apache-2.0 / MIT 开源，私有化一次部署无限使用。',
    color: '#f43f5e',
    path: 'M4 4h16v16H4z M4 9h16 M9 14h6',
  },
  {
    title: '锁',
    sub: '数据必须出域',
    desc: 'SaaS 地图要求管线、电网等敏感数据上传云端，难以满足等保与合规要求。',
    sol: 'Docker 一键私有化部署',
    fix: '完全离线运行，数据不出内网，满足关基与等保 2.0。',
    color: '#14b8a6',
    path: 'M7 11V8a5 5 0 0 1 10 0v3 M6 11h12v9H6z M12 15v3',
  },
  {
    title: '慢',
    sub: '行业场景缺位',
    desc: '通用地图引擎没有爆管模拟、负荷热力等行业能力，二次开发周期长。',
    sol: '行业组件开箱即用',
    fix: '内置六张网行业图层与仿真，开发周期缩短 70%。',
    color: '#f59e0b',
    path: 'M7 3h10 M7 21h10 M7 3c0 5 10 5 10 10 M7 21c0-5 10-5 10-10',
  },
  {
    title: '缺',
    sub: 'AI 能力缺位',
    desc: '通用地图没有自然语言查询与智能辅助，空间分析仍靠手工，效率天花板低。',
    sol: 'NLPG + Copilot 内置',
    fix: '用一句话驱动地图与空间分析，让数据自己上图。',
    color: '#8b5cf6',
    path: 'M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  },
];
</script>

<template>
  <section id="painpoints" class="cg-section pain">
    <div class="cg-container">
      <span class="cg-eyebrow">为什么是草果地图</span>
      <h2 class="cg-h2">传统 GIS 的四道墙：<span class="cg-gradient-text">贵、锁、慢、缺</span></h2>
      <p class="cg-lead">关键基础设施的地图需求，长期被商业平台的定价与架构束缚。我们用开源、私有化与空间智能把它拆掉。</p>

      <div class="pain-grid">
        <article v-for="p in points" :key="p.title" class="cg-card pain-card" :style="{ '--accent': p.color }">
          <div class="pain-badge">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path :d="p.path" />
            </svg>
          </div>
          <h3 class="pain-title">{{ p.title }}<small>{{ p.sub }}</small></h3>
          <p class="pain-desc">{{ p.desc }}</p>
          <p class="pain-fix">
            <span class="fix-tag">{{ p.sol }}</span>
            <span class="pain-sol-desc">{{ p.fix }}</span>
          </p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pain {
  background: linear-gradient(180deg, var(--cg-bg) 0%, var(--cg-bg-elev) 100%);
}

.pain-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
  margin-top: 48px;
}

.pain-card {
  padding: 30px 26px;
}

.pain-badge {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  margin-bottom: 18px;
}

.pain-title {
  font-size: 30px;
  font-weight: 700;
  margin: 0 0 14px;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.pain-title small {
  font-size: 14px;
  font-weight: 500;
  color: var(--cg-text-muted);
}

.pain-desc {
  font-size: 15px;
  line-height: 1.7;
  color: var(--cg-text-muted);
  margin: 0 0 16px;
}

.pain-fix {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--cg-text);
  margin: 0;
  padding-top: 16px;
  border-top: 1px solid var(--cg-border);
}

.fix-tag {
  display: inline-block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 6px;
  padding: 3px 10px;
}

.pain-sol-desc {
  color: var(--cg-text-muted);
}

@media (max-width: 1199px) {
  .pain-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .pain-grid {
    grid-template-columns: 1fr;
  }
}
</style>
