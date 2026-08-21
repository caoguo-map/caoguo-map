var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderStyle } from "vue/server-renderer";
import { M as Map, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanWater } from "./wuhan-water.Jkl2xV_h.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var DIKE_SAFETY_COLORS = {
  safe: "#4ade80",
  // 安全 绿
  warning: "#fbbf24",
  // 警戒 黄
  danger: "#ef4444",
  // 危险 红
  breach: "#7f1d1d"
  // 决口 暗红
};
var DIKE_SAFETY_LABELS = {
  safe: "安全",
  warning: "警戒",
  danger: "危险",
  breach: "决口"
};
function paintByFlow() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "flowRate"], 0],
    0,
    "#93c5fd",
    // 低流量 浅蓝
    100,
    "#3b82f6",
    // 中流量 蓝
    500,
    "#1d4ed8",
    // 高流量 深蓝
    1e3,
    "#ef4444"
    // 超警 红
  ];
}
function paintByStorage() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "storageRate"], 0.5],
    0,
    "#fbbf24",
    // 干旱 黄
    0.3,
    "#4ade80",
    // 正常 绿
    0.7,
    "#3b82f6",
    // 充裕 蓝
    0.9,
    "#ef4444"
    // 满库 红
  ];
}
function paintByDike() {
  return [
    "match",
    ["coalesce", ["get", "safetyLevel"], "safe"],
    ...Object.entries(DIKE_SAFETY_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintByLevel() {
  return [
    "match",
    ["coalesce", ["get", "level"], "reach"],
    "basin",
    "#0ea5e9",
    "mainstream",
    "#3b82f6",
    "tributary",
    "#60a5fa",
    "reach",
    "#93c5fd",
    "#94a3b8"
  ];
}
function paintBy(mode) {
  switch (mode) {
    case "flow":
      return paintByFlow();
    case "storage":
      return paintByStorage();
    case "dike":
      return paintByDike();
    case "level":
      return paintByLevel();
    case "uniform":
    default:
      return "#60a5fa";
  }
}
function paintLineWidthByFlow(minWidth = 1.5, maxWidth = 7) {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "flowRate"], 50],
    0,
    minWidth,
    1e3,
    maxWidth
  ];
}
function buildWaterLegend(mode) {
  switch (mode) {
    case "flow":
      return {
        title: "河流流量",
        items: [
          { color: "#93c5fd", label: "低流量 <100 m³/s" },
          { color: "#3b82f6", label: "中流量 100-500" },
          { color: "#1d4ed8", label: "高流量 500-1000" },
          { color: "#ef4444", label: "超警 ≥1000" }
        ]
      };
    case "storage":
      return {
        title: "水库蓄水率",
        items: [
          { color: "#fbbf24", label: "干旱 <30%" },
          { color: "#4ade80", label: "正常 30-70%" },
          { color: "#3b82f6", label: "充裕 70-90%" },
          { color: "#ef4444", label: "满库 ≥90%" }
        ]
      };
    case "dike":
      return {
        title: "堤防安全状态",
        items: Object.entries(DIKE_SAFETY_COLORS).map(([k, color]) => ({
          color,
          label: DIKE_SAFETY_LABELS[k]
        }))
      };
    case "level":
      return {
        title: "河流层级",
        items: [
          { color: "#0ea5e9", label: "流域" },
          { color: "#3b82f6", label: "干流" },
          { color: "#60a5fa", label: "支流" },
          { color: "#93c5fd", label: "河段" }
        ]
      };
    case "uniform":
    default:
      return { title: "单色", items: [{ color: "#60a5fa", label: "全部" }] };
  }
}
var RiverSystem = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "colorBy");
    __publicField(this, "layerPrefix");
    __publicField(this, "currentLevel", null);
    __publicField(this, "layerIds", []);
    __publicField(this, "featureListeners", /* @__PURE__ */ new Set());
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? "flow";
    this.layerPrefix = options.layerPrefix ?? "cg-river";
  }
  /** 渲染水系要素 */
  render() {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const features = this.visibleFeatures();
    const lines = features.filter(
      (f) => ["mainstream", "tributary", "reach", "dike"].includes(f.kind)
    );
    const points = features.filter(
      (f) => ["reservoir", "gate", "rainStation", "waterStation", "basin"].includes(f.kind)
    );
    const lineGeoJSON = {
      type: "FeatureCollection",
      features: lines.flatMap((f) => {
        var _a, _b, _c, _d;
        const coords = f.geometry && f.geometry.length >= 2 ? f.geometry : [[f.lng, f.lat]];
        if (coords.length < 2) return [];
        return [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {
              featureId: f.id,
              kind: f.kind,
              flowRate: ((_a = f.properties) == null ? void 0 : _a.flowRate) ?? 0,
              storageRate: ((_b = f.properties) == null ? void 0 : _b.storageRate) ?? 0.5,
              safetyLevel: ((_c = f.properties) == null ? void 0 : _c.safetyLevel) ?? "safe",
              level: ((_d = f.properties) == null ? void 0 : _d.level) ?? "reach"
            }
          }
        ];
      })
    };
    const pointGeoJSON = {
      type: "FeatureCollection",
      features: points.map((f) => {
        var _a, _b, _c, _d;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [f.lng, f.lat] },
          properties: {
            featureId: f.id,
            kind: f.kind,
            flowRate: ((_a = f.properties) == null ? void 0 : _a.flowRate) ?? 0,
            storageRate: ((_b = f.properties) == null ? void 0 : _b.storageRate) ?? 0.5,
            safetyLevel: ((_c = f.properties) == null ? void 0 : _c.safetyLevel) ?? "safe",
            level: ((_d = f.properties) == null ? void 0 : _d.level) ?? "reach"
          }
        };
      })
    };
    if (lineGeoJSON.features.length > 0) {
      mlMap.addSource(`${prefix}-lines-src`, lineGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-lines`,
        type: "line",
        source: `${prefix}-lines-src`,
        paint: {
          "line-color": paintBy(this.colorBy),
          "line-width": paintLineWidthByFlow(),
          "line-opacity": 0.9
        }
      });
      this.layerIds.push(`${prefix}-lines`);
    }
    if (pointGeoJSON.features.length > 0) {
      mlMap.addSource(`${prefix}-points-src`, pointGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-points`,
        type: "circle",
        source: `${prefix}-points-src`,
        paint: {
          "circle-radius": 6,
          "circle-color": paintBy(this.colorBy),
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff"
        }
      });
      this.layerIds.push(`${prefix}-points`);
    }
  }
  /** 切换着色模式 */
  setColorBy(mode) {
    this.colorBy = mode;
    const mlMap = this.map.instance;
    try {
      mlMap.setPaintProperty(`${this.layerPrefix}-lines`, "line-color", paintBy(mode));
      mlMap.setPaintProperty(`${this.layerPrefix}-points`, "circle-color", paintBy(mode));
    } catch {
    }
  }
  /** 层级钻取（流域→干流→支流→河段，null = 全部） */
  setLevel(level) {
    this.currentLevel = level;
    this.render();
  }
  /** 顺流/逆流钻取：返回沿某河段的上下游要素 */
  traceFlow(featureId, direction) {
    const result = /* @__PURE__ */ new Set([featureId]);
    let cur = this.dataset.features.find((f) => f.id === featureId);
    if (!cur) return result;
    const visited = /* @__PURE__ */ new Set();
    let guard = 0;
    while (cur && guard < 100) {
      guard++;
      if (visited.has(cur.id)) break;
      visited.add(cur.id);
      result.add(cur.id);
      if (direction === "upstream") {
        cur = this.dataset.features.find((f) => f.id === cur.parentId);
      } else {
        cur = this.dataset.features.find((f) => f.parentId === cur.id);
      }
    }
    return result;
  }
  clear() {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
  destroy() {
    this.clear();
    this.featureListeners.clear();
  }
  onFeatureSelect(fn) {
    this.featureListeners.add(fn);
    return () => this.featureListeners.delete(fn);
  }
  visibleFeatures() {
    if (!this.currentLevel) return this.dataset.features;
    return this.dataset.features.filter((f) => {
      var _a;
      if (f.kind === "reservoir" || f.kind === "gate" || f.kind === "rainStation" || f.kind === "waterStation" || f.kind === "dike") {
        return true;
      }
      return ((_a = f.properties) == null ? void 0 : _a.level) === this.currentLevel;
    });
  }
};
const __pageData = JSON.parse('{"title":"R1 水系拓扑图","description":"","frontmatter":{"title":"R1 水系拓扑图"},"headers":[],"relativePath":"water/river.md","filePath":"water/river.md"}');
const __default__ = { name: "water/river.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const river2 = ref(null);
    const colorMode = ref("flow");
    const modes = [
      { value: "flow", label: "按流量" },
      { value: "storage", label: "按蓄水率" },
      { value: "dike", label: "按堤防安全" },
      { value: "level", label: "按河流层级" }
    ];
    ref(null);
    ref(null);
    const traceResult = ref(null);
    const legend = computed(() => buildWaterLegend(colorMode.value));
    function switchColor(mode) {
      var _a;
      colorMode.value = mode;
      (_a = river2.value) == null ? void 0 : _a.setColorBy(mode);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11 });
      m.on("load", () => {
        map.value = m;
        const r = new RiverSystem({ map: m, dataset: wuhanWater, colorBy: colorMode.value, layerPrefix: "cg-river" });
        r.render();
        river2.value = r;
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = river2.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-2201235e>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "R1 · 水系拓扑图",
        subtitle: "caoguo-water：流域→干流→支流→河段层级渲染，按流量/蓄水率/堤防安全着色。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="river-map" data-v-2201235e${_scopeId}></div>`);
            if (traceResult.value) {
              _push2(`<div class="trace-tag" data-v-2201235e${_scopeId}> 关联要素：${ssrInterpolate(traceResult.value.size)}</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "river-map"
              }, null, 512),
              traceResult.value ? (openBlock(), createBlock("div", {
                key: 0,
                class: "trace-tag"
              }, " 关联要素：" + toDisplayString(traceResult.value.size), 1)) : createCommentVNode("", true)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "着色模式",
              hint: "实时切换"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<div class="cg-tabs" data-v-2201235e${_scopeId2}><!--[-->`);
                  ssrRenderList(modes, (m) => {
                    _push3(`<button class="${ssrRenderClass([{ active: colorMode.value === m.value }, "cg-tab"])}" data-v-2201235e${_scopeId2}>${ssrInterpolate(m.label)}</button>`);
                  });
                  _push3(`<!--]--></div><div class="cg-legend" data-v-2201235e${_scopeId2}><h4 data-v-2201235e${_scopeId2}>${ssrInterpolate(legend.value.title)}</h4><!--[-->`);
                  ssrRenderList(legend.value.items, (item, i) => {
                    _push3(`<div class="cg-legend-item" data-v-2201235e${_scopeId2}><span class="cg-legend-swatch" style="${ssrRenderStyle({ background: item.color })}" data-v-2201235e${_scopeId2}></span><span class="cg-legend-label" data-v-2201235e${_scopeId2}>${ssrInterpolate(item.label)}</span></div>`);
                  });
                  _push3(`<!--]--></div>`);
                } else {
                  return [
                    createVNode("div", { class: "cg-tabs" }, [
                      (openBlock(), createBlock(Fragment, null, renderList(modes, (m) => {
                        return createVNode("button", {
                          key: m.value,
                          class: ["cg-tab", { active: colorMode.value === m.value }],
                          onClick: ($event) => switchColor(m.value)
                        }, toDisplayString(m.label), 11, ["onClick"]);
                      }), 64))
                    ]),
                    createVNode("div", { class: "cg-legend" }, [
                      createVNode("h4", null, toDisplayString(legend.value.title), 1),
                      (openBlock(true), createBlock(Fragment, null, renderList(legend.value.items, (item, i) => {
                        return openBlock(), createBlock("div", {
                          key: i,
                          class: "cg-legend-item"
                        }, [
                          createVNode("span", {
                            class: "cg-legend-swatch",
                            style: { background: item.color }
                          }, null, 4),
                          createVNode("span", { class: "cg-legend-label" }, toDisplayString(item.label), 1)
                        ]);
                      }), 128))
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-2201235e${_scopeId}><code data-v-2201235e${_scopeId}>&lt;SimPanel title=&quot;层级钻取&quot; hint=&quot;流域→干流→支流→河段&quot;&gt;
  &lt;div class=&quot;cg-tabs&quot;&gt;
    &lt;button
      v-for=&quot;l in levels&quot;
      :key=&quot;String(l.value)&quot;
      class=&quot;cg-tab&quot;
      :class=&quot;{ active: currentLevel === l.value }&quot;
      @click=&quot;switchLevel(l.value)&quot;
    &gt;
      ${ssrInterpolate(_ctx.l.label)}
    &lt;/button&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;

&lt;SimPanel title=&quot;顺流 / 逆流钻取&quot; hint=&quot;沿水系追踪&quot;&gt;
  &lt;p class=&quot;cg-hint&quot;&gt;选择一个要素，沿上下游追踪&lt;/p&gt;
  &lt;select v-model=&quot;traceId&quot; class=&quot;cg-select&quot;&gt;
    &lt;option :value=&quot;null&quot;&gt;— 取消 —&lt;/option&gt;
    &lt;option v-for=&quot;id in waterFeatureIds&quot; :key=&quot;id&quot; :value=&quot;id&quot;&gt;${ssrInterpolate(_ctx.id)}&lt;/option&gt;
  &lt;/select&gt;
  &lt;div class=&quot;trace-btns&quot;&gt;
    &lt;button class=&quot;cg-btn&quot; @click=&quot;runTrace(traceId, &#39;upstream&#39;)&quot;&gt;逆流&lt;/button&gt;
    &lt;button class=&quot;cg-btn&quot; @click=&quot;runTrace(traceId, &#39;downstream&#39;)&quot;&gt;顺流&lt;/button&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "着色模式",
                hint: "实时切换"
              }, {
                default: withCtx(() => [
                  createVNode("div", { class: "cg-tabs" }, [
                    (openBlock(), createBlock(Fragment, null, renderList(modes, (m) => {
                      return createVNode("button", {
                        key: m.value,
                        class: ["cg-tab", { active: colorMode.value === m.value }],
                        onClick: ($event) => switchColor(m.value)
                      }, toDisplayString(m.label), 11, ["onClick"]);
                    }), 64))
                  ]),
                  createVNode("div", { class: "cg-legend" }, [
                    createVNode("h4", null, toDisplayString(legend.value.title), 1),
                    (openBlock(true), createBlock(Fragment, null, renderList(legend.value.items, (item, i) => {
                      return openBlock(), createBlock("div", {
                        key: i,
                        class: "cg-legend-item"
                      }, [
                        createVNode("span", {
                          class: "cg-legend-swatch",
                          style: { background: item.color }
                        }, null, 4),
                        createVNode("span", { class: "cg-legend-label" }, toDisplayString(item.label), 1)
                      ]);
                    }), 128))
                  ])
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel title="层级钻取" hint="流域→干流→支流→河段">\n  <div class="cg-tabs">\n    <button\n      v-for="l in levels"\n      :key="String(l.value)"\n      class="cg-tab"\n      :class="{ active: currentLevel === l.value }"\n      @click="switchLevel(l.value)"\n    >\n      ' + toDisplayString(_ctx.l.label) + '\n    </button>\n  </div>\n</SimPanel>\n\n<SimPanel title="顺流 / 逆流钻取" hint="沿水系追踪">\n  <p class="cg-hint">选择一个要素，沿上下游追踪</p>\n  <select v-model="traceId" class="cg-select">\n    <option :value="null">— 取消 —</option>\n    <option v-for="id in waterFeatureIds" :key="id" :value="id">' + toDisplayString(_ctx.id) + `</option>
  </select>
  <div class="trace-btns">
    <button class="cg-btn" @click="runTrace(traceId, 'upstream')">逆流</button>
    <button class="cg-btn" @click="runTrace(traceId, 'downstream')">顺流</button>
  </div>
</SimPanel>
`, 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("water/river.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const river = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2201235e"]]);
export {
  __pageData,
  river as default
};
