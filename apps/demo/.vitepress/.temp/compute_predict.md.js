import { defineComponent, ref, onMounted, withCtx, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, withDirectives, vModelText, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderAttr, ssrRenderStyle } from "vue/server-renderer";
import { w as wuhanCompute } from "./wuhan-compute.B4SrKBqJ.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
function aggregateByRegion(nodes) {
  var _a, _b;
  const map = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    const region = ((_a = n.properties) == null ? void 0 : _a.region) ?? "default";
    const util = ((_b = n.properties) == null ? void 0 : _b.gpuUtilization) ?? 0;
    const cur = map.get(region) ?? { total: 0, count: 0 };
    cur.total += util;
    cur.count += 1;
    map.set(region, cur);
  }
  return map;
}
function predictSupplyDemand(dataset, opts = {}) {
  const daysAhead = opts.daysAhead ?? 7;
  const growthRate = opts.growthRate ?? 0.05;
  const gapThreshold = opts.gapThreshold ?? 0.8;
  const byRegion = aggregateByRegion(dataset.nodes);
  const results = [];
  for (const [region, { total, count }] of byRegion) {
    const currentUtilization = total / count;
    const predictedUtilization = Math.min(
      1,
      currentUtilization * Math.pow(1 + growthRate, daysAhead)
    );
    const isGap = predictedUtilization > gapThreshold;
    let gapLevel = "none";
    if (isGap) {
      if (predictedUtilization > 0.95) gapLevel = "high";
      else if (predictedUtilization > 0.88) gapLevel = "medium";
      else gapLevel = "low";
    }
    results.push({
      region,
      currentUtilization,
      predictedUtilization,
      isGap,
      gapLevel
    });
  }
  return results.sort((a, b) => b.predictedUtilization - a.predictedUtilization);
}
const __pageData = JSON.parse('{"title":"C3 算力供需预测","description":"","frontmatter":{"title":"C3 算力供需预测"},"headers":[],"relativePath":"compute/predict.md","filePath":"compute/predict.md"}');
const __default__ = { name: "compute/predict.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const daysAhead = ref(7);
    const growthRate = ref(0.05);
    const gaps = ref([]);
    function run() {
      gaps.value = predictSupplyDemand(wuhanCompute, {
        daysAhead: daysAhead.value,
        growthRate: growthRate.value
      });
    }
    onMounted(() => {
      run();
    });
    const gapLevelLabel = {
      none: "无缺口",
      low: "轻度缺口",
      medium: "中度缺口",
      high: "重度缺口"
    };
    const gapLevelColor = {
      none: "#4ade80",
      low: "#fbbf24",
      medium: "#f59e0b",
      high: "#ef4444"
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-8428551b>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "C3 · 算力供需预测",
        subtitle: "caoguo-compute：未来 N 天各区域算力缺口预测（PRD §4.1.2 C-5）。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="predict-panel" data-v-8428551b${_scopeId}><div class="pp-head" data-v-8428551b${_scopeId}><h2 data-v-8428551b${_scopeId}>区域算力缺口预测</h2><p data-v-8428551b${_scopeId}>复合增长率模型，预测 ${ssrInterpolate(daysAhead.value)} 天后的利用率</p></div><div class="pp-grid" data-v-8428551b${_scopeId}><!--[-->`);
            ssrRenderList(gaps.value, (g) => {
              _push2(`<div class="${ssrRenderClass([{ "pp-gap": g.isGap }, "pp-card"])}" data-v-8428551b${_scopeId}><div class="pp-region" data-v-8428551b${_scopeId}>${ssrInterpolate(g.region)}</div><div class="pp-bar" data-v-8428551b${_scopeId}><div class="pp-bar-fill" style="${ssrRenderStyle({ width: `${(g.predictedUtilization * 100).toFixed(0)}%`, background: gapLevelColor[g.gapLevel] })}" data-v-8428551b${_scopeId}></div></div><div class="pp-meta" data-v-8428551b${_scopeId}><span data-v-8428551b${_scopeId}>当前 ${ssrInterpolate((g.currentUtilization * 100).toFixed(0))}%</span><span data-v-8428551b${_scopeId}>→ 预测 ${ssrInterpolate((g.predictedUtilization * 100).toFixed(0))}%</span></div><div class="pp-level" style="${ssrRenderStyle({ color: gapLevelColor[g.gapLevel] })}" data-v-8428551b${_scopeId}>${ssrInterpolate(gapLevelLabel[g.gapLevel])}</div></div>`);
            });
            _push2(`<!--]--></div></div>`);
          } else {
            return [
              createVNode("div", { class: "predict-panel" }, [
                createVNode("div", { class: "pp-head" }, [
                  createVNode("h2", null, "区域算力缺口预测"),
                  createVNode("p", null, "复合增长率模型，预测 " + toDisplayString(daysAhead.value) + " 天后的利用率", 1)
                ]),
                createVNode("div", { class: "pp-grid" }, [
                  (openBlock(true), createBlock(Fragment, null, renderList(gaps.value, (g) => {
                    return openBlock(), createBlock("div", {
                      key: g.region,
                      class: ["pp-card", { "pp-gap": g.isGap }]
                    }, [
                      createVNode("div", { class: "pp-region" }, toDisplayString(g.region), 1),
                      createVNode("div", { class: "pp-bar" }, [
                        createVNode("div", {
                          class: "pp-bar-fill",
                          style: { width: `${(g.predictedUtilization * 100).toFixed(0)}%`, background: gapLevelColor[g.gapLevel] }
                        }, null, 4)
                      ]),
                      createVNode("div", { class: "pp-meta" }, [
                        createVNode("span", null, "当前 " + toDisplayString((g.currentUtilization * 100).toFixed(0)) + "%", 1),
                        createVNode("span", null, "→ 预测 " + toDisplayString((g.predictedUtilization * 100).toFixed(0)) + "%", 1)
                      ]),
                      createVNode("div", {
                        class: "pp-level",
                        style: { color: gapLevelColor[g.gapLevel] }
                      }, toDisplayString(gapLevelLabel[g.gapLevel]), 5)
                    ], 2);
                  }), 128))
                ])
              ])
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "预测参数",
              hint: "C-5 供需预测"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<label class="cg-label" data-v-8428551b${_scopeId2}>预测天数</label><div class="cg-tabs" data-v-8428551b${_scopeId2}><!--[-->`);
                  ssrRenderList([1, 7, 14, 30], (d) => {
                    _push3(`<button class="${ssrRenderClass([{ active: daysAhead.value === d }, "cg-tab"])}" data-v-8428551b${_scopeId2}>${ssrInterpolate(d)}天 </button>`);
                  });
                  _push3(`<!--]--></div><label class="cg-label" data-v-8428551b${_scopeId2}>日增长率（${ssrInterpolate((growthRate.value * 100).toFixed(0))}%）</label><input${ssrRenderAttr("value", growthRate.value)} type="range" min="0.01" max="0.2" step="0.01" class="cg-range" data-v-8428551b${_scopeId2}>`);
                } else {
                  return [
                    createVNode("label", { class: "cg-label" }, "预测天数"),
                    createVNode("div", { class: "cg-tabs" }, [
                      (openBlock(), createBlock(Fragment, null, renderList([1, 7, 14, 30], (d) => {
                        return createVNode("button", {
                          key: d,
                          class: ["cg-tab", { active: daysAhead.value === d }],
                          onClick: ($event) => {
                            daysAhead.value = d;
                            run();
                          }
                        }, toDisplayString(d) + "天 ", 11, ["onClick"]);
                      }), 64))
                    ]),
                    createVNode("label", { class: "cg-label" }, "日增长率（" + toDisplayString((growthRate.value * 100).toFixed(0)) + "%）", 1),
                    withDirectives(createVNode("input", {
                      "onUpdate:modelValue": ($event) => growthRate.value = $event,
                      type: "range",
                      min: "0.01",
                      max: "0.2",
                      step: "0.01",
                      class: "cg-range",
                      onInput: run
                    }, null, 40, ["onUpdate:modelValue"]), [
                      [
                        vModelText,
                        growthRate.value,
                        void 0,
                        { number: true }
                      ]
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "预测参数",
                hint: "C-5 供需预测"
              }, {
                default: withCtx(() => [
                  createVNode("label", { class: "cg-label" }, "预测天数"),
                  createVNode("div", { class: "cg-tabs" }, [
                    (openBlock(), createBlock(Fragment, null, renderList([1, 7, 14, 30], (d) => {
                      return createVNode("button", {
                        key: d,
                        class: ["cg-tab", { active: daysAhead.value === d }],
                        onClick: ($event) => {
                          daysAhead.value = d;
                          run();
                        }
                      }, toDisplayString(d) + "天 ", 11, ["onClick"]);
                    }), 64))
                  ]),
                  createVNode("label", { class: "cg-label" }, "日增长率（" + toDisplayString((growthRate.value * 100).toFixed(0)) + "%）", 1),
                  withDirectives(createVNode("input", {
                    "onUpdate:modelValue": ($event) => growthRate.value = $event,
                    type: "range",
                    min: "0.01",
                    max: "0.2",
                    step: "0.01",
                    class: "cg-range",
                    onInput: run
                  }, null, 40, ["onUpdate:modelValue"]), [
                    [
                      vModelText,
                      growthRate.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                _: 1
              })
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("compute/predict.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const predict = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8428551b"]]);
export {
  __pageData,
  predict as default
};
