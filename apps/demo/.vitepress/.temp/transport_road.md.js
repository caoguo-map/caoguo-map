var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderStyle } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { R as ROAD_CLASS_COLORS, c as ROAD_CLASS_LABELS, d as ROAD_STATUS_COLORS, e as ROAD_STATUS_LABELS, f as ROAD_CLASS_WIDTHS, w as wuhanTransport } from "./wuhan-transport.pXf7MKwX.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
function legendByRoadClass() {
  return {
    title: "道路等级",
    items: Object.keys(ROAD_CLASS_COLORS).map((k) => ({
      label: ROAD_CLASS_LABELS[k],
      color: ROAD_CLASS_COLORS[k]
    }))
  };
}
function legendByStatus() {
  return {
    title: "路段状态",
    items: Object.keys(ROAD_STATUS_COLORS).map((k) => ({
      label: ROAD_STATUS_LABELS[k],
      color: ROAD_STATUS_COLORS[k]
    }))
  };
}
function legendBySpeed() {
  return {
    title: "实时路况（km/h）",
    items: [
      { label: "≥80 高速", color: "#22d3ee" },
      { label: "60-80 畅通", color: "#4ade80" },
      { label: "40-60 缓行", color: "#fbbf24" },
      { label: "20-40 拥堵", color: "#f59e0b" },
      { label: "<20 停滞", color: "#ef4444" }
    ]
  };
}
function buildRoadLegend(mode) {
  switch (mode) {
    case "roadClass":
      return legendByRoadClass();
    case "speed":
      return legendBySpeed();
    case "status":
      return legendByStatus();
    default:
      return legendByRoadClass();
  }
}
function paintRoadByClass() {
  return [
    "match",
    ["get", "roadClass"],
    ...Object.entries(ROAD_CLASS_COLORS).flatMap(([k, v]) => [k, v]),
    "#9ca3af"
  ];
}
function paintRoadBySpeed() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "speed"], 60],
    0,
    "#ef4444",
    // 停滞 红
    20,
    "#f59e0b",
    // 拥堵 橙
    40,
    "#fbbf24",
    // 缓行 黄
    60,
    "#4ade80",
    // 畅通 绿
    80,
    "#22d3ee"
    // 高速 青
  ];
}
function paintRoadByStatus() {
  return [
    "match",
    ["coalesce", ["get", "status"], "open"],
    ...Object.entries(ROAD_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintRoadWidthByClass() {
  return [
    "match",
    ["get", "roadClass"],
    ...Object.entries(ROAD_CLASS_WIDTHS).flatMap(([k, v]) => [k, v]),
    2
  ];
}
function paintRoadBy(mode) {
  switch (mode) {
    case "roadClass":
      return paintRoadByClass();
    case "speed":
      return paintRoadBySpeed();
    case "status":
      return paintRoadByStatus();
    case "uniform":
    default:
      return "#60a5fa";
  }
}
var RoadNetwork = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "colorBy");
    __publicField(this, "facilityKinds");
    __publicField(this, "layerPrefix");
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? "roadClass";
    this.facilityKinds = options.facilityKinds ?? ["toll", "rest_area", "service_area", "parking"];
    this.layerPrefix = options.layerPrefix ?? "cg-road";
  }
  /** 渲染路段 + 设施节点 */
  render() {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n]));
    const edgeGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.edges.flatMap((e) => {
        var _a;
        const from = nodeById.get(e.fromNode);
        const to = nodeById.get(e.toNode);
        if (!from || !to) return [];
        const coords = e.geometry && e.geometry.length >= 2 ? e.geometry : [
          [from.lng, from.lat],
          [to.lng, to.lat]
        ];
        return [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {
              edgeId: e.id,
              roadClass: e.roadClass,
              status: ((_a = e.properties) == null ? void 0 : _a.status) ?? "open",
              speed: 60
            }
          }
        ];
      })
    };
    const facilityGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.nodes.filter((n) => this.facilityKinds.includes(n.kind)).map((n) => {
        var _a;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [n.lng, n.lat] },
          properties: {
            nodeId: n.id,
            kind: n.kind,
            name: ((_a = n.properties) == null ? void 0 : _a.name) ?? ""
          }
        };
      })
    };
    mlMap.addSource(`${prefix}-edges-src`, edgeGeoJSON);
    mlMap.addSource(`${prefix}-facility-src`, facilityGeoJSON);
    mlMap.addLayer({
      id: `${prefix}-edges-line`,
      type: "line",
      source: `${prefix}-edges-src`,
      paint: {
        "line-color": paintRoadBy(this.colorBy),
        "line-width": paintRoadWidthByClass(),
        "line-opacity": 0.9
      }
    });
    this.layerIds.push(`${prefix}-edges-line`);
    if (facilityGeoJSON.features.length > 0) {
      mlMap.addLayer({
        id: `${prefix}-facility-pt`,
        type: "circle",
        source: `${prefix}-facility-src`,
        paint: {
          "circle-radius": 5,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff"
        }
      });
      this.layerIds.push(`${prefix}-facility-pt`);
    }
  }
  /** 更新实时速度数据并切换为路况模式 */
  setSpeeds(speeds) {
    const speedMap = new Map(speeds.map((s) => [s.edgeId, s.speed]));
    const mlMap = this.map.instance;
    const src = mlMap.getSource(`${this.layerPrefix}-edges-src`);
    if (!src) return;
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n]));
    const edgeGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.edges.flatMap((e) => {
        var _a;
        const from = nodeById.get(e.fromNode);
        const to = nodeById.get(e.toNode);
        if (!from || !to) return [];
        const coords = e.geometry && e.geometry.length >= 2 ? e.geometry : [
          [from.lng, from.lat],
          [to.lng, to.lat]
        ];
        return [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {
              edgeId: e.id,
              roadClass: e.roadClass,
              status: ((_a = e.properties) == null ? void 0 : _a.status) ?? "open",
              speed: speedMap.get(e.id) ?? 60
            }
          }
        ];
      })
    };
    if (src.setData) src.setData(edgeGeoJSON);
  }
  /** 切换着色模式 */
  setColorBy(mode) {
    this.colorBy = mode;
    const mlMap = this.map.instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-edges-line`,
          "line-color",
          paintRoadBy(mode)
        );
      } catch {
      }
    }
  }
  /** 清空所有图层 */
  clear() {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
  /** 销毁组件 */
  destroy() {
    this.clear();
  }
};
const __pageData = JSON.parse('{"title":"T1 路网编辑器","description":"","frontmatter":{"title":"T1 路网编辑器"},"headers":[],"relativePath":"transport/road.md","filePath":"transport/road.md"}');
const __default__ = { name: "transport/road.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const road2 = ref(null);
    const colorMode = ref("roadClass");
    const modes = [
      { value: "roadClass", label: "按道路等级" },
      { value: "speed", label: "按实时速度" },
      { value: "status", label: "按状态" }
    ];
    const stats = ref({ edges: wuhanTransport.edges.length, nodes: wuhanTransport.nodes.length });
    const legend = computed(() => buildRoadLegend(colorMode.value));
    function switchColor(mode) {
      var _a, _b;
      colorMode.value = mode;
      if (mode === "speed") {
        (_a = road2.value) == null ? void 0 : _a.setSpeeds(wuhanTransport.speeds ?? []);
      }
      (_b = road2.value) == null ? void 0 : _b.setColorBy(mode);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
      m.on("load", () => {
        map.value = m;
        const r = new RoadNetwork({ map: m, dataset: wuhanTransport, colorBy: colorMode.value, layerPrefix: "cg-road" });
        r.render();
        road2.value = r;
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = road2.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-b0cc7dc9>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "T1 · 路网编辑器",
        subtitle: "caoguo-transport：按道路等级/实时速度/状态着色，设施（收费站/服务区/停车场）标注。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="road-map" data-v-b0cc7dc9${_scopeId}></div><div class="stats-tag" data-v-b0cc7dc9${_scopeId}>${ssrInterpolate(stats.value.edges)} 路段 · ${ssrInterpolate(stats.value.nodes)} 节点 </div>`);
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "road-map"
              }, null, 512),
              createVNode("div", { class: "stats-tag" }, toDisplayString(stats.value.edges) + " 路段 · " + toDisplayString(stats.value.nodes) + " 节点 ", 1)
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
                  _push3(`<div class="cg-tabs" data-v-b0cc7dc9${_scopeId2}><!--[-->`);
                  ssrRenderList(modes, (m) => {
                    _push3(`<button class="${ssrRenderClass([{ active: colorMode.value === m.value }, "cg-tab"])}" data-v-b0cc7dc9${_scopeId2}>${ssrInterpolate(m.label)}</button>`);
                  });
                  _push3(`<!--]--></div><div class="cg-legend" data-v-b0cc7dc9${_scopeId2}><h4 data-v-b0cc7dc9${_scopeId2}>${ssrInterpolate(legend.value.title)}</h4><!--[-->`);
                  ssrRenderList(legend.value.items, (item, i) => {
                    _push3(`<div class="cg-legend-item" data-v-b0cc7dc9${_scopeId2}><span class="cg-legend-swatch" style="${ssrRenderStyle({ background: item.color })}" data-v-b0cc7dc9${_scopeId2}></span><span class="cg-legend-label" data-v-b0cc7dc9${_scopeId2}>${ssrInterpolate(item.label)}</span></div>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("transport/road.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const road = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b0cc7dc9"]]);
export {
  __pageData,
  road as default
};
