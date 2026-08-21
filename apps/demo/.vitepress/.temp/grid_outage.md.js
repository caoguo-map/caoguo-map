var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, onMounted, onUnmounted, withCtx, unref, createVNode, withDirectives, openBlock, createBlock, Fragment, renderList, toDisplayString, vModelSelect, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderClass, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrInterpolate } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { b as buildGridAdjacency, g as gridBfs } from "./chunk-IAZ7JS7O.DHUKu9cC.js";
import { w as wuhanGrid, g as gridDeviceIds, a as gridLineIds } from "./wuhan-grid.rktezxTU.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
function analyzeOutage(dataset, faultId, opts = {}) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const maxDepth = opts.maxDepth ?? 1e3;
  const device = dataset.devices.find((d) => d.id === faultId);
  const line = dataset.lines.find((l) => l.id === faultId);
  if (!device && !line) {
    throw new Error(`OutageAnalyzer: '${faultId}' not found in dataset`);
  }
  const faultDevice = device ?? line;
  const adj = buildGridAdjacency(dataset);
  let startId = faultId;
  let direction = "both";
  if (device) {
    startId = device.id;
    direction = "downstream";
  } else if (line) {
    startId = line.toDevice;
    direction = "downstream";
  }
  let affectedSet;
  if (device) {
    affectedSet = gridBfs(adj, dataset, startId, direction, maxDepth);
  } else {
    affectedSet = gridBfs(adj, dataset, startId, direction, maxDepth);
    affectedSet.add(line.fromDevice);
  }
  const deviceByIdMap = new Map(dataset.devices.map((d) => [d.id, d]));
  const affectedDevices = [];
  for (const id of affectedSet) {
    const d = deviceByIdMap.get(id);
    if (d) affectedDevices.push(d);
  }
  const affectedLines = dataset.lines.filter(
    (l) => affectedSet.has(l.fromDevice) || affectedSet.has(l.toDevice)
  );
  const users = dataset.users ?? [];
  const affectedUsersList = users.filter((u) => u.deviceId && affectedSet.has(u.deviceId));
  const affectedUsers = {
    total: affectedUsersList.length,
    residential: affectedUsersList.filter((u) => u.kind === "residential").length,
    commercial: affectedUsersList.filter((u) => u.kind === "commercial").length,
    industrial: affectedUsersList.filter((u) => u.kind === "industrial").length,
    important: affectedUsersList.filter((u) => u.kind === "important")
  };
  const restoration = buildRestoration(dataset, adj, affectedSet, affectedUsers.total);
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return {
    faultDevice,
    affectedDevices,
    affectedLines,
    affectedUsers,
    restoration,
    durationMs
  };
}
function buildRestoration(dataset, adj, affectedSet, userCount) {
  const plants = dataset.devices.filter((d) => d.kind === "plant");
  const alternativePaths = [];
  for (const plant of plants) {
    if (affectedSet.has(plant.id)) continue;
    const reachable = gridBfs(adj, dataset, plant.id, "both", 50);
    for (const affectedId of affectedSet) {
      if (reachable.has(affectedId)) {
        alternativePaths.push([plant.id, affectedId]);
        break;
      }
    }
    if (alternativePaths.length > 0) break;
  }
  const steps = [];
  steps.push("隔离故障设备");
  steps.push("启动备用电源切换");
  if (alternativePaths.length > 0) {
    steps.push("通过备用线路恢复供电");
  } else {
    steps.push("抢修故障设备后恢复");
  }
  const baseHours = userCount / 300;
  const hours = Math.max(0.5, Math.min(6, baseHours));
  const estimatedTime = hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}min`;
  return { estimatedTime, alternativePaths, steps };
}
function convexHull(points) {
  if (points.length < 3) return [...points];
  const pts = [...points];
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
function centroid(points) {
  if (points.length === 0) return [0, 0];
  const sum = points.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
    [0, 0]
  );
  return [sum[0] / points.length, sum[1] / points.length];
}
var OutageAnalyzer = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "layerPrefix");
    __publicField(this, "affectedFillPaint");
    __publicField(this, "affectedLinePaint");
    __publicField(this, "importantUserPaint");
    __publicField(this, "layerIds", []);
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "lastResult", null);
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? "cg-outage";
    this.affectedFillPaint = options.affectedFillPaint ?? {
      "fill-color": "#ef4444",
      "fill-opacity": 0.15,
      "fill-outline-color": "#ef4444"
    };
    this.affectedLinePaint = options.affectedLinePaint ?? {
      "line-color": "#ef4444",
      "line-width": 3,
      "line-opacity": 0.85
    };
    this.importantUserPaint = options.importantUserPaint ?? {
      "circle-radius": 8,
      "circle-color": "#fbbf24",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ef4444"
    };
  }
  /** 触发停电分析 */
  analyze(faultId, opts) {
    const result = analyzeOutage(this.dataset, faultId, opts);
    this.lastResult = result;
    this.render(result);
    for (const l of this.listeners) l(result);
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
    this.listeners.clear();
    this.lastResult = null;
  }
  onResult(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  getLastResult() {
    return this.lastResult;
  }
  render(result) {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const points = result.affectedDevices.map((d) => [d.lng, d.lat]);
    const hull = convexHull(points);
    if (hull.length >= 3) {
      const hullGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[...hull, hull[0]]] },
            properties: {}
          }
        ]
      };
      mlMap.addSource(`${prefix}-hull-src`, hullGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-hull-fill`,
        type: "fill",
        source: `${prefix}-hull-src`,
        paint: this.affectedFillPaint
      });
      this.layerIds.push(`${prefix}-hull-fill`);
    }
    const deviceByIdMap = new Map(this.dataset.devices.map((d) => [d.id, d]));
    const lineGeoJSON = {
      type: "FeatureCollection",
      features: result.affectedLines.flatMap((l) => {
        const from = deviceByIdMap.get(l.fromDevice);
        const to = deviceByIdMap.get(l.toDevice);
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
            properties: {}
          }
        ];
      })
    };
    if (lineGeoJSON.features.length > 0) {
      mlMap.addSource(`${prefix}-lines-src`, lineGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-lines`,
        type: "line",
        source: `${prefix}-lines-src`,
        paint: this.affectedLinePaint
      });
      this.layerIds.push(`${prefix}-lines`);
    }
    const important = result.affectedUsers.important;
    if (important.length > 0) {
      const userGeoJSON = {
        type: "FeatureCollection",
        features: important.map((u) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [u.lng, u.lat] },
          properties: { name: u.name ?? u.id, reason: u.reason ?? "" }
        }))
      };
      mlMap.addSource(`${prefix}-important-src`, userGeoJSON);
      mlMap.addLayer({
        id: `${prefix}-important`,
        type: "circle",
        source: `${prefix}-important-src`,
        paint: this.importantUserPaint
      });
      this.layerIds.push(`${prefix}-important`);
    }
    const center = centroid(points);
    if (center[0] !== 0 || center[1] !== 0) {
      try {
        this.map.flyTo({ center });
      } catch {
      }
    }
  }
};
const __pageData = JSON.parse('{"title":"G2 停电分析器","description":"","frontmatter":{"title":"G2 停电分析器"},"headers":[],"relativePath":"grid/outage.md","filePath":"grid/outage.md"}');
const __default__ = { name: "grid/outage.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const analyzer = ref(null);
    const faultId = ref("sub-center");
    const result = ref(null);
    const targetType = ref("device");
    function runAnalysis() {
      if (!analyzer.value || !faultId.value) return;
      result.value = analyzer.value.analyze(faultId.value);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.2 });
      m.on("load", () => {
        map.value = m;
        analyzer.value = new OutageAnalyzer({
          map: m,
          dataset: wuhanGrid,
          layerPrefix: "cg-outage"
        });
        runAnalysis();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = analyzer.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-febc33c6>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "G2 · 停电分析器",
        subtitle: "选择故障设备 → 下游遍历 → 受影响用户统计 + 重要用户标注 + 备用路径。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="outage-map" data-v-febc33c6${_scopeId}></div>`);
            if (result.value) {
              _push2(`<div class="outage-tag" data-v-febc33c6${_scopeId}> 受影响 ${ssrInterpolate(result.value.affectedDevices.length)} 设备 · ${ssrInterpolate(result.value.affectedUsers.total)} 用户 · ${ssrInterpolate(result.value.durationMs.toFixed(1))}ms </div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "outage-map"
              }, null, 512),
              result.value ? (openBlock(), createBlock("div", {
                key: 0,
                class: "outage-tag"
              }, " 受影响 " + toDisplayString(result.value.affectedDevices.length) + " 设备 · " + toDisplayString(result.value.affectedUsers.total) + " 用户 · " + toDisplayString(result.value.durationMs.toFixed(1)) + "ms ", 1)) : createCommentVNode("", true)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "故障设备",
              hint: "一键停电分析"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<div class="cg-tabs" data-v-febc33c6${_scopeId2}><button class="${ssrRenderClass([{ active: targetType.value === "device" }, "cg-tab"])}" data-v-febc33c6${_scopeId2}>设备</button><button class="${ssrRenderClass([{ active: targetType.value === "line" }, "cg-tab"])}" data-v-febc33c6${_scopeId2}>线路</button></div><select class="cg-select" data-v-febc33c6${_scopeId2}><!--[-->`);
                  ssrRenderList(targetType.value === "device" ? unref(gridDeviceIds) : unref(gridLineIds), (id) => {
                    _push3(`<option${ssrRenderAttr("value", id)} data-v-febc33c6${ssrIncludeBooleanAttr(Array.isArray(faultId.value) ? ssrLooseContain(faultId.value, id) : ssrLooseEqual(faultId.value, id)) ? " selected" : ""}${_scopeId2}>${ssrInterpolate(id)}</option>`);
                  });
                  _push3(`<!--]--></select>`);
                } else {
                  return [
                    createVNode("div", { class: "cg-tabs" }, [
                      createVNode("button", {
                        class: ["cg-tab", { active: targetType.value === "device" }],
                        onClick: ($event) => targetType.value = "device"
                      }, "设备", 10, ["onClick"]),
                      createVNode("button", {
                        class: ["cg-tab", { active: targetType.value === "line" }],
                        onClick: ($event) => targetType.value = "line"
                      }, "线路", 10, ["onClick"])
                    ]),
                    withDirectives(createVNode("select", {
                      "onUpdate:modelValue": ($event) => faultId.value = $event,
                      class: "cg-select",
                      onChange: runAnalysis
                    }, [
                      (openBlock(true), createBlock(Fragment, null, renderList(targetType.value === "device" ? unref(gridDeviceIds) : unref(gridLineIds), (id) => {
                        return openBlock(), createBlock("option", {
                          key: id,
                          value: id
                        }, toDisplayString(id), 9, ["value"]);
                      }), 128))
                    ], 40, ["onUpdate:modelValue"]), [
                      [vModelSelect, faultId.value]
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-febc33c6${_scopeId}><code data-v-febc33c6${_scopeId}>&lt;SimPanel v-if=&quot;result&quot; title=&quot;分析结果&quot; :hint=&quot;\`\${result.durationMs.toFixed(1)}ms\`&quot;&gt;
  &lt;div class=&quot;stat-row&quot;&gt;
    &lt;span class=&quot;stat-label&quot;&gt;受影响用户&lt;/span&gt;
    &lt;span class=&quot;stat-value&quot;&gt;${ssrInterpolate(result.value.affectedUsers.total)}&lt;/span&gt;
  &lt;/div&gt;
  &lt;div class=&quot;stat-grid&quot;&gt;
    &lt;div class=&quot;stat-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(result.value.affectedUsers.residential)}&lt;/b&gt;&lt;span&gt;居民&lt;/span&gt;&lt;/div&gt;
    &lt;div class=&quot;stat-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(result.value.affectedUsers.commercial)}&lt;/b&gt;&lt;span&gt;商业&lt;/span&gt;&lt;/div&gt;
    &lt;div class=&quot;stat-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(result.value.affectedUsers.industrial)}&lt;/b&gt;&lt;span&gt;工业&lt;/span&gt;&lt;/div&gt;
    &lt;div class=&quot;stat-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(result.value.affectedUsers.important.length)}&lt;/b&gt;&lt;span&gt;重要&lt;/span&gt;&lt;/div&gt;
  &lt;/div&gt;

  &lt;div v-if=&quot;result.affectedUsers.important.length&quot; class=&quot;important-list&quot;&gt;
    &lt;h4&gt;重要用户&lt;/h4&gt;
    &lt;div v-for=&quot;u in result.affectedUsers.important&quot; :key=&quot;u.id&quot; class=&quot;important-item&quot;&gt;
      &lt;span class=&quot;important-dot&quot; /&gt;
      &lt;span&gt;${ssrInterpolate(_ctx.u.name)}&lt;/span&gt;
      &lt;span class=&quot;important-reason&quot;&gt;${ssrInterpolate(_ctx.u.reason)}&lt;/span&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;div class=&quot;cg-divider&quot; /&gt;

  &lt;h4&gt;恢复方案&lt;/h4&gt;
  &lt;p class=&quot;cg-hint&quot;&gt;预计恢复时间：${ssrInterpolate(result.value.restoration.estimatedTime)}&lt;/p&gt;
  &lt;ul class=&quot;steps-list&quot;&gt;
    &lt;li v-for=&quot;(s, i) in result.restoration.steps&quot; :key=&quot;i&quot;&gt;${ssrInterpolate(_ctx.s)}&lt;/li&gt;
  &lt;/ul&gt;
  &lt;p v-if=&quot;result.restoration.alternativePaths.length&quot; class=&quot;cg-hint alt&quot;&gt;
    发现 ${ssrInterpolate(result.value.restoration.alternativePaths.length)} 条备用供电路径
  &lt;/p&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "故障设备",
                hint: "一键停电分析"
              }, {
                default: withCtx(() => [
                  createVNode("div", { class: "cg-tabs" }, [
                    createVNode("button", {
                      class: ["cg-tab", { active: targetType.value === "device" }],
                      onClick: ($event) => targetType.value = "device"
                    }, "设备", 10, ["onClick"]),
                    createVNode("button", {
                      class: ["cg-tab", { active: targetType.value === "line" }],
                      onClick: ($event) => targetType.value = "line"
                    }, "线路", 10, ["onClick"])
                  ]),
                  withDirectives(createVNode("select", {
                    "onUpdate:modelValue": ($event) => faultId.value = $event,
                    class: "cg-select",
                    onChange: runAnalysis
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(targetType.value === "device" ? unref(gridDeviceIds) : unref(gridLineIds), (id) => {
                      return openBlock(), createBlock("option", {
                        key: id,
                        value: id
                      }, toDisplayString(id), 9, ["value"]);
                    }), 128))
                  ], 40, ["onUpdate:modelValue"]), [
                    [vModelSelect, faultId.value]
                  ])
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel v-if="result" title="分析结果" :hint="`${result.durationMs.toFixed(1)}ms`">\n  <div class="stat-row">\n    <span class="stat-label">受影响用户</span>\n    <span class="stat-value">' + toDisplayString(result.value.affectedUsers.total) + '</span>\n  </div>\n  <div class="stat-grid">\n    <div class="stat-cell"><b>' + toDisplayString(result.value.affectedUsers.residential) + '</b><span>居民</span></div>\n    <div class="stat-cell"><b>' + toDisplayString(result.value.affectedUsers.commercial) + '</b><span>商业</span></div>\n    <div class="stat-cell"><b>' + toDisplayString(result.value.affectedUsers.industrial) + '</b><span>工业</span></div>\n    <div class="stat-cell"><b>' + toDisplayString(result.value.affectedUsers.important.length) + '</b><span>重要</span></div>\n  </div>\n\n  <div v-if="result.affectedUsers.important.length" class="important-list">\n    <h4>重要用户</h4>\n    <div v-for="u in result.affectedUsers.important" :key="u.id" class="important-item">\n      <span class="important-dot" />\n      <span>' + toDisplayString(_ctx.u.name) + '</span>\n      <span class="important-reason">' + toDisplayString(_ctx.u.reason) + '</span>\n    </div>\n  </div>\n\n  <div class="cg-divider" />\n\n  <h4>恢复方案</h4>\n  <p class="cg-hint">预计恢复时间：' + toDisplayString(result.value.restoration.estimatedTime) + '</p>\n  <ul class="steps-list">\n    <li v-for="(s, i) in result.restoration.steps" :key="i">' + toDisplayString(_ctx.s) + '</li>\n  </ul>\n  <p v-if="result.restoration.alternativePaths.length" class="cg-hint alt">\n    发现 ' + toDisplayString(result.value.restoration.alternativePaths.length) + " 条备用供电路径\n  </p>\n</SimPanel>\n", 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("grid/outage.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const outage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-febc33c6"]]);
export {
  __pageData,
  outage as default
};
