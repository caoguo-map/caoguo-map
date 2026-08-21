var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, onMounted, onUnmounted, withCtx, createVNode, withDirectives, vModelText, openBlock, createBlock, createTextVNode, toDisplayString, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrInterpolate } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanCompute } from "./wuhan-compute.B4SrKBqJ.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
function haversine(lng1, lat1, lng2, lat2) {
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function recommendBestNode(nodes, userLng, userLat) {
  return nodes.filter((n) => n.online !== false).map((n) => {
    const distance = haversine(userLng, userLat, n.lng, n.lat);
    const latencyMs = distance / 1e5 + 1;
    return { id: n.id, distance, latencyMs };
  }).sort((a, b) => a.latencyMs - b.latencyMs);
}
var LatencyMap = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "thresholdMs");
    __publicField(this, "layerPrefix");
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.thresholdMs = options.thresholdMs ?? 50;
    this.layerPrefix = options.layerPrefix ?? "cg-latency";
  }
  /** LM-2 最优接入推荐 */
  recommendBestNode(userLng, userLat) {
    return recommendBestNode(
      this.dataset.nodes.map((n) => {
        var _a;
        return {
          id: n.id,
          lng: n.lng,
          lat: n.lat,
          online: ((_a = n.properties) == null ? void 0 : _a.status) !== "offline"
        };
      }),
      userLng,
      userLat
    );
  }
  /** LM-4 延迟告警：找出超过阈值的链路 */
  checkAlerts() {
    var _a;
    const alerts = [];
    for (const l of this.dataset.links) {
      const latency2 = ((_a = l.properties) == null ? void 0 : _a.latencyMs) ?? 0;
      if (latency2 > this.thresholdMs) {
        alerts.push({
          linkId: l.id,
          latencyMs: latency2,
          thresholdMs: this.thresholdMs,
          level: latency2 > this.thresholdMs * 2 ? "critical" : "warning"
        });
      }
    }
    return alerts.sort((a, b) => b.latencyMs - a.latencyMs);
  }
  /** LM-3 延迟趋势：从记录中提取某链路 24h 序列统计 */
  trend(records, linkId) {
    const series = records.filter((r) => r.linkId === linkId).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)).map((r) => r.latencyMs);
    if (series.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0 };
    }
    const min = Math.min(...series);
    const max = Math.max(...series);
    const avg = series.reduce((a, b) => a + b, 0) / series.length;
    return { count: series.length, min, max, avg };
  }
  clear() {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
  destroy() {
    this.clear();
  }
};
const __pageData = JSON.parse('{"title":"C2 延迟热力图","description":"","frontmatter":{"title":"C2 延迟热力图"},"headers":[],"relativePath":"compute/latency.md","filePath":"compute/latency.md"}');
const __default__ = { name: "compute/latency.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const latency2 = ref(null);
    const userLng = ref(114.3);
    const userLat = ref(30.55);
    const recommendations = ref([]);
    const alerts = ref([]);
    const thresholdMs = ref(50);
    function analyze() {
      if (!latency2.value) return;
      recommendations.value = latency2.value.recommendBestNode(userLng.value, userLat.value);
      alerts.value = latency2.value.checkAlerts();
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11 });
      m.on("load", () => {
        map.value = m;
        const l = new LatencyMap({ map: m, dataset: wuhanCompute, thresholdMs: thresholdMs.value, layerPrefix: "cg-latency" });
        latency2.value = l;
        analyze();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = latency2.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-ed040473>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "C2 · 延迟热力图",
        subtitle: "caoguo-compute：延迟分级 + 最优接入推荐（LM-2）+ 延迟告警（LM-4）。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="latency-map" data-v-ed040473${_scopeId}></div><div class="tag" data-v-ed040473${_scopeId}> 延迟告警：${ssrInterpolate(alerts.value.length)} 条 </div>`);
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "latency-map"
              }, null, 512),
              createVNode("div", { class: "tag" }, " 延迟告警：" + toDisplayString(alerts.value.length) + " 条 ", 1)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "最优接入推荐",
              hint: "LM-2 按延迟排序"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<label class="cg-label" data-v-ed040473${_scopeId2}>用户位置（经度）</label><input${ssrRenderAttr("value", userLng.value)} type="number" step="0.01" class="cg-input" data-v-ed040473${_scopeId2}><label class="cg-label" data-v-ed040473${_scopeId2}>用户位置（纬度）</label><input${ssrRenderAttr("value", userLat.value)} type="number" step="0.01" class="cg-input" data-v-ed040473${_scopeId2}>`);
                  if (recommendations.value.length) {
                    _push3(`<div class="cg-result" data-v-ed040473${_scopeId2}><p data-v-ed040473${_scopeId2}>最优接入节点：<strong data-v-ed040473${_scopeId2}>${ssrInterpolate(recommendations.value[0].id)}</strong></p><p data-v-ed040473${_scopeId2}>预估延迟：<strong data-v-ed040473${_scopeId2}>${ssrInterpolate(recommendations.value[0].latencyMs.toFixed(1))} ms</strong></p></div>`);
                  } else {
                    _push3(`<!---->`);
                  }
                } else {
                  return [
                    createVNode("label", { class: "cg-label" }, "用户位置（经度）"),
                    withDirectives(createVNode("input", {
                      "onUpdate:modelValue": ($event) => userLng.value = $event,
                      type: "number",
                      step: "0.01",
                      class: "cg-input",
                      onChange: analyze
                    }, null, 40, ["onUpdate:modelValue"]), [
                      [
                        vModelText,
                        userLng.value,
                        void 0,
                        { number: true }
                      ]
                    ]),
                    createVNode("label", { class: "cg-label" }, "用户位置（纬度）"),
                    withDirectives(createVNode("input", {
                      "onUpdate:modelValue": ($event) => userLat.value = $event,
                      type: "number",
                      step: "0.01",
                      class: "cg-input",
                      onChange: analyze
                    }, null, 40, ["onUpdate:modelValue"]), [
                      [
                        vModelText,
                        userLat.value,
                        void 0,
                        { number: true }
                      ]
                    ]),
                    recommendations.value.length ? (openBlock(), createBlock("div", {
                      key: 0,
                      class: "cg-result"
                    }, [
                      createVNode("p", null, [
                        createTextVNode("最优接入节点："),
                        createVNode("strong", null, toDisplayString(recommendations.value[0].id), 1)
                      ]),
                      createVNode("p", null, [
                        createTextVNode("预估延迟："),
                        createVNode("strong", null, toDisplayString(recommendations.value[0].latencyMs.toFixed(1)) + " ms", 1)
                      ])
                    ])) : createCommentVNode("", true)
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-ed040473${_scopeId}><code data-v-ed040473${_scopeId}>&lt;SimPanel title=&quot;延迟告警&quot; hint=&quot;LM-4 超阈值&quot;&gt;
  &lt;label class=&quot;cg-label&quot;&gt;告警阈值（ms）&lt;/label&gt;
  &lt;input v-model.number=&quot;thresholdMs&quot; type=&quot;number&quot; class=&quot;cg-input&quot; @change=&quot;analyze&quot; /&gt;
  &lt;div v-if=&quot;alerts.length&quot; class=&quot;cg-result&quot;&gt;
    &lt;div v-for=&quot;a in alerts&quot; :key=&quot;a.linkId&quot; class=&quot;cg-alert&quot;&gt;
      &lt;span class=&quot;cg-alert-dot&quot; :style=&quot;{ background: a.level === &#39;critical&#39; ? &#39;#ef4444&#39; : &#39;#f59e0b&#39; }&quot; /&gt;
      &lt;span&gt;${ssrInterpolate(_ctx.a.linkId)}：${ssrInterpolate(_ctx.a.latencyMs)}ms&lt;/span&gt;
    &lt;/div&gt;
  &lt;/div&gt;
  &lt;p v-else class=&quot;cg-empty&quot;&gt;无超阈值告警&lt;/p&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "最优接入推荐",
                hint: "LM-2 按延迟排序"
              }, {
                default: withCtx(() => [
                  createVNode("label", { class: "cg-label" }, "用户位置（经度）"),
                  withDirectives(createVNode("input", {
                    "onUpdate:modelValue": ($event) => userLng.value = $event,
                    type: "number",
                    step: "0.01",
                    class: "cg-input",
                    onChange: analyze
                  }, null, 40, ["onUpdate:modelValue"]), [
                    [
                      vModelText,
                      userLng.value,
                      void 0,
                      { number: true }
                    ]
                  ]),
                  createVNode("label", { class: "cg-label" }, "用户位置（纬度）"),
                  withDirectives(createVNode("input", {
                    "onUpdate:modelValue": ($event) => userLat.value = $event,
                    type: "number",
                    step: "0.01",
                    class: "cg-input",
                    onChange: analyze
                  }, null, 40, ["onUpdate:modelValue"]), [
                    [
                      vModelText,
                      userLat.value,
                      void 0,
                      { number: true }
                    ]
                  ]),
                  recommendations.value.length ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: "cg-result"
                  }, [
                    createVNode("p", null, [
                      createTextVNode("最优接入节点："),
                      createVNode("strong", null, toDisplayString(recommendations.value[0].id), 1)
                    ]),
                    createVNode("p", null, [
                      createTextVNode("预估延迟："),
                      createVNode("strong", null, toDisplayString(recommendations.value[0].latencyMs.toFixed(1)) + " ms", 1)
                    ])
                  ])) : createCommentVNode("", true)
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, `<SimPanel title="延迟告警" hint="LM-4 超阈值">
  <label class="cg-label">告警阈值（ms）</label>
  <input v-model.number="thresholdMs" type="number" class="cg-input" @change="analyze" />
  <div v-if="alerts.length" class="cg-result">
    <div v-for="a in alerts" :key="a.linkId" class="cg-alert">
      <span class="cg-alert-dot" :style="{ background: a.level === 'critical' ? '#ef4444' : '#f59e0b' }" />
      <span>` + toDisplayString(_ctx.a.linkId) + "：" + toDisplayString(_ctx.a.latencyMs) + 'ms</span>\n    </div>\n  </div>\n  <p v-else class="cg-empty">无超阈值告警</p>\n</SimPanel>\n', 1)
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("compute/latency.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const latency = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ed040473"]]);
export {
  __pageData,
  latency as default
};
