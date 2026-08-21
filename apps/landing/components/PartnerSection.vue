<script setup lang="ts">
// 3.7 合作伙伴区：外包商痛点矩阵 + 利润测算 + 合作模式 + 案例证言占位

const pains = [
  {
    title: '招不到人',
    desc: 'GIS 前端、空间分析工程师稀缺，招聘周期以月计，项目排期常被卡住。',
    path: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-1a6 6 0 0 1 12 0v1',
  },
  {
    title: '周期长',
    desc: '从底图、图层到行业组件全部自研，一个项目往往拖上数月。',
    path: 'M12 7v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  },
  {
    title: '授权贵',
    desc: '商业 GIS 按核、按并发收费，项目利润被授权成本大量吞噬。',
    path: 'M4 4h16v16H4z M4 9h16 M9 14h6',
  },
  {
    title: '复用低',
    desc: '每个项目从零搭一套，经验沉淀不成资产，下一单照样从头来。',
    path: 'M7 3h10 M7 21h10 M7 3c0 5 10 5 10 10 M7 21c0-5 10-5 10-10',
  },
];

const compareRows = [
  { k: '软件授权费', trad: '约 ¥80 万（按核计费）', caoguo: '¥0（开源）' },
  { k: '人力投入', trad: '8 人 · 5 个月', caoguo: '4 人 · 2.5 个月' },
  { k: '交付周期', trad: '约 6 个月', caoguo: '约 3 个月' },
  { k: '项目利润率', trad: '约 22%', caoguo: '约 48%' },
  { k: '可复用资产', trad: '基本归零', caoguo: '沉淀为自有组件库' },
];

const modes = [
  {
    title: '技术合作',
    desc: '免费获取源码、私有化部署包与行业组件，配套文档与示例快速上手。',
    path: 'M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2 M16 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2 M9 12h6',
  },
  {
    title: '联合投标',
    desc: '草果地图作为底层引擎随方案背书，强化国产化与自主可控资质。',
    path: 'M4 21V8l8-4 8 4v13 M9 21v-6h6v6 M4 8l8 4 8-4',
  },
  {
    title: '分润合作',
    desc: '面向最终客户的持续运维与增值模块，按项目享受长期分润。',
    path: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  },
];
</script>

<template>
  <section id="partner" class="cg-section partner">
    <div class="cg-container">
      <span class="cg-eyebrow">面向合作伙伴</span>
      <h2 class="cg-h2">用草果地图，把 GIS 外包项目的<span class="cg-gradient-text">利润做厚</span></h2>
      <p class="cg-lead">
        系统集成商、ISV、外包公司——把地图引擎换成草果，授权成本归零、交付提速一倍，
        沉淀下来的组件还能在下一个项目复用。赚钱的活，越做越轻松。
      </p>

      <!-- 3.7.1 外包商痛点矩阵 -->
      <h3 class="partner-sub">外包商接 GIS 项目的四道坎</h3>
      <div class="partner-grid">
        <article v-for="p in pains" :key="p.title" class="cg-card p-card">
          <div class="p-badge">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path :d="p.path" />
            </svg>
          </div>
          <h4 class="p-title">{{ p.title }}</h4>
          <p class="p-desc">{{ p.desc }}</p>
        </article>
      </div>

      <!-- 3.7.2 利润测算对比 -->
      <h3 class="partner-sub">利润测算：智慧水务项目（约 ¥500 万）</h3>
      <div class="compare">
        <table class="compare-table">
          <thead>
            <tr>
              <th>对比项</th>
              <th>传统商业 GIS</th>
              <th class="hl">草果地图</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in compareRows" :key="r.k">
              <td class="k">{{ r.k }}</td>
              <td>{{ r.trad }}</td>
              <td class="hl">{{ r.caoguo }}</td>
            </tr>
          </tbody>
        </table>
        <p class="compare-note">* 测算基于典型智慧水务项目，实际因规模与人力结构而异。</p>
      </div>

      <!-- 3.7.3 合作模式概览 -->
      <h3 class="partner-sub">三种合作模式，按需选择</h3>
      <div class="mode-grid">
        <article v-for="m in modes" :key="m.title" class="cg-card m-card" :style="{ '--accent': 'var(--cg-accent)' }">
          <div class="m-badge">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path :d="m.path" />
            </svg>
          </div>
          <h4 class="m-title">{{ m.title }}</h4>
          <p class="m-desc">{{ m.desc }}</p>
        </article>
      </div>

      <!-- 3.7.4 案例/证言占位 -->
      <div class="case-placeholder">
        <span class="case-soon">即将上线</span>
        <p class="case-text">合作伙伴案例与证言持续征集中，敬请期待。</p>
      </div>

      <div class="partner-cta">
        <a class="cg-btn cg-btn-accent" href="/partner/">查看详细合作方案与利润计算器 →</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.partner {
  background: linear-gradient(180deg, var(--cg-bg-elev) 0%, var(--cg-bg) 100%);
}

.partner-sub {
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 650;
  margin: 56px 0 24px;
  color: var(--cg-text);
}

.partner-sub:first-of-type {
  margin-top: 40px;
}

.partner-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.p-card {
  padding: 26px 24px;
}

.p-badge {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: var(--cg-accent);
  background: var(--cg-accent-soft);
  border: 1px solid color-mix(in srgb, var(--cg-accent) 32%, transparent);
  margin-bottom: 16px;
}

.p-title {
  font-size: 19px;
  font-weight: 700;
  margin: 0 0 10px;
}

.p-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--cg-text-muted);
  margin: 0;
}

/* 利润对比表 */
.compare {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  border-radius: var(--cg-radius);
  overflow: hidden;
  border: 1px solid var(--cg-border);
}

.compare-table th,
.compare-table td {
  padding: 14px 18px;
  text-align: left;
  border-bottom: 1px solid var(--cg-border);
}

.compare-table thead th {
  background: var(--cg-bg-elev);
  font-weight: 600;
  color: var(--cg-text);
}

.compare-table tbody tr:last-child td {
  border-bottom: 0;
}

.compare-table td.k {
  color: var(--cg-text-muted);
  font-weight: 500;
}

.compare-table th.hl,
.compare-table td.hl {
  color: var(--cg-accent);
  background: var(--cg-accent-soft);
  font-weight: 600;
}

.compare-note {
  margin: 12px 2px 0;
  font-size: 13px;
  color: var(--cg-text-muted);
}

/* 合作模式 */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.m-card {
  padding: 28px 26px;
}

.m-badge {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  margin-bottom: 18px;
}

.m-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 10px;
}

.m-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--cg-text-muted);
  margin: 0;
}

/* 案例占位 */
.case-placeholder {
  margin-top: 56px;
  padding: 36px;
  text-align: center;
  border: 1px dashed color-mix(in srgb, var(--cg-accent) 40%, transparent);
  border-radius: var(--cg-radius);
  background: var(--cg-accent-soft);
}

.case-soon {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: var(--cg-accent);
  background: color-mix(in srgb, var(--cg-accent) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--cg-accent) 40%, transparent);
  border-radius: 999px;
  padding: 4px 14px;
  margin-bottom: 12px;
}

.case-text {
  margin: 0;
  font-size: 15px;
  color: var(--cg-text-muted);
}

.partner-cta {
  margin-top: 40px;
  text-align: center;
}

@media (max-width: 1199px) {
  .partner-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .mode-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .partner-grid {
    grid-template-columns: 1fr;
  }
  .compare-table {
    font-size: 13px;
  }
  .compare-table th,
  .compare-table td {
    padding: 11px 12px;
  }
}
</style>
