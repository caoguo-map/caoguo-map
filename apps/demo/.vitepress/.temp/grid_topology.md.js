var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderStyle } from "vue/server-renderer";
import { M as Map, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { d as deviceById, b as buildGridAdjacency, g as gridBfs } from "./chunk-IAZ7JS7O.DHUKu9cC.js";
import { w as wuhanGrid } from "./wuhan-grid.rktezxTU.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var VOLTAGE_COLORS = {
  "1000": "#ef4444",
  // 特高压 红
  "500": "#f59e0b",
  // 超高压 橙
  "220": "#3b82f6",
  // 高压 蓝
  "110": "#60a5fa",
  // 高压 浅蓝
  "35": "#4ade80",
  // 中压 绿
  "10": "#a3e635",
  // 低压 黄绿
  "0.4": "#a3e635"
  // 用户 黄绿
};
var VOLTAGE_LABELS = {
  "1000": "特高压 1000kV",
  "500": "超高压 500kV",
  "220": "高压 220kV",
  "110": "高压 110kV",
  "35": "中压 35kV",
  "10": "配电 10kV",
  "0.4": "低压 0.4kV"
};
var GRID_STATUS_COLORS = {
  running: "#4ade80",
  // 运行中 绿
  standby: "#fbbf24",
  // 备用 黄
  fault: "#ef4444",
  // 故障 红（+脉冲）
  maintenance: "#8b5cf6"
  // 检修 紫
};
var GRID_STATUS_LABELS = {
  running: "运行中",
  standby: "备用",
  fault: "故障",
  maintenance: "检修"
};
function paintByVoltage() {
  return [
    "match",
    ["coalesce", ["get", "voltage"], "10"],
    ...Object.entries(VOLTAGE_COLORS).flatMap(([k, v]) => [k, v]),
    "#9ca3af"
  ];
}
function paintByStatus() {
  return [
    "match",
    ["coalesce", ["get", "status"], "running"],
    ...Object.entries(GRID_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintByLoad() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "loadRate"], 0],
    0,
    "#22c55e",
    // 轻载 深绿
    0.4,
    "#4ade80",
    // 正常 绿
    0.6,
    "#fbbf24",
    // 偏高 黄
    0.8,
    "#ef4444",
    // 过载 红
    1,
    "#dc2626"
    // 严重过载 深红
  ];
}
function paintByYear() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "commissionYear"], 2020],
    1980,
    "#ef4444",
    // 老设备 红
    2e3,
    "#fbbf24",
    // 较老 黄
    2015,
    "#3b82f6",
    // 较新 蓝
    2025,
    "#22c55e"
    // 新设备 绿
  ];
}
function paintBy(mode) {
  switch (mode) {
    case "voltage":
      return paintByVoltage();
    case "status":
      return paintByStatus();
    case "load":
      return paintByLoad();
    case "year":
      return paintByYear();
    case "uniform":
    default:
      return "#60a5fa";
  }
}
function paintLineWidthByVoltage(minWidth = 1.5, maxWidth = 6) {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "voltage"], "10"],
    10,
    minWidth,
    1e3,
    maxWidth
  ];
}
function buildGridLegend(mode) {
  switch (mode) {
    case "voltage":
      return {
        title: "电压等级",
        items: Object.entries(VOLTAGE_COLORS).map(([k, color]) => ({
          color,
          label: VOLTAGE_LABELS[k]
        }))
      };
    case "status":
      return {
        title: "运行状态",
        items: Object.entries(GRID_STATUS_COLORS).map(([k, color]) => ({
          color,
          label: GRID_STATUS_LABELS[k]
        }))
      };
    case "load":
      return {
        title: "负载率",
        items: [
          { color: "#22c55e", label: "轻载 <40%" },
          { color: "#4ade80", label: "正常 40-60%" },
          { color: "#fbbf24", label: "偏高 60-80%" },
          { color: "#ef4444", label: "过载 ≥80%" }
        ]
      };
    case "year":
      return {
        title: "投运年份",
        items: [
          { color: "#ef4444", label: "1980 前" },
          { color: "#fbbf24", label: "1980-2000" },
          { color: "#3b82f6", label: "2000-2015" },
          { color: "#22c55e", label: "2015 后" }
        ]
      };
    case "uniform":
    default:
      return { title: "单色", items: [{ color: "#60a5fa", label: "全部" }] };
  }
}
var DEVICE_LEVEL = {
  plant: "L1",
  tower: "L2",
  substation: "L3",
  transformer: "L4",
  user: "L5"
};
var GridTopology = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "colorBy");
    __publicField(this, "layerPrefix");
    __publicField(this, "currentLevel", null);
    __publicField(this, "layerIds", []);
    __publicField(this, "deviceListeners", /* @__PURE__ */ new Set());
    __publicField(this, "lineListeners", /* @__PURE__ */ new Set());
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? "voltage";
    this.layerPrefix = options.layerPrefix ?? "cg-grid-topo";
  }
  /** 渲染设备 + 线路到地图 */
  render() {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const devices = this.visibleDevices();
    const lines = this.visibleLines();
    const lineGeoJSON = {
      type: "FeatureCollection",
      features: lines.flatMap((l) => {
        var _a, _b, _c, _d;
        const from = deviceById(this.dataset, l.fromDevice);
        const to = deviceById(this.dataset, l.toDevice);
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
              lineId: l.id,
              voltage: ((_a = l.properties) == null ? void 0 : _a.voltage) ?? "10",
              status: ((_b = l.properties) == null ? void 0 : _b.status) ?? "running",
              loadRate: ((_c = l.properties) == null ? void 0 : _c.loadRate) ?? 0,
              commissionYear: ((_d = l.properties) == null ? void 0 : _d.commissionYear) ?? 2020
            }
          }
        ];
      })
    };
    const deviceGeoJSON = {
      type: "FeatureCollection",
      features: devices.map((d) => {
        var _a, _b, _c, _d;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [d.lng, d.lat] },
          properties: {
            deviceId: d.id,
            kind: d.kind,
            voltage: ((_a = d.properties) == null ? void 0 : _a.voltage) ?? "10",
            status: ((_b = d.properties) == null ? void 0 : _b.status) ?? "running",
            loadRate: ((_c = d.properties) == null ? void 0 : _c.loadRate) ?? 0,
            commissionYear: ((_d = d.properties) == null ? void 0 : _d.commissionYear) ?? 2020
          }
        };
      })
    };
    mlMap.addSource(`${prefix}-lines-src`, lineGeoJSON);
    mlMap.addSource(`${prefix}-devices-src`, deviceGeoJSON);
    mlMap.addLayer({
      id: `${prefix}-lines`,
      type: "line",
      source: `${prefix}-lines-src`,
      paint: {
        "line-color": paintBy(this.colorBy),
        "line-width": paintLineWidthByVoltage(),
        "line-opacity": 0.9
      }
    });
    mlMap.addLayer({
      id: `${prefix}-devices`,
      type: "circle",
      source: `${prefix}-devices-src`,
      paint: {
        "circle-radius": 5,
        "circle-color": paintBy(this.colorBy),
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff"
      }
    });
    this.layerIds.push(`${prefix}-lines`, `${prefix}-devices`);
  }
  /** 切换着色模式 */
  setColorBy(mode) {
    this.colorBy = mode;
    const mlMap = this.map.instance;
    try {
      mlMap.setPaintProperty(`${this.layerPrefix}-lines`, "line-color", paintBy(mode));
      mlMap.setPaintProperty(`${this.layerPrefix}-devices`, "circle-color", paintBy(mode));
    } catch {
    }
  }
  /** 5 级钻取：设置当前展示层级（null = 全部） */
  setLevel(level) {
    this.currentLevel = level;
    this.render();
  }
  /**
   * 供电路径追踪（PRD G-3）：
   * 从任一用户反向追踪到发电侧（upstream BFS），返回路径上的设备/线路 id 集合
   */
  traceSupply(deviceId) {
    const adj = buildGridAdjacency(this.dataset);
    const reached = gridBfs(adj, this.dataset, deviceId, "upstream");
    const lineIds = /* @__PURE__ */ new Set();
    for (const l of this.dataset.lines) {
      if (reached.has(l.fromDevice) && reached.has(l.toDevice)) lineIds.add(l.id);
    }
    return { deviceIds: reached, lineIds };
  }
  /** 清空所有图层 */
  clear() {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
  destroy() {
    this.clear();
    this.deviceListeners.clear();
    this.lineListeners.clear();
  }
  onDeviceSelect(fn) {
    this.deviceListeners.add(fn);
    return () => this.deviceListeners.delete(fn);
  }
  onLineSelect(fn) {
    this.lineListeners.add(fn);
    return () => this.lineListeners.delete(fn);
  }
  visibleDevices() {
    if (!this.currentLevel) return this.dataset.devices;
    return this.dataset.devices.filter((d) => {
      const lv = d.level ?? DEVICE_LEVEL[d.kind];
      return lv === this.currentLevel;
    });
  }
  visibleLines() {
    if (!this.currentLevel) return this.dataset.lines;
    return this.dataset.lines.filter((l) => {
      const from = deviceById(this.dataset, l.fromDevice);
      const to = deviceById(this.dataset, l.toDevice);
      if (!from || !to) return false;
      const lv1 = from.level ?? DEVICE_LEVEL[from.kind];
      const lv2 = to.level ?? DEVICE_LEVEL[to.kind];
      return lv1 === this.currentLevel || lv2 === this.currentLevel;
    });
  }
};
const __pageData = JSON.parse('{"title":"G1 电网拓扑浏览器","description":"","frontmatter":{"title":"G1 电网拓扑浏览器"},"headers":[],"relativePath":"grid/topology.md","filePath":"grid/topology.md"}');
const __default__ = { name: "grid/topology.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const topo = ref(null);
    const colorMode = ref("voltage");
    const modes = [
      { value: "voltage", label: "按电压等级" },
      { value: "status", label: "按运行状态" },
      { value: "load", label: "按负载率" },
      { value: "year", label: "按投运年份" }
    ];
    ref(null);
    ref(null);
    const traceResult = ref(null);
    const legend = computed(() => buildGridLegend(colorMode.value));
    function switchColor(mode) {
      var _a;
      colorMode.value = mode;
      (_a = topo.value) == null ? void 0 : _a.setColorBy(mode);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.2 });
      m.on("load", () => {
        map.value = m;
        const t = new GridTopology({ map: m, dataset: wuhanGrid, colorBy: colorMode.value, layerPrefix: "cg-grid-topo" });
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
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-3b267b8a>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "G1 · 电网拓扑浏览器",
        subtitle: "caoguo-grid：5 级钻取（发电→输电→变电→配电→用户），按电压/状态/负荷/年份着色。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="grid-map" data-v-3b267b8a${_scopeId}></div>`);
            if (traceResult.value) {
              _push2(`<div class="trace-tag" data-v-3b267b8a${_scopeId}> 供电路径：${ssrInterpolate(traceResult.value.deviceIds.size)} 设备 · ${ssrInterpolate(traceResult.value.lineIds.size)} 线路 </div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "grid-map"
              }, null, 512),
              traceResult.value ? (openBlock(), createBlock("div", {
                key: 0,
                class: "trace-tag"
              }, " 供电路径：" + toDisplayString(traceResult.value.deviceIds.size) + " 设备 · " + toDisplayString(traceResult.value.lineIds.size) + " 线路 ", 1)) : createCommentVNode("", true)
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
                  _push3(`<div class="cg-tabs" data-v-3b267b8a${_scopeId2}><!--[-->`);
                  ssrRenderList(modes, (m) => {
                    _push3(`<button class="${ssrRenderClass([{ active: colorMode.value === m.value }, "cg-tab"])}" data-v-3b267b8a${_scopeId2}>${ssrInterpolate(m.label)}</button>`);
                  });
                  _push3(`<!--]--></div><div class="cg-legend" data-v-3b267b8a${_scopeId2}><h4 data-v-3b267b8a${_scopeId2}>${ssrInterpolate(legend.value.title)}</h4><!--[-->`);
                  ssrRenderList(legend.value.items, (item, i) => {
                    _push3(`<div class="cg-legend-item" data-v-3b267b8a${_scopeId2}><span class="cg-legend-swatch" style="${ssrRenderStyle({ background: item.color })}" data-v-3b267b8a${_scopeId2}></span><span class="cg-legend-label" data-v-3b267b8a${_scopeId2}>${ssrInterpolate(item.label)}</span></div>`);
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
            _push2(`<pre data-v-3b267b8a${_scopeId}><code data-v-3b267b8a${_scopeId}>&lt;SimPanel title=&quot;层级钻取&quot; hint=&quot;5 级&quot;&gt;
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

&lt;SimPanel title=&quot;供电路径追踪&quot; hint=&quot;反向 BFS 到发电侧&quot;&gt;
  &lt;p class=&quot;cg-hint&quot;&gt;选择一个设备，反向追踪到发电侧的完整供电路径&lt;/p&gt;
  &lt;select v-model=&quot;traceId&quot; class=&quot;cg-select&quot; @change=&quot;runTrace(traceId)&quot;&gt;
    &lt;option :value=&quot;null&quot;&gt;— 取消追踪 —&lt;/option&gt;
    &lt;option v-for=&quot;id in gridDeviceIds&quot; :key=&quot;id&quot; :value=&quot;id&quot;&gt;${ssrInterpolate(_ctx.id)}&lt;/option&gt;
  &lt;/select&gt;
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
                createVNode("code", null, '<SimPanel title="层级钻取" hint="5 级">\n  <div class="cg-tabs">\n    <button\n      v-for="l in levels"\n      :key="String(l.value)"\n      class="cg-tab"\n      :class="{ active: currentLevel === l.value }"\n      @click="switchLevel(l.value)"\n    >\n      ' + toDisplayString(_ctx.l.label) + '\n    </button>\n  </div>\n</SimPanel>\n\n<SimPanel title="供电路径追踪" hint="反向 BFS 到发电侧">\n  <p class="cg-hint">选择一个设备，反向追踪到发电侧的完整供电路径</p>\n  <select v-model="traceId" class="cg-select" @change="runTrace(traceId)">\n    <option :value="null">— 取消追踪 —</option>\n    <option v-for="id in gridDeviceIds" :key="id" :value="id">' + toDisplayString(_ctx.id) + "</option>\n  </select>\n</SimPanel>\n", 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("grid/topology.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const topology = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3b267b8a"]]);
export {
  __pageData,
  topology as default
};
