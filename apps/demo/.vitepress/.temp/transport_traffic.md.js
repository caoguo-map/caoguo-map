var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, onMounted, onUnmounted, withCtx, unref, createVNode, withDirectives, openBlock, createBlock, Fragment, renderList, toDisplayString, vModelSelect, createTextVNode, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrInterpolate, ssrRenderClass } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { g as classifySpeed, w as wuhanTransport, t as transportEdgeIds } from "./wuhan-transport.pXf7MKwX.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
function linearRegressionSlope(values) {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}
function historicalStats(values) {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}
function predictCongestion(opts) {
  const minutesAhead = opts.minutesAhead ?? 30;
  const hist = historicalStats(opts.historicalSpeeds ?? []).mean;
  const trend = linearRegressionSlope(opts.recentSpeeds ?? []);
  const predicted = hist + trend * minutesAhead;
  historicalStats(opts.historicalSpeeds ?? []).std;
  const speed = Math.max(0, predicted);
  const confidence = Math.max(0, 1 - minutesAhead / 60);
  return {
    speed,
    confidence,
    congestionLevel: classifySpeed(speed)
    // 附赠标准差，便于上层展示置信区间
  };
}
var TrafficFlow = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "layerPrefix");
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? "cg-flow";
  }
  /** 拥堵传播分析（纯函数）：给定拥堵起点路段，沿拓扑扩散，返回受影响路段 */
  congestSpread(seedEdgeId, hops = 3) {
    const edges = this.dataset.edges;
    const speeds = this.dataset.speeds ?? [];
    const speedMap = new Map(speeds.map((s) => [s.edgeId, s.speed]));
    const seed = edges.find((e) => e.id === seedEdgeId);
    if (!seed) return [];
    const affected = /* @__PURE__ */ new Set([seedEdgeId]);
    let frontier = [seed];
    for (let i = 0; i < hops; i++) {
      const next = [];
      for (const e of frontier) {
        for (const e2 of edges) {
          if (affected.has(e2.id)) continue;
          if (e2.fromNode === e.fromNode || e2.fromNode === e.toNode || e2.toNode === e.fromNode || e2.toNode === e.toNode) {
            const spd = speedMap.get(e2.id) ?? 60;
            if (spd < 40) {
              affected.add(e2.id);
              next.push(e2);
            }
          }
        }
      }
      frontier = next;
    }
    return [...affected];
  }
  /** 对单条路段做拥堵预测 */
  predict(edgeId, minutesAhead = 30) {
    const speeds = this.dataset.speeds ?? [];
    const recent = speeds.filter((s) => s.edgeId === edgeId).map((s) => s.speed);
    return predictCongestion({ recentSpeeds: recent, minutesAhead });
  }
  /** 渲染 OD 矩阵（起终点连线，宽度=流量） */
  renderOdMatrix(odPairs) {
    this.clearOd();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n]));
    const features = odPairs.flatMap((od) => {
      const from = nodeById.get(od.fromNode);
      const to = nodeById.get(od.toNode);
      if (!from || !to) return [];
      return [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat]
            ]
          },
          properties: { flow: od.flow }
        }
      ];
    });
    mlMap.addSource(`${prefix}-od-src`, {
      type: "FeatureCollection",
      features
    });
    mlMap.addLayer({
      id: `${prefix}-od-line`,
      type: "line",
      source: `${prefix}-od-src`,
      paint: {
        "line-color": "#22d3ee",
        "line-width": ["interpolate", ["linear"], ["get", "flow"], 0, 1, 500, 6],
        "line-opacity": 0.6
      }
    });
    this.layerIds.push(`${prefix}-od-line`);
  }
  clearOd() {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
  destroy() {
    this.clearOd();
  }
};
const __pageData = JSON.parse('{"title":"T2 交通流量可视化","description":"","frontmatter":{"title":"T2 交通流量可视化"},"headers":[],"relativePath":"transport/traffic.md","filePath":"transport/traffic.md"}');
const __default__ = { name: "transport/traffic.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const flow = ref(null);
    const selectedEdge = ref("r02");
    const minutesAhead = ref(30);
    const prediction = ref(null);
    const spreadEdges = ref([]);
    function runPredict() {
      if (!flow.value) return;
      prediction.value = flow.value.predict(selectedEdge.value, minutesAhead.value);
      spreadEdges.value = flow.value.congestSpread(selectedEdge.value, 3);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
      m.on("load", () => {
        map.value = m;
        const f = new TrafficFlow({ map: m, dataset: wuhanTransport, layerPrefix: "cg-flow" });
        flow.value = f;
        runPredict();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = flow.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-bf426d87>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "T2 · 交通流量可视化",
        subtitle: "caoguo-transport：拥堵预测（历史同时段 + 实时趋势）+ 拥堵传播分析。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="flow-map" data-v-bf426d87${_scopeId}></div>`);
            if (prediction.value) {
              _push2(`<div class="pred-tag" data-v-bf426d87${_scopeId}> 预测 ${ssrInterpolate(minutesAhead.value)}min 后：${ssrInterpolate(prediction.value.speed.toFixed(0))} km/h · ${ssrInterpolate(prediction.value.congestionLevel)}</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "flow-map"
              }, null, 512),
              prediction.value ? (openBlock(), createBlock("div", {
                key: 0,
                class: "pred-tag"
              }, " 预测 " + toDisplayString(minutesAhead.value) + "min 后：" + toDisplayString(prediction.value.speed.toFixed(0)) + " km/h · " + toDisplayString(prediction.value.congestionLevel), 1)) : createCommentVNode("", true)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "拥堵预测",
              hint: "PRD §3.2.2"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<label class="cg-label" data-v-bf426d87${_scopeId2}>选择路段</label><select class="cg-select" data-v-bf426d87${_scopeId2}><!--[-->`);
                  ssrRenderList(unref(transportEdgeIds), (id) => {
                    _push3(`<option${ssrRenderAttr("value", id)} data-v-bf426d87${ssrIncludeBooleanAttr(Array.isArray(selectedEdge.value) ? ssrLooseContain(selectedEdge.value, id) : ssrLooseEqual(selectedEdge.value, id)) ? " selected" : ""}${_scopeId2}>${ssrInterpolate(id)}</option>`);
                  });
                  _push3(`<!--]--></select><label class="cg-label" data-v-bf426d87${_scopeId2}>预测时长（分钟）</label><div class="cg-tabs" data-v-bf426d87${_scopeId2}><!--[-->`);
                  ssrRenderList([15, 30, 60], (t) => {
                    _push3(`<button class="${ssrRenderClass([{ active: minutesAhead.value === t }, "cg-tab"])}" data-v-bf426d87${_scopeId2}>${ssrInterpolate(t)}min </button>`);
                  });
                  _push3(`<!--]--></div>`);
                  if (prediction.value) {
                    _push3(`<div class="cg-result" data-v-bf426d87${_scopeId2}><p data-v-bf426d87${_scopeId2}>预测速度：<strong data-v-bf426d87${_scopeId2}>${ssrInterpolate(prediction.value.speed.toFixed(1))} km/h</strong></p><p data-v-bf426d87${_scopeId2}>拥堵等级：<strong data-v-bf426d87${_scopeId2}>${ssrInterpolate(prediction.value.congestionLevel)}</strong></p><p data-v-bf426d87${_scopeId2}>置信度：<strong data-v-bf426d87${_scopeId2}>${ssrInterpolate((prediction.value.confidence * 100).toFixed(0))}%</strong></p><p data-v-bf426d87${_scopeId2}>拥堵传播路段：<strong data-v-bf426d87${_scopeId2}>${ssrInterpolate(spreadEdges.value.length)}</strong> 条</p></div>`);
                  } else {
                    _push3(`<!---->`);
                  }
                } else {
                  return [
                    createVNode("label", { class: "cg-label" }, "选择路段"),
                    withDirectives(createVNode("select", {
                      "onUpdate:modelValue": ($event) => selectedEdge.value = $event,
                      class: "cg-select",
                      onChange: runPredict
                    }, [
                      (openBlock(true), createBlock(Fragment, null, renderList(unref(transportEdgeIds), (id) => {
                        return openBlock(), createBlock("option", {
                          key: id,
                          value: id
                        }, toDisplayString(id), 9, ["value"]);
                      }), 128))
                    ], 40, ["onUpdate:modelValue"]), [
                      [vModelSelect, selectedEdge.value]
                    ]),
                    createVNode("label", { class: "cg-label" }, "预测时长（分钟）"),
                    createVNode("div", { class: "cg-tabs" }, [
                      (openBlock(), createBlock(Fragment, null, renderList([15, 30, 60], (t) => {
                        return createVNode("button", {
                          key: t,
                          class: ["cg-tab", { active: minutesAhead.value === t }],
                          onClick: ($event) => {
                            minutesAhead.value = t;
                            runPredict();
                          }
                        }, toDisplayString(t) + "min ", 11, ["onClick"]);
                      }), 64))
                    ]),
                    prediction.value ? (openBlock(), createBlock("div", {
                      key: 0,
                      class: "cg-result"
                    }, [
                      createVNode("p", null, [
                        createTextVNode("预测速度："),
                        createVNode("strong", null, toDisplayString(prediction.value.speed.toFixed(1)) + " km/h", 1)
                      ]),
                      createVNode("p", null, [
                        createTextVNode("拥堵等级："),
                        createVNode("strong", null, toDisplayString(prediction.value.congestionLevel), 1)
                      ]),
                      createVNode("p", null, [
                        createTextVNode("置信度："),
                        createVNode("strong", null, toDisplayString((prediction.value.confidence * 100).toFixed(0)) + "%", 1)
                      ]),
                      createVNode("p", null, [
                        createTextVNode("拥堵传播路段："),
                        createVNode("strong", null, toDisplayString(spreadEdges.value.length), 1),
                        createTextVNode(" 条")
                      ])
                    ])) : createCommentVNode("", true)
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "拥堵预测",
                hint: "PRD §3.2.2"
              }, {
                default: withCtx(() => [
                  createVNode("label", { class: "cg-label" }, "选择路段"),
                  withDirectives(createVNode("select", {
                    "onUpdate:modelValue": ($event) => selectedEdge.value = $event,
                    class: "cg-select",
                    onChange: runPredict
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(transportEdgeIds), (id) => {
                      return openBlock(), createBlock("option", {
                        key: id,
                        value: id
                      }, toDisplayString(id), 9, ["value"]);
                    }), 128))
                  ], 40, ["onUpdate:modelValue"]), [
                    [vModelSelect, selectedEdge.value]
                  ]),
                  createVNode("label", { class: "cg-label" }, "预测时长（分钟）"),
                  createVNode("div", { class: "cg-tabs" }, [
                    (openBlock(), createBlock(Fragment, null, renderList([15, 30, 60], (t) => {
                      return createVNode("button", {
                        key: t,
                        class: ["cg-tab", { active: minutesAhead.value === t }],
                        onClick: ($event) => {
                          minutesAhead.value = t;
                          runPredict();
                        }
                      }, toDisplayString(t) + "min ", 11, ["onClick"]);
                    }), 64))
                  ]),
                  prediction.value ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: "cg-result"
                  }, [
                    createVNode("p", null, [
                      createTextVNode("预测速度："),
                      createVNode("strong", null, toDisplayString(prediction.value.speed.toFixed(1)) + " km/h", 1)
                    ]),
                    createVNode("p", null, [
                      createTextVNode("拥堵等级："),
                      createVNode("strong", null, toDisplayString(prediction.value.congestionLevel), 1)
                    ]),
                    createVNode("p", null, [
                      createTextVNode("置信度："),
                      createVNode("strong", null, toDisplayString((prediction.value.confidence * 100).toFixed(0)) + "%", 1)
                    ]),
                    createVNode("p", null, [
                      createTextVNode("拥堵传播路段："),
                      createVNode("strong", null, toDisplayString(spreadEdges.value.length), 1),
                      createTextVNode(" 条")
                    ])
                  ])) : createCommentVNode("", true)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("transport/traffic.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const traffic = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bf426d87"]]);
export {
  __pageData,
  traffic as default
};
