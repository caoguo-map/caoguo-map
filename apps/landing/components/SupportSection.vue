<script setup lang="ts">
// 4.5 技术支持体系：合作伙伴拿到的不是"一个仓库链接"，而是一整套落地支撑

const items = [
  {
    title: '私有化部署',
    desc: '提供 Docker 与离线/空气隔离两种部署方案，内网无外网环境同样可运行，瓦片与字体资源可本地化。',
    path: 'M4 17h16v4H4z M6 17V7a6 6 0 0 1 12 0v10',
  },
  {
    title: '文档与示例',
    desc: '快速上手、API 参考、部署指南、常见问题与可交互演示中心，按包逐项可查，配套代码示例。',
    path: 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z M8 7h8 M8 11h8 M8 15h5',
  },
  {
    title: '行业组件复用',
    desc: '管网 / 电网 / 水网 / 交通 / 算力 / 通信六张网组件开箱即用，算法为纯函数，便于二次封装与单测。',
    path: 'M3 7h7v7H3z M14 7h7v7h-7z M3 18h7v3H3z M14 18h7v3h-7z',
  },
  {
    title: '问题响应',
    desc: '开源仓库提交 Issue 可跟踪处理；合作项目可约定响应时效与专属对接人，紧急问题走绿色通道。',
    path: 'M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6z M10 20a2 2 0 0 0 4 0',
  },
  {
    title: '培训与共建',
    desc: '提供实施培训与架构评审；行业组件可联合沉淀，形成的通用能力回流开源主干。',
    path: 'M12 3 2 8l10 5 10-5-10-5z M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5',
  },
  {
    title: '版本与升级',
    desc: '语义化版本与变更记录， Breaking Change 提前公告；私有化客户可锁定版本按节奏升级。',
    path: 'M4 12a8 8 0 0 1 13.7-5.7L20 8 M20 4v4h-4 M20 12a8 8 0 0 1-13.7 5.7L4 16 M4 20v-4h4',
  },
];
</script>

<template>
  <section class="cg-section support">
    <div class="cg-container">
      <span class="cg-eyebrow">技术支持体系</span>
      <h2 class="cg-h2">交付不是终点，<span class="cg-gradient-text">跑得起来才算</span></h2>
      <p class="cg-lead">从部署、上手到排障与升级，每一环都有明确支撑方式。</p>

      <div class="sup-grid">
        <article v-for="i in items" :key="i.title" class="cg-card sup-card">
          <div class="sup-badge">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path :d="i.path" />
            </svg>
          </div>
          <h4 class="sup-title">{{ i.title }}</h4>
          <p class="sup-desc">{{ i.desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sup-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 32px;
}
.sup-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px;
}
.sup-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--cg-accent-soft);
  color: var(--cg-accent);
}
.sup-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--cg-text);
}
.sup-desc {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--cg-text-soft);
}
@media (max-width: 1000px) {
  .sup-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 680px) {
  .sup-grid { grid-template-columns: 1fr; }
}
</style>
