import { defineComponent, ref, onMounted, onUnmounted, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent } from "vue/server-renderer";
import { M as Map, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "FeatureShowcase",
  __ssrInlineRender: true,
  setup(__props) {
    const PIPE_LINES = [
      { group: "pipe", coordinates: [[114.3055, 30.5928], [114.335, 30.61], [114.36, 30.64]] },
      { group: "pipe", coordinates: [[114.3055, 30.5928], [114.28, 30.57], [114.25, 30.55]] },
      { group: "road", coordinates: [[114.27, 30.66], [114.3055, 30.5928], [114.34, 30.52]] },
      { group: "water", coordinates: [[114.22, 30.6], [114.28, 30.58], [114.33, 30.6], [114.38, 30.62]] }
    ];
    const LOD_LEVELS = [
      { id: "province", minZoom: 0, maxZoom: 9, payload: "sparse" },
      { id: "city", minZoom: 10, maxZoom: 13, payload: "normal" },
      { id: "detail", minZoom: 14, payload: "full" }
    ];
    const el = ref(null);
    let map = null;
    let scale = null;
    let theme = null;
    let lod = null;
    const glowOn = ref(true);
    const lodLevel = ref("city");
    const offlinePacked = ref(false);
    const airgapOn = ref(false);
    const statusMsg = ref("加载中…");
    function applyGlow() {
      if (!map) return;
      if (glowOn.value) {
        const id = map.addGlowLayer({ id: "cg-glow", lines: PIPE_LINES, baseWidth: 3, passes: 4 });
        statusMsg.value = `辉光图层已挂载：${id}`;
      } else {
        if (map.instance.getLayer("cg-glow")) map.instance.removeLayer("cg-glow");
        statusMsg.value = "辉光已关闭";
      }
    }
    onMounted(() => {
      if (!el.value) return;
      map = new Map({ container: el.value, center: WUHAN_CENTER, zoom: 11 });
      map.on("load", () => {
        if (!map) return;
        scale = map.addScaleControl({ showCoordinate: true });
        theme = map.addThemeSwitcher();
        lod = map.addLodController(LOD_LEVELS, (e) => {
          lodLevel.value = e.level.id;
        });
        map.enableOffline();
        applyGlow();
        statusMsg.value = "就绪：比例尺 / 主题 / 辉光 / LOD 已挂载";
      });
    });
    onUnmounted(() => {
      scale == null ? void 0 : scale.remove();
      theme == null ? void 0 : theme.remove();
      lod == null ? void 0 : lod.remove();
      map == null ? void 0 : map.remove();
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "fs" }, _attrs))} data-v-a41fd163><div class="fs-map" data-v-a41fd163></div><div class="fs-panel" data-v-a41fd163><h3 data-v-a41fd163>Phase-0 能力面板</h3><button class="fs-btn" data-v-a41fd163>${ssrInterpolate(glowOn.value ? "关闭辉光" : "开启辉光")}</button><button class="fs-btn" data-v-a41fd163>${ssrInterpolate(offlinePacked.value ? "已打包离线" : "打包管线离线")}</button><button class="fs-btn" data-v-a41fd163>${ssrInterpolate(airgapOn.value ? "关闭空气隔离" : "开启空气隔离")}</button><div class="fs-row" data-v-a41fd163><span data-v-a41fd163>比例尺/坐标</span><b data-v-a41fd163>已挂载</b></div><div class="fs-row" data-v-a41fd163><span data-v-a41fd163>主题</span><b data-v-a41fd163>暗/亮可切（右上角）</b></div><div class="fs-row" data-v-a41fd163><span data-v-a41fd163>LOD 等级</span><b data-v-a41fd163>${ssrInterpolate(lodLevel.value)}</b></div><div class="fs-status" data-v-a41fd163>${ssrInterpolate(statusMsg.value)}</div><p class="fs-tip" data-v-a41fd163> LOD 随缩放自动切换密度；主题切换右上角按钮；空气隔离需部署 SW 脚本后生效（见离线文档）。 </p></div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("common/FeatureShowcase.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const FeatureShowcase = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-a41fd163"]]);
const __pageData = JSON.parse('{"title":"Phase-0 能力演示","description":"","frontmatter":{"title":"Phase-0 能力演示"},"headers":[],"relativePath":"features/index.md","filePath":"features/index.md"}');
const __default__ = { name: "features/index.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="phase-0-能力演示" tabindex="-1">Phase-0 能力演示 <a class="header-anchor" href="#phase-0-能力演示" aria-label="Permalink to &quot;Phase-0 能力演示&quot;">​</a></h1><p>一个页面串联草果地图引擎 Phase-0 的全部基础能力，验证关键路径端到端闭环：</p><ul><li><strong>坐标系 / 底图</strong>：WGS84 渲染基准，武汉暗色矢量底图</li><li><strong>比例尺 + 实时坐标</strong>（T8）：左下角随缩放更新，鼠标移动显示经纬度</li><li><strong>主题切换</strong>（T8）：右上角按钮在暗/亮主题间切换（diff 模式避免闪烁）</li><li><strong>管线辉光</strong>（T6）：GeoJSON 线经 CustomLayer 多遍描边形成辉光（开关可控）</li><li><strong>LOD 控制器</strong>（T7）：随缩放自动切换数据密度等级（右侧面板实时显示）</li><li><strong>离线瓦片</strong>（T4）：把当前管线打包进 IndexedDB 离线存储，断网仍可调出</li><li><strong>空气隔离</strong>（T5）：开关断网模式（需部署 SW 脚本后生效，见离线文档）</li></ul>`);
      _push(ssrRenderComponent(FeatureShowcase, null, null, _parent));
      _push(`<blockquote><p>注：天地图（T3）与空气隔离 Service Worker（T5）需运行时 token / 部署 SW 脚本， 本演示聚焦无需外部密钥即可验证的能力。完整接入见对应模块文档。</p></blockquote></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("features/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
