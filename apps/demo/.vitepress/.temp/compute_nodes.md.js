var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderStyle } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanCompute } from "./wuhan-compute.B4SrKBqJ.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var NODE_TYPE_COLORS = {
  datacenter: "#3b82f6",
  // 数据中心 蓝
  edge_node: "#4ade80",
  // 边缘节点 绿
  cloud_region: "#a78bfa"
  // 区域云 紫
};
var NODE_TYPE_LABELS = {
  datacenter: "数据中心",
  edge_node: "边缘节点",
  cloud_region: "区域云"
};
var NODE_STATUS_COLORS = {
  online: "#4ade80",
  // 在线 绿
  offline: "#6b7280",
  // 离线 灰
  maintenance: "#fbbf24"
  // 维护 黄
};
var NODE_STATUS_LABELS = {
  online: "在线",
  offline: "离线",
  maintenance: "维护中"
};
var LINK_TYPE_COLORS = {
  fiber: "#3b82f6",
  // 光缆 蓝
  microwave: "#f59e0b",
  // 微波 橙
  satellite: "#a78bfa"
  // 卫星 紫
};
function paintNodeByType() {
  return [
    "match",
    ["get", "type"],
    ...Object.entries(NODE_TYPE_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintNodeByGpuUtil() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "gpuUtilization"], 0],
    0,
    "#4ade80",
    // 空闲 绿
    0.3,
    "#22d3ee",
    // 低负载 青
    0.6,
    "#fbbf24",
    // 中负载 黄
    0.8,
    "#f59e0b",
    // 高负载 橙
    0.95,
    "#ef4444"
    // 满载 红
  ];
}
function paintNodeByStatus() {
  return [
    "match",
    ["coalesce", ["get", "status"], "online"],
    ...Object.entries(NODE_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintLinkByUtilization() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "utilization"], 0],
    0,
    "#4ade80",
    0.5,
    "#fbbf24",
    0.8,
    "#ef4444"
  ];
}
function paintLinkByType() {
  return [
    "match",
    ["get", "type"],
    ...Object.entries(LINK_TYPE_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintLinkWidthByBandwidth() {
  return [
    "match",
    ["coalesce", ["get", "bandwidthGbps"], 10],
    100,
    4,
    40,
    3,
    10,
    2,
    1
  ];
}
function paintNodeBy(mode) {
  switch (mode) {
    case "type":
      return paintNodeByType();
    case "gpuUtil":
      return paintNodeByGpuUtil();
    case "status":
      return paintNodeByStatus();
    default:
      return paintNodeByType();
  }
}
function paintLinkBy(mode) {
  switch (mode) {
    case "type":
      return paintLinkByType();
    case "utilization":
      return paintLinkByUtilization();
    default:
      return paintLinkByUtilization();
  }
}
function legendByNodeType() {
  return {
    title: "节点类型",
    items: Object.keys(NODE_TYPE_COLORS).map((k) => ({
      label: NODE_TYPE_LABELS[k],
      color: NODE_TYPE_COLORS[k],
      shape: "circle"
    }))
  };
}
function legendByGpuUtil() {
  return {
    title: "GPU 利用率",
    items: [
      { label: "<30% 空闲", color: "#4ade80" },
      { label: "30-60% 低负载", color: "#22d3ee" },
      { label: "60-80% 中负载", color: "#fbbf24" },
      { label: "80-95% 高负载", color: "#f59e0b" },
      { label: ">95% 满载", color: "#ef4444" }
    ]
  };
}
function legendByNodeStatus() {
  return {
    title: "节点状态",
    items: Object.keys(NODE_STATUS_COLORS).map((k) => ({
      label: NODE_STATUS_LABELS[k],
      color: NODE_STATUS_COLORS[k],
      shape: "circle"
    }))
  };
}
function buildComputeLegend(mode) {
  switch (mode) {
    case "type":
      return legendByNodeType();
    case "gpuUtil":
      return legendByGpuUtil();
    case "status":
      return legendByNodeStatus();
    default:
      return legendByNodeType();
  }
}
var ComputeNodes = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "nodeColorBy");
    __publicField(this, "layerPrefix");
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.nodeColorBy = options.nodeColorBy ?? "type";
    this.layerPrefix = options.layerPrefix ?? "cg-compute";
  }
  /** 渲染节点 + 链路 */
  render() {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n]));
    const linkGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.links.flatMap((l) => {
        var _a, _b, _c, _d;
        const from = nodeById.get(l.fromNode);
        const to = nodeById.get(l.toNode);
        if (!from || !to) return [];
        const coords = l.geometry && l.geometry.length >= 2 ? l.geometry : [
          [from.lng, from.lat],
          [to.lng, to.lat]
        ];
        return [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {
              linkId: l.id,
              type: ((_a = l.properties) == null ? void 0 : _a.type) ?? "fiber",
              utilization: ((_b = l.properties) == null ? void 0 : _b.utilization) ?? 0,
              bandwidthGbps: ((_c = l.properties) == null ? void 0 : _c.bandwidthGbps) ?? 10,
              latencyMs: ((_d = l.properties) == null ? void 0 : _d.latencyMs) ?? 0
            }
          }
        ];
      })
    };
    const nodeGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.nodes.map((n) => {
        var _a, _b;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [n.lng, n.lat] },
          properties: {
            nodeId: n.id,
            type: n.type,
            status: ((_a = n.properties) == null ? void 0 : _a.status) ?? "online",
            gpuUtilization: ((_b = n.properties) == null ? void 0 : _b.gpuUtilization) ?? 0,
            name: n.name ?? ""
          }
        };
      })
    };
    mlMap.addSource(`${prefix}-links-src`, linkGeoJSON);
    mlMap.addSource(`${prefix}-nodes-src`, nodeGeoJSON);
    mlMap.addLayer({
      id: `${prefix}-links-line`,
      type: "line",
      source: `${prefix}-links-src`,
      paint: {
        "line-color": paintLinkBy("utilization"),
        "line-width": paintLinkWidthByBandwidth(),
        "line-opacity": 0.7
      }
    });
    this.layerIds.push(`${prefix}-links-line`);
    mlMap.addLayer({
      id: `${prefix}-nodes-pt`,
      type: "circle",
      source: `${prefix}-nodes-src`,
      paint: {
        "circle-radius": 7,
        "circle-color": paintNodeBy(this.nodeColorBy),
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff"
      }
    });
    this.layerIds.push(`${prefix}-nodes-pt`);
  }
  /** 切换节点着色模式 */
  setNodeColorBy(mode) {
    this.nodeColorBy = mode;
    const mlMap = this.map.instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-nodes-pt`,
          "circle-color",
          paintNodeBy(mode)
        );
      } catch {
      }
    }
  }
  /** 按区域/类型筛选（C-4） */
  filter(options) {
    const nodes2 = this.dataset.nodes.filter((n) => {
      var _a;
      if (options.region && ((_a = n.properties) == null ? void 0 : _a.region) !== options.region) return false;
      if (options.type && n.type !== options.type) return false;
      return true;
    });
    const nodeIds = new Set(nodes2.map((n) => n.id));
    const links = this.dataset.links.filter(
      (l) => nodeIds.has(l.fromNode) && nodeIds.has(l.toNode)
    );
    return { nodes: nodes2, links };
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
const __pageData = JSON.parse('{"title":"C1 算力节点地图","description":"","frontmatter":{"title":"C1 算力节点地图"},"headers":[],"relativePath":"compute/nodes.md","filePath":"compute/nodes.md"}');
const __default__ = { name: "compute/nodes.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const nodes2 = ref(null);
    const colorMode = ref("gpuUtil");
    const modes = [
      { value: "type", label: "按节点类型" },
      { value: "gpuUtil", label: "按 GPU 利用率" },
      { value: "status", label: "按状态" }
    ];
    const stats = ref({ nodes: wuhanCompute.nodes.length, links: wuhanCompute.links.length });
    const legend = computed(() => buildComputeLegend(colorMode.value));
    function switchColor(mode) {
      var _a;
      colorMode.value = mode;
      (_a = nodes2.value) == null ? void 0 : _a.setNodeColorBy(mode);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11 });
      m.on("load", () => {
        map.value = m;
        const c = new ComputeNodes({ map: m, dataset: wuhanCompute, nodeColorBy: colorMode.value, layerPrefix: "cg-compute" });
        c.render();
        nodes2.value = c;
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = nodes2.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-1d8b526f>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "C1 · 算力节点地图",
        subtitle: "caoguo-compute：节点按类型/GPU 利用率/状态着色 + 光缆按带宽/利用率可视化。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="compute-map" data-v-1d8b526f${_scopeId}></div><div class="stats-tag" data-v-1d8b526f${_scopeId}>${ssrInterpolate(stats.value.nodes)} 节点 · ${ssrInterpolate(stats.value.links)} 光缆 </div>`);
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "compute-map"
              }, null, 512),
              createVNode("div", { class: "stats-tag" }, toDisplayString(stats.value.nodes) + " 节点 · " + toDisplayString(stats.value.links) + " 光缆 ", 1)
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
                  _push3(`<div class="cg-tabs" data-v-1d8b526f${_scopeId2}><!--[-->`);
                  ssrRenderList(modes, (m) => {
                    _push3(`<button class="${ssrRenderClass([{ active: colorMode.value === m.value }, "cg-tab"])}" data-v-1d8b526f${_scopeId2}>${ssrInterpolate(m.label)}</button>`);
                  });
                  _push3(`<!--]--></div><div class="cg-legend" data-v-1d8b526f${_scopeId2}><h4 data-v-1d8b526f${_scopeId2}>${ssrInterpolate(legend.value.title)}</h4><!--[-->`);
                  ssrRenderList(legend.value.items, (item, i) => {
                    _push3(`<div class="cg-legend-item" data-v-1d8b526f${_scopeId2}><span class="cg-legend-swatch" style="${ssrRenderStyle({ background: item.color, borderRadius: item.shape === "circle" ? "50%" : "2px", width: item.shape === "circle" ? "10px" : "28px", height: item.shape === "circle" ? "10px" : "8px" })}" data-v-1d8b526f${_scopeId2}></span><span class="cg-legend-label" data-v-1d8b526f${_scopeId2}>${ssrInterpolate(item.label)}</span></div>`);
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
                            style: { background: item.color, borderRadius: item.shape === "circle" ? "50%" : "2px", width: item.shape === "circle" ? "10px" : "28px", height: item.shape === "circle" ? "10px" : "8px" }
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
                          style: { background: item.color, borderRadius: item.shape === "circle" ? "50%" : "2px", width: item.shape === "circle" ? "10px" : "28px", height: item.shape === "circle" ? "10px" : "8px" }
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("compute/nodes.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const nodes = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1d8b526f"]]);
export {
  __pageData,
  nodes as default
};
