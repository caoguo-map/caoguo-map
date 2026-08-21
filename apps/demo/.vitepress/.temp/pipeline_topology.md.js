var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, unref, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, withDirectives, vModelSelect, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderStyle, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanPipeline, p as pipeIds } from "./wuhan-pipeline.Dx5TNthR.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var PIPELINE_TYPE_COLORS = {
  gas: "#f59e0b",
  // 琥珀（燃气）
  water: "#3b82f6",
  // 蓝（供水）
  drainage: "#6b7280",
  // 灰（排水）
  heating: "#ef4444",
  // 红（供热）
  power: "#8b5cf6",
  // 紫（电力管沟）
  telecom: "#10b981"
  // 绿（通信管沟）
};
var PIPELINE_TYPE_LABELS = {
  gas: "燃气管",
  water: "供水管",
  drainage: "排水管",
  heating: "供热管",
  power: "电力管沟",
  telecom: "通信管沟"
};
var PIPE_STATUS_COLORS = {
  normal: "#4ade80",
  // 绿
  aging: "#fbbf24",
  // 黄
  damaged: "#ef4444",
  // 红
  under_repair: "#8b5cf6",
  // 紫
  abandoned: "#4b5563",
  // 深灰
  unknown: "#6b7280"
  // 灰
};
var PIPE_STATUS_META = {
  normal: { label: "正常", animation: "none" },
  aging: { label: "老化", animation: "none" },
  damaged: { label: "损坏", animation: "pulse" },
  under_repair: { label: "维修中", animation: "dashed" },
  abandoned: { label: "废弃", animation: "none" },
  unknown: { label: "未知", animation: "none" }
};
var PIPE_MATERIAL_COLORS = {
  cast_iron: "#94a3b8",
  // 蓝灰（旧铸铁）
  ductile_iron: "#0ea5e9",
  // 天蓝（球墨铸铁）
  steel: "#64748b",
  // 钢蓝
  pe: "#22c55e",
  // 绿（PE 现代管材）
  pvc: "#a78bfa",
  // 紫（PVC）
  concrete: "#a8a29e",
  // 米灰（混凝土）
  hdpe: "#16a34a",
  // 深绿（HDPE）
  copper: "#d97706",
  // 橙（铜）
  unknown: "#6b7280"
};
var HEALTH_LEVEL_COLORS = {
  excellent: "#22c55e",
  // 绿 80-100
  good: "#3b82f6",
  // 蓝 60-80
  fair: "#eab308",
  // 黄 40-60
  poor: "#f97316",
  // 橙 20-40
  critical: "#ef4444"
  // 红 0-20
};
var HEALTH_LEVEL_LABELS = {
  excellent: "优",
  good: "良",
  fair: "中",
  poor: "差",
  critical: "危"
};
function paintPipeByType(types) {
  if (!types || types.length === 0) {
    return [
      "match",
      ["get", "pipelineType"],
      ...Object.entries(PIPELINE_TYPE_COLORS).flatMap(([k, v]) => [k, v]),
      "#94a3b8"
    ];
  }
  return [
    "match",
    ["get", "pipelineType"],
    ...types.flatMap((t) => [t, PIPELINE_TYPE_COLORS[t]]),
    "#94a3b8"
  ];
}
function paintPipeByDiameter() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "diameter"], 0],
    0,
    "#4ade80",
    // 极细管  绿
    50,
    "#4ade80",
    // DN50 以下  绿（支管）
    150,
    "#60a5fa",
    // DN150 蓝（配水管）
    300,
    "#f59e0b",
    // DN300 黄（干管）
    600,
    "#ef4444",
    // DN600+ 红（主管）
    1500,
    "#7f1d1d"
    // 极大管  深红
  ];
}
function paintPipeByStatus() {
  return [
    "match",
    ["coalesce", ["get", "status"], "unknown"],
    ...Object.entries(PIPE_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintPipeByMaterial() {
  return [
    "match",
    ["coalesce", ["get", "material"], "unknown"],
    ...Object.entries(PIPE_MATERIAL_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintPipeByHealth() {
  return [
    "step",
    ["coalesce", ["get", "healthScore"], 100],
    HEALTH_LEVEL_COLORS.critical,
    // <20
    20,
    HEALTH_LEVEL_COLORS.poor,
    40,
    HEALTH_LEVEL_COLORS.fair,
    60,
    HEALTH_LEVEL_COLORS.good,
    80,
    HEALTH_LEVEL_COLORS.excellent
  ];
}
function paintPipeBy(mode, opts) {
  switch (mode) {
    case "type":
      return paintPipeByType(opts == null ? void 0 : opts.types);
    case "diameter":
      return paintPipeByDiameter();
    case "status":
      return paintPipeByStatus();
    case "material":
      return paintPipeByMaterial();
    case "health":
      return paintPipeByHealth();
    case "uniform":
    default:
      return "#60a5fa";
  }
}
function legendByType() {
  return {
    title: "管线类型",
    items: Object.keys(PIPELINE_TYPE_COLORS).map((k) => ({
      label: PIPELINE_TYPE_LABELS[k],
      color: PIPELINE_TYPE_COLORS[k]
    }))
  };
}
function legendByDiameter() {
  return {
    title: "管径（mm）",
    items: [
      { label: "≤50  支管", color: "#4ade80" },
      { label: "50-150  配水/配气", color: "#60a5fa" },
      { label: "150-300  干管", color: "#f59e0b" },
      { label: "300-600  主管", color: "#ef4444" },
      { label: "≥600  主干", color: "#7f1d1d" }
    ]
  };
}
function legendByStatus() {
  return {
    title: "管段状态",
    items: Object.keys(PIPE_STATUS_COLORS).map(
      (k) => {
        const meta = PIPE_STATUS_META[k];
        return {
          label: meta.label,
          color: PIPE_STATUS_COLORS[k],
          style: meta.animation === "dashed" ? "dashed" : "solid"
        };
      }
    )
  };
}
function legendByMaterial() {
  return {
    title: "管材",
    items: Object.entries(PIPE_MATERIAL_COLORS).map(([k, v]) => ({
      label: materialLabel(k),
      color: v
    }))
  };
}
function legendByHealth() {
  return {
    title: "健康等级",
    items: Object.entries(HEALTH_LEVEL_COLORS).map(([k, v]) => ({
      label: `${HEALTH_LEVEL_LABELS[k]}（${healthRangeLabel(k)}）`,
      color: v
    }))
  };
}
function materialLabel(k) {
  const map = {
    cast_iron: "铸铁",
    ductile_iron: "球墨铸铁",
    steel: "钢",
    pe: "PE",
    pvc: "PVC",
    concrete: "混凝土",
    hdpe: "HDPE",
    copper: "铜",
    unknown: "未知"
  };
  return map[k] ?? k;
}
function healthRangeLabel(k) {
  const map = {
    excellent: "80-100",
    good: "60-80",
    fair: "40-60",
    poor: "20-40",
    critical: "0-20"
  };
  return map[k] ?? "";
}
function buildLegend(mode) {
  switch (mode) {
    case "type":
      return legendByType();
    case "diameter":
      return legendByDiameter();
    case "status":
      return legendByStatus();
    case "material":
      return legendByMaterial();
    case "health":
      return legendByHealth();
    default:
      return legendByType();
  }
}
var PipelineTopology = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "colorBy");
    __publicField(this, "layerPrefix");
    __publicField(this, "pipelineTypes");
    __publicField(this, "layerIds", []);
    __publicField(this, "nodeListeners", /* @__PURE__ */ new Set());
    __publicField(this, "pipeListeners", /* @__PURE__ */ new Set());
    __publicField(this, "drillListeners", /* @__PURE__ */ new Set());
    /** 当前钻取区域（null = 全量） */
    __publicField(this, "currentRegion", null);
    /** 当前分层过滤器 */
    __publicField(this, "layerFilter", null);
    /** click 事件是否已绑定 */
    __publicField(this, "clickBound", false);
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? "type";
    this.pipelineTypes = options.pipelineTypes;
    this.layerPrefix = options.layerPrefix ?? "cg-topo";
  }
  /** 渲染管段+节点到地图 */
  render() {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const pipeGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.pipes.filter((p) => this.isPipeVisible(p)).flatMap((p) => {
        var _a, _b, _c;
        const from = this.dataset.nodes.find((n) => n.id === p.fromNode);
        const to = this.dataset.nodes.find((n) => n.id === p.toNode);
        if (!from || !to) return [];
        const coords = p.geometry && p.geometry.length >= 2 ? p.geometry : [
          [from.lng, from.lat],
          [to.lng, to.lat]
        ];
        return [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {
              pipeId: p.id,
              pipelineType: p.pipelineType ?? "",
              diameter: ((_a = p.properties) == null ? void 0 : _a.diameter) ?? 0,
              status: ((_b = p.properties) == null ? void 0 : _b.status) ?? "unknown",
              material: ((_c = p.properties) == null ? void 0 : _c.material) ?? "unknown"
            }
          }
        ];
      })
    };
    const nodeGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.nodes.filter((n) => this.isNodeVisible(n)).map((n) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [n.lng, n.lat] },
        properties: { nodeId: n.id, kind: n.kind, pipelineType: n.pipelineType ?? "" }
      }))
    };
    mlMap.addSource(`${prefix}-pipes-src`, pipeGeoJSON);
    mlMap.addSource(`${prefix}-nodes-src`, nodeGeoJSON);
    mlMap.addLayer({
      id: `${prefix}-pipes-line`,
      type: "line",
      source: `${prefix}-pipes-src`,
      paint: {
        "line-color": paintPipeBy(this.colorBy, { types: this.pipelineTypes }),
        "line-width": 2,
        "line-opacity": 0.85
      }
    });
    mlMap.addLayer({
      id: `${prefix}-nodes-pt`,
      type: "circle",
      source: `${prefix}-nodes-src`,
      paint: {
        "circle-radius": 4,
        "circle-color": "#f59e0b",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff"
      }
    });
    this.layerIds.push(`${prefix}-pipes-line`, `${prefix}-nodes-pt`);
    this.bindClickEvents(mlMap, prefix);
  }
  /**
   * 绑定点击事件（设备卡片：点击节点/管段触发订阅回调）。
   * 只绑定一次（render 重建图层后事件仍指向固定 layerId）。
   */
  bindClickEvents(mlMap, prefix) {
    if (this.clickBound) return;
    this.clickBound = true;
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n]));
    const pipeById = new Map(this.dataset.pipes.map((p) => [p.id, p]));
    mlMap.on("click", `${prefix}-pipes-line`, (e) => {
      var _a;
      const features = e.features ?? [];
      const f = features[0];
      const pipe = ((_a = f == null ? void 0 : f.properties) == null ? void 0 : _a.pipeId) ? pipeById.get(f.properties.pipeId) : void 0;
      if (pipe) {
        for (const l of this.pipeListeners) l({ pipe });
      }
    });
    mlMap.on("click", `${prefix}-nodes-pt`, (e) => {
      var _a;
      const features = e.features ?? [];
      const f = features[0];
      const node = ((_a = f == null ? void 0 : f.properties) == null ? void 0 : _a.nodeId) ? nodeById.get(f.properties.nodeId) : void 0;
      if (node) {
        for (const l of this.nodeListeners) l({ node });
      }
    });
  }
  /** 切换着色模式 */
  setColorBy(mode) {
    this.colorBy = mode;
    const mlMap = this.map.instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-pipes-line`,
          "line-color",
          paintPipeBy(mode, { types: this.pipelineTypes })
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
    this.nodeListeners.clear();
    this.pipeListeners.clear();
    this.drillListeners.clear();
  }
  /** 订阅节点点击事件 */
  onNodeSelect(fn) {
    this.nodeListeners.add(fn);
    return () => this.nodeListeners.delete(fn);
  }
  /** 订阅管段点击事件 */
  onPipeSelect(fn) {
    this.pipeListeners.add(fn);
    return () => this.pipeListeners.delete(fn);
  }
  /** 订阅钻取事件 */
  onDrillDown(fn) {
    this.drillListeners.add(fn);
    return () => this.drillListeners.delete(fn);
  }
  /** 管段是否可见（管线类型 + 区域钻取 + 分层过滤） */
  isPipeVisible(p) {
    var _a;
    if (((_a = this.pipelineTypes) == null ? void 0 : _a.length) && !this.pipelineTypes.includes(p.pipelineType)) {
      return false;
    }
    if (this.currentRegion && p.region !== this.currentRegion) return false;
    const f = this.layerFilter;
    if (f) {
      const props = p.properties ?? {};
      if (f.minDiameter !== void 0 && (props.diameter ?? 0) < f.minDiameter) return false;
      if (f.maxDiameter !== void 0 && (props.diameter ?? Infinity) > f.maxDiameter) return false;
      if (f.material && props.material !== f.material) return false;
      if (f.status && props.status !== f.status) return false;
      if (f.minAgeYears !== void 0 && props.installDate) {
        if (this.ageInYears(props.installDate) < f.minAgeYears) return false;
      }
    }
    return true;
  }
  /** 节点是否可见（管线类型 + 区域钻取） */
  isNodeVisible(n) {
    var _a;
    if (((_a = this.pipelineTypes) == null ? void 0 : _a.length) && !this.pipelineTypes.includes(n.pipelineType)) {
      return false;
    }
    if (this.currentRegion && n.region !== this.currentRegion) return false;
    return true;
  }
  /** 计算管段使用年限（年） */
  ageInYears(installDate) {
    const d = new Date(installDate).getTime();
    if (Number.isNaN(d)) return 0;
    return (Date.now() - d) / (365.25 * 24 * 3600 * 1e3);
  }
  /**
   * 搜索定位（按编号/地址/区域/类型）。
   * 返回匹配的节点与管段，供上层 flyTo 定位。
   */
  search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return { nodes: [], pipes: [] };
    const nodes = this.dataset.nodes.filter(
      (n) => {
        var _a;
        return n.id.toLowerCase().includes(q) || (((_a = n.properties) == null ? void 0 : _a.code) ?? "").toLowerCase().includes(q) || (n.region ?? "").toLowerCase().includes(q) || n.kind.toLowerCase().includes(q);
      }
    );
    const pipes = this.dataset.pipes.filter(
      (p) => {
        var _a;
        return p.id.toLowerCase().includes(q) || (p.region ?? "").toLowerCase().includes(q) || (((_a = p.properties) == null ? void 0 : _a.material) ?? "").toLowerCase().includes(q);
      }
    );
    return { nodes, pipes };
  }
  /** 层级钻取：下钻到指定区域（过滤渲染 + 触发事件） */
  drillDown(region) {
    const from = this.currentRegion;
    this.currentRegion = region;
    this.render();
    for (const l of this.drillListeners) l({ from, to: region });
  }
  /** 层级钻取：返回上一级（清空区域过滤） */
  drillUp() {
    const from = this.currentRegion;
    this.currentRegion = null;
    this.render();
    for (const l of this.drillListeners) l({ from, to: "" });
  }
  /** 分层控制：按管径/材质/状态/年代过滤 */
  setLayerFilter(filter) {
    this.layerFilter = filter;
    this.render();
  }
  /** 清空分层过滤器 */
  clearLayerFilter() {
    this.layerFilter = null;
    this.render();
  }
  /** 高亮连通路径（基于节点 ID） */
  highlightConnectivity(centerId) {
    const adj = /* @__PURE__ */ new Map();
    for (const p of this.dataset.pipes) {
      if (!adj.has(p.fromNode)) adj.set(p.fromNode, /* @__PURE__ */ new Set());
      if (!adj.has(p.toNode)) adj.set(p.toNode, /* @__PURE__ */ new Set());
      adj.get(p.fromNode).add(p.toNode);
      adj.get(p.toNode).add(p.fromNode);
    }
    const visited = /* @__PURE__ */ new Set();
    const stack = [centerId];
    while (stack.length > 0) {
      const cur = stack.pop();
      if (visited.has(cur)) continue;
      visited.add(cur);
      const neighbors = adj.get(cur) ?? /* @__PURE__ */ new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) stack.push(n);
      }
    }
    return visited;
  }
};
const __pageData = JSON.parse('{"title":"P1 管网拓扑可视化","description":"","frontmatter":{"title":"P1 管网拓扑可视化"},"headers":[],"relativePath":"pipeline/topology.md","filePath":"pipeline/topology.md"}');
const __default__ = { name: "pipeline/topology.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const topo = ref(null);
    const colorMode = ref("type");
    const modes = [
      { value: "type", label: "按管线大类" },
      { value: "diameter", label: "按管径" },
      { value: "status", label: "按状态" },
      { value: "material", label: "按材质" }
    ];
    const highlightPipeId = ref(null);
    const connectivityNodes = ref(/* @__PURE__ */ new Set());
    ref({ nodes: wuhanPipeline.nodes.length, pipes: wuhanPipeline.pipes.length, users: (wuhanPipeline.users ?? []).length });
    function switchColor(mode) {
      var _a;
      colorMode.value = mode;
      (_a = topo.value) == null ? void 0 : _a.setColorBy(mode);
    }
    const legend = computed(() => {
      return buildLegend(colorMode.value);
    });
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
      m.on("load", () => {
        map.value = m;
        const t = new PipelineTopology({
          map: m,
          dataset: wuhanPipeline,
          colorBy: colorMode.value,
          pipelineType: "water",
          layerPrefix: "cg-pipe-topo"
        });
        t.render();
        topo.value = t;
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = topo.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-58d325e5>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "P1 · 管网拓扑可视化",
        subtitle: "caoguo-pipeline：按类型/管径/状态/材质着色，互通共用 caoguo-dark 主题。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="pipeline-map" data-v-58d325e5${_scopeId}></div>`);
            if (connectivityNodes.value.size > 0) {
              _push2(`<div class="connectivity-tag" data-v-58d325e5${_scopeId}> 连通节点：${ssrInterpolate(connectivityNodes.value.size)}</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "pipeline-map"
              }, null, 512),
              connectivityNodes.value.size > 0 ? (openBlock(), createBlock("div", {
                key: 0,
                class: "connectivity-tag"
              }, " 连通节点：" + toDisplayString(connectivityNodes.value.size), 1)) : createCommentVNode("", true)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "视图模式",
              hint: "实时切换"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<div class="cg-tabs" data-v-58d325e5${_scopeId2}><!--[-->`);
                  ssrRenderList(modes, (m) => {
                    _push3(`<button class="${ssrRenderClass([{ active: colorMode.value === m.value }, "cg-tab"])}" data-v-58d325e5${_scopeId2}>${ssrInterpolate(m.label)}</button>`);
                  });
                  _push3(`<!--]--></div><div class="cg-legend" data-v-58d325e5${_scopeId2}><h4 data-v-58d325e5${_scopeId2}>${ssrInterpolate(legend.value.title)}</h4><!--[-->`);
                  ssrRenderList(legend.value.items, (item, i) => {
                    _push3(`<div class="cg-legend-item" data-v-58d325e5${_scopeId2}><span class="cg-legend-swatch" style="${ssrRenderStyle({ background: item.color, ...item.style === "dashed" ? { background: `repeating-linear-gradient(90deg,${item.color} 0 4px,transparent 4px 8px)` } : {} })}" data-v-58d325e5${_scopeId2}></span><span class="cg-legend-label" data-v-58d325e5${_scopeId2}>${ssrInterpolate(item.label)}</span></div>`);
                  });
                  _push3(`<!--]--></div><div class="cg-divider" data-v-58d325e5${_scopeId2}></div><h4 data-v-58d325e5${_scopeId2}>连通性高亮</h4><p class="cg-hint" data-v-58d325e5${_scopeId2}>选择一根管段，高亮其下游连通子图</p><select class="cg-select" data-v-58d325e5${_scopeId2}><option${ssrRenderAttr("value", null)} data-v-58d325e5${ssrIncludeBooleanAttr(Array.isArray(highlightPipeId.value) ? ssrLooseContain(highlightPipeId.value, null) : ssrLooseEqual(highlightPipeId.value, null)) ? " selected" : ""}${_scopeId2}>— 取消高亮 —</option><!--[-->`);
                  ssrRenderList(unref(pipeIds), (id) => {
                    _push3(`<option${ssrRenderAttr("value", id)} data-v-58d325e5${ssrIncludeBooleanAttr(Array.isArray(highlightPipeId.value) ? ssrLooseContain(highlightPipeId.value, id) : ssrLooseEqual(highlightPipeId.value, id)) ? " selected" : ""}${_scopeId2}>${ssrInterpolate(id)}</option>`);
                  });
                  _push3(`<!--]--></select>`);
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
                            style: { background: item.color, ...item.style === "dashed" ? { background: `repeating-linear-gradient(90deg,${item.color} 0 4px,transparent 4px 8px)` } : {} }
                          }, null, 4),
                          createVNode("span", { class: "cg-legend-label" }, toDisplayString(item.label), 1)
                        ]);
                      }), 128))
                    ]),
                    createVNode("div", { class: "cg-divider" }),
                    createVNode("h4", null, "连通性高亮"),
                    createVNode("p", { class: "cg-hint" }, "选择一根管段，高亮其下游连通子图"),
                    withDirectives(createVNode("select", {
                      "onUpdate:modelValue": ($event) => highlightPipeId.value = $event,
                      class: "cg-select"
                    }, [
                      createVNode("option", { value: null }, "— 取消高亮 —"),
                      (openBlock(true), createBlock(Fragment, null, renderList(unref(pipeIds), (id) => {
                        return openBlock(), createBlock("option", {
                          key: id,
                          value: id
                        }, toDisplayString(id), 9, ["value"]);
                      }), 128))
                    ], 8, ["onUpdate:modelValue"]), [
                      [vModelSelect, highlightPipeId.value]
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "视图模式",
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
                          style: { background: item.color, ...item.style === "dashed" ? { background: `repeating-linear-gradient(90deg,${item.color} 0 4px,transparent 4px 8px)` } : {} }
                        }, null, 4),
                        createVNode("span", { class: "cg-legend-label" }, toDisplayString(item.label), 1)
                      ]);
                    }), 128))
                  ]),
                  createVNode("div", { class: "cg-divider" }),
                  createVNode("h4", null, "连通性高亮"),
                  createVNode("p", { class: "cg-hint" }, "选择一根管段，高亮其下游连通子图"),
                  withDirectives(createVNode("select", {
                    "onUpdate:modelValue": ($event) => highlightPipeId.value = $event,
                    class: "cg-select"
                  }, [
                    createVNode("option", { value: null }, "— 取消高亮 —"),
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(pipeIds), (id) => {
                      return openBlock(), createBlock("option", {
                        key: id,
                        value: id
                      }, toDisplayString(id), 9, ["value"]);
                    }), 128))
                  ], 8, ["onUpdate:modelValue"]), [
                    [vModelSelect, highlightPipeId.value]
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pipeline/topology.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const topology = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-58d325e5"]]);
export {
  __pageData,
  topology as default
};
