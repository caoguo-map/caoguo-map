var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, onMounted, withCtx, openBlock, createBlock, Fragment, renderList, createVNode, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrInterpolate, ssrRenderStyle } from "vue/server-renderer";
import { w as wuhanTelecom } from "./wuhan-telecom.CHlkX2EX.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
var NetworkHealth = class {
  constructor(options) {
    __publicField(this, "dataset");
    this.dataset = options.dataset;
  }
  /** NH-1 基站在线率统计（按运营商） */
  onlineRateByCarrier() {
    return this.groupOnlineRate((s) => s.carrier);
  }
  /** NH-1 基站在线率统计（按区域） */
  onlineRateByRegion() {
    return this.groupOnlineRate((s) => {
      var _a;
      return ((_a = s.properties) == null ? void 0 : _a.region) ?? "default";
    });
  }
  /** NH-1 基站在线率统计（按类型） */
  onlineRateByType() {
    return this.groupOnlineRate((s) => s.type);
  }
  groupOnlineRate(keyFn) {
    var _a;
    const map = /* @__PURE__ */ new Map();
    for (const s of this.dataset.baseStations) {
      const key = keyFn(s);
      const cur = map.get(key) ?? { total: 0, online: 0 };
      cur.total += 1;
      if (((_a = s.properties) == null ? void 0 : _a.status) === "online") cur.online += 1;
      map.set(key, cur);
    }
    return [...map.entries()].map(([group, { total, online }]) => ({
      group,
      total,
      online,
      onlineRate: total > 0 ? online / total : 0
    }));
  }
  /** NH-2 故障基站告警列表 */
  faultAlerts() {
    return this.dataset.baseStations.filter((s) => {
      var _a;
      return ((_a = s.properties) == null ? void 0 : _a.status) === "fault";
    }).map((s) => ({ station: s, reason: this.guessFaultReason(s) }));
  }
  /** NH-4 故障根因分析（启发式） */
  guessFaultReason(s) {
    const p = s.properties ?? {};
    if (p.throughputMbps !== void 0 && p.throughputMbps < 10) return "吞吐量异常偏低";
    if (p.userCount !== void 0 && p.userCount > 500) return "用户过载";
    if (p.powerDbm !== void 0 && p.powerDbm < 30) return "发射功率异常";
    return "未知故障";
  }
  /** NH-3 故障趋势：按日期聚合故障数（传入带时间戳的故障记录） */
  faultTrend(records, bucket) {
    const map = /* @__PURE__ */ new Map();
    for (const r of records) {
      const d = new Date(r.timestamp);
      let key;
      if (bucket === "day") key = d.toISOString().slice(0, 10);
      else if (bucket === "week") {
        const week = Math.floor(d.getTime() / (7 * 86400 * 1e3));
        key = `week-${week}`;
      } else {
        key = d.toISOString().slice(0, 7);
      }
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([bucket2, count]) => ({ bucket: bucket2, count })).sort((a, b) => a.bucket.localeCompare(b.bucket));
  }
};
const __pageData = JSON.parse('{"title":"T2 网络健康度面板","description":"","frontmatter":{"title":"T2 网络健康度面板"},"headers":[],"relativePath":"telecom/health.md","filePath":"telecom/health.md"}');
const __default__ = { name: "telecom/health.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const health2 = ref(null);
    const rateByCarrier = ref([]);
    const rateByType = ref([]);
    const alerts = ref([]);
    onMounted(() => {
      const h = new NetworkHealth({ dataset: wuhanTelecom });
      health2.value = h;
      rateByCarrier.value = h.onlineRateByCarrier();
      rateByType.value = h.onlineRateByType();
      alerts.value = h.faultAlerts();
    });
    function ratePercent(r) {
      return (r * 100).toFixed(0) + "%";
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-373f1c60>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "T2 · 网络健康度面板",
        subtitle: "caoguo-telecom：基站在线率统计（NH-1）+ 故障告警（NH-2）+ 根因分析（NH-4）。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="health-panel" data-v-373f1c60${_scopeId}><div class="hp-head" data-v-373f1c60${_scopeId}><h2 data-v-373f1c60${_scopeId}>网络健康度总览</h2><p data-v-373f1c60${_scopeId}>按运营商 / 类型统计基站在线率，识别故障根因</p></div><div class="hp-section" data-v-373f1c60${_scopeId}><h3 data-v-373f1c60${_scopeId}>运营商在线率（NH-1）</h3><div class="hp-list" data-v-373f1c60${_scopeId}><!--[-->`);
            ssrRenderList(rateByCarrier.value, (r) => {
              _push2(`<div class="hp-row" data-v-373f1c60${_scopeId}><span class="hp-name" data-v-373f1c60${_scopeId}>${ssrInterpolate(r.group)}</span><div class="hp-bar" data-v-373f1c60${_scopeId}><div class="hp-bar-fill" style="${ssrRenderStyle({ width: ratePercent(r.onlineRate), background: r.onlineRate >= 0.8 ? "#4ade80" : r.onlineRate >= 0.5 ? "#fbbf24" : "#ef4444" })}" data-v-373f1c60${_scopeId}></div></div><span class="hp-val" data-v-373f1c60${_scopeId}>${ssrInterpolate(r.online)}/${ssrInterpolate(r.total)} · ${ssrInterpolate(ratePercent(r.onlineRate))}</span></div>`);
            });
            _push2(`<!--]--></div></div><div class="hp-section" data-v-373f1c60${_scopeId}><h3 data-v-373f1c60${_scopeId}>故障告警（NH-2 / NH-4）</h3>`);
            if (alerts.value.length) {
              _push2(`<div class="hp-alerts" data-v-373f1c60${_scopeId}><!--[-->`);
              ssrRenderList(alerts.value, (a) => {
                _push2(`<div class="hp-alert" data-v-373f1c60${_scopeId}><span class="hp-alert-dot" data-v-373f1c60${_scopeId}></span><div data-v-373f1c60${_scopeId}><p class="hp-alert-name" data-v-373f1c60${_scopeId}>${ssrInterpolate(a.station.name)}（${ssrInterpolate(a.station.carrier)}）</p><p class="hp-alert-reason" data-v-373f1c60${_scopeId}>疑似原因：${ssrInterpolate(a.reason)}</p></div></div>`);
              });
              _push2(`<!--]--></div>`);
            } else {
              _push2(`<p class="hp-empty" data-v-373f1c60${_scopeId}>无故障基站</p>`);
            }
            _push2(`</div></div>`);
          } else {
            return [
              createVNode("div", { class: "health-panel" }, [
                createVNode("div", { class: "hp-head" }, [
                  createVNode("h2", null, "网络健康度总览"),
                  createVNode("p", null, "按运营商 / 类型统计基站在线率，识别故障根因")
                ]),
                createVNode("div", { class: "hp-section" }, [
                  createVNode("h3", null, "运营商在线率（NH-1）"),
                  createVNode("div", { class: "hp-list" }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(rateByCarrier.value, (r) => {
                      return openBlock(), createBlock("div", {
                        key: r.group,
                        class: "hp-row"
                      }, [
                        createVNode("span", { class: "hp-name" }, toDisplayString(r.group), 1),
                        createVNode("div", { class: "hp-bar" }, [
                          createVNode("div", {
                            class: "hp-bar-fill",
                            style: { width: ratePercent(r.onlineRate), background: r.onlineRate >= 0.8 ? "#4ade80" : r.onlineRate >= 0.5 ? "#fbbf24" : "#ef4444" }
                          }, null, 4)
                        ]),
                        createVNode("span", { class: "hp-val" }, toDisplayString(r.online) + "/" + toDisplayString(r.total) + " · " + toDisplayString(ratePercent(r.onlineRate)), 1)
                      ]);
                    }), 128))
                  ])
                ]),
                createVNode("div", { class: "hp-section" }, [
                  createVNode("h3", null, "故障告警（NH-2 / NH-4）"),
                  alerts.value.length ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: "hp-alerts"
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(alerts.value, (a) => {
                      return openBlock(), createBlock("div", {
                        key: a.station.id,
                        class: "hp-alert"
                      }, [
                        createVNode("span", { class: "hp-alert-dot" }),
                        createVNode("div", null, [
                          createVNode("p", { class: "hp-alert-name" }, toDisplayString(a.station.name) + "（" + toDisplayString(a.station.carrier) + "）", 1),
                          createVNode("p", { class: "hp-alert-reason" }, "疑似原因：" + toDisplayString(a.reason), 1)
                        ])
                      ]);
                    }), 128))
                  ])) : (openBlock(), createBlock("p", {
                    key: 1,
                    class: "hp-empty"
                  }, "无故障基站"))
                ])
              ])
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "按类型统计",
              hint: "NH-1"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<!--[-->`);
                  ssrRenderList(rateByType.value, (r) => {
                    _push3(`<div class="cg-row" data-v-373f1c60${_scopeId2}><span data-v-373f1c60${_scopeId2}>${ssrInterpolate(r.group)}</span><span data-v-373f1c60${_scopeId2}>${ssrInterpolate(r.online)}/${ssrInterpolate(r.total)}</span><span class="cg-rate" style="${ssrRenderStyle({ color: r.onlineRate >= 0.8 ? "#4ade80" : "#ef4444" })}" data-v-373f1c60${_scopeId2}>${ssrInterpolate(ratePercent(r.onlineRate))}</span></div>`);
                  });
                  _push3(`<!--]-->`);
                } else {
                  return [
                    (openBlock(true), createBlock(Fragment, null, renderList(rateByType.value, (r) => {
                      return openBlock(), createBlock("div", {
                        key: r.group,
                        class: "cg-row"
                      }, [
                        createVNode("span", null, toDisplayString(r.group), 1),
                        createVNode("span", null, toDisplayString(r.online) + "/" + toDisplayString(r.total), 1),
                        createVNode("span", {
                          class: "cg-rate",
                          style: { color: r.onlineRate >= 0.8 ? "#4ade80" : "#ef4444" }
                        }, toDisplayString(ratePercent(r.onlineRate)), 5)
                      ]);
                    }), 128))
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "按类型统计",
                hint: "NH-1"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createBlock(Fragment, null, renderList(rateByType.value, (r) => {
                    return openBlock(), createBlock("div", {
                      key: r.group,
                      class: "cg-row"
                    }, [
                      createVNode("span", null, toDisplayString(r.group), 1),
                      createVNode("span", null, toDisplayString(r.online) + "/" + toDisplayString(r.total), 1),
                      createVNode("span", {
                        class: "cg-rate",
                        style: { color: r.onlineRate >= 0.8 ? "#4ade80" : "#ef4444" }
                      }, toDisplayString(ratePercent(r.onlineRate)), 5)
                    ]);
                  }), 128))
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("telecom/health.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const health = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-373f1c60"]]);
export {
  __pageData,
  health as default
};
