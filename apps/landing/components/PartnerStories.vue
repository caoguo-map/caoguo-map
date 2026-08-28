<script setup lang="ts">
// 4.2 场景故事区：四个真实交付场景（六张网中的管网/电网/水网/交通）
// 说明：场景取自产品已具备的能力模块，指标为相对描述，不承诺具体绝对值。

const stories = [
  {
    domain: '地下管网',
    tag: '市政 / 燃气',
    title: '爆管推演：从"翻图纸"到"点一下"',
    pain: '爆管后靠人工翻图纸判断关哪个阀、影响哪些小区，一次判断往往要半小时以上。',
    how: '管网拓扑 + 上游阀门搜索 + 下游影响遍历，点击故障管段即可输出应关阀门、受影响用户与备选路径。',
    gain: '现场决策从"小时级"压缩到"分钟级"，停气/停水范围更精准。',
    mods: ['PipelineTopology', 'BurstSimulator', 'PipelineHealth'],
  },
  {
    domain: '电网',
    tag: '供电 / 园区',
    title: '停电分析：影响范围一眼看清',
    pain: '计划检修或故障跳闸后，受影响用户数、重要用户、恢复顺序需要跨系统拼凑。',
    how: '按拓扑下游遍历统计受影响用户（居民/商业/工业分类），给出备用路径与恢复步骤。',
    gain: '抢修与客服口径统一，恢复步骤可逐条跟踪。',
    mods: ['GridTopology', 'OutageAnalyzer', 'LoadHeatmap'],
  },
  {
    domain: '水网',
    tag: '水利 / 应急',
    title: '洪水淹没：降雨量一变，范围立刻重算',
    pain: '防汛会商需要反复试算不同降雨情景，传统模型部署重、响应慢。',
    how: 'SCS-CN 径流 + 推理公式洪峰 + DEM 淹没提取，浏览器端即可改参数重算。',
    gain: '多情景快速对比，会商现场即可出图（正式防汛需接专业水文模型复核）。',
    mods: ['RiverSystem', 'FloodInundation', 'DamOperation'],
  },
  {
    domain: '交通',
    tag: '交管 / 城投',
    title: '路况与事件：从"看监控"到"看态势"',
    pain: '路况、拥堵趋势、突发事件分散在不同系统，值班人员难以形成整体态势。',
    how: '路段速度着色 + 拥堵预测 + 事件影响范围与绕行推荐，叠加公共交通客流 OD 分析。',
    gain: '一张图完成"发现—评估—处置"闭环，值班交接信息量更完整。',
    mods: ['RoadNetwork', 'TrafficFlow', 'IncidentMap'],
  },
];
</script>

<template>
  <section class="cg-section stories">
    <div class="cg-container">
      <span class="cg-eyebrow">场景故事</span>
      <h2 class="cg-h2">四个场景，看清<span class="cg-gradient-text">交付方式的变化</span></h2>
      <p class="cg-lead">不谈概念，只看一件事：同样一个项目，换掉地图底座之后，现场怎么用。</p>

      <div class="story-grid">
        <article v-for="s in stories" :key="s.title" class="cg-card s-card">
          <header class="s-head">
            <span class="s-domain">{{ s.domain }}</span>
            <span class="s-tag">{{ s.tag }}</span>
          </header>
          <h4 class="s-title">{{ s.title }}</h4>
          <dl class="s-body">
            <div class="s-row">
              <dt>过去</dt>
              <dd>{{ s.pain }}</dd>
            </div>
            <div class="s-row">
              <dt>现在</dt>
              <dd>{{ s.how }}</dd>
            </div>
            <div class="s-row">
              <dt>结果</dt>
              <dd class="s-gain">{{ s.gain }}</dd>
            </div>
          </dl>
          <footer class="s-mods">
            <span v-for="m in s.mods" :key="m" class="s-mod">{{ m }}</span>
          </footer>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stories {
  background:
    radial-gradient(ellipse at 15% 0%, var(--cg-accent-soft), transparent 55%),
    var(--cg-bg-alt);
}
.story-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 32px;
}
.s-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
}
.s-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.s-domain {
  font-size: 13px;
  font-weight: 700;
  color: var(--cg-accent);
}
.s-tag {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--cg-border);
  font-size: 11px;
  color: var(--cg-text-dim);
}
.s-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--cg-text);
}
.s-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
}
.s-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
  font-size: 13.5px;
  line-height: 1.7;
}
.s-row dt {
  color: var(--cg-text-dim);
  font-weight: 600;
}
.s-row dd {
  margin: 0;
  color: var(--cg-text-soft);
}
.s-gain {
  color: var(--cg-accent) !important;
}
.s-mods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--cg-border);
}
.s-mod {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--cg-bg-soft);
  font-size: 11px;
  font-family: var(--cg-font-mono, ui-monospace, monospace);
  color: var(--cg-text-dim);
}
@media (max-width: 900px) {
  .story-grid { grid-template-columns: 1fr; }
}
</style>
