<script setup lang="ts">
const caps = [
  {
    name: 'MapCopilot',
    path: 'M4 19h16M7 15l3-8 3 5 2-3 2 6',
    desc: '用自然语言指挥地图。',
    example: '「显示光谷片区管网爆管影响范围」——一句话生成图层与模拟。',
    color: '#14b8a6',
  },
  {
    name: 'NLPG',
    path: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z M12 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
    desc: '自然语言地理查询引擎。',
    example: '把「江汉路附近 500 米内的管线」自动转成空间查询与可视化。',
    color: '#0ea5e9',
  },
  {
    name: '离线私有化',
    path: 'M12 3l7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6l7-3Z M9.5 12l1.8 1.8L15 10',
    desc: '断网可用，数据不出域。',
    example: '一体化离线包，内网零依赖部署，满足等保与关基合规要求。',
    color: '#22d3ee',
  },
  {
    name: 'GeoAI',
    path: 'M12 3l9 5-9 5-9-5 9-5Z M3 13l9 5 9-5 M3 16.5l9 5 9-5',
    desc: '报表与影像自动入图。',
    example: 'Excel / 影像自动矢量化与空间关联，无需手工标注即可上图。',
    color: '#4ade80',
  },
];
</script>

<template>
  <section class="cg-section core">
    <div class="cg-container">
      <span class="cg-eyebrow">核心能力</span>
      <h2 class="cg-h2">地图之上，是<span class="cg-gradient-text">空间智能</span></h2>
      <p class="cg-lead">四类能力把"看地图"升级为"问地图、用地图、让数据自己上图"。</p>

      <div class="core-grid">
        <article v-for="c in caps" :key="c.name" class="cg-card core-card" :style="{ '--accent': c.color }">
          <div class="core-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path :d="c.path" />
            </svg>
          </div>
          <h3 class="core-name">{{ c.name }}</h3>
          <p class="core-desc">{{ c.desc }}</p>
          <p class="core-example">{{ c.example }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.core {
  background: linear-gradient(180deg, var(--cg-bg-elev) 0%, var(--cg-bg) 100%);
}

.core-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 46px;
}

.core-card {
  padding: 28px 24px;
  border-top: 2px solid var(--accent);
}

.core-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  font-size: 22px;
  border-radius: 12px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  margin-bottom: 16px;
}

.core-name {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px;
}

.core-desc {
  font-size: 14px;
  font-weight: 500;
  color: var(--cg-text);
  margin: 0 0 12px;
}

.core-example {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--cg-text-muted);
  margin: 0;
}

@media (max-width: 1199px) {
  .core-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .core-grid {
    grid-template-columns: 1fr;
  }
}
</style>
