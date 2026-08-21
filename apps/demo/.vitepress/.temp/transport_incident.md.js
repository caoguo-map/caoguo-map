var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, onMounted, onUnmounted, withCtx, unref, withDirectives, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, vModelSelect, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrInterpolate } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { I as INCIDENT_SEVERITY_COLORS, a as INCIDENT_TYPE_COLORS, b as INCIDENT_TYPE_LABELS, w as wuhanTransport } from "./wuhan-transport.pXf7MKwX.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
function buildRoadAdjacency(dataset) {
  const adj = /* @__PURE__ */ new Map();
  for (const n of dataset.nodes) {
    if (!adj.has(n.id)) adj.set(n.id, []);
  }
  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n]));
  for (const e of dataset.edges) {
    const len = e.length ?? straightLine(e, nodeById) ?? 0;
    const from = adj.get(e.fromNode) ?? [];
    from.push({ edgeId: e.id, to: e.toNode, length: len });
    adj.set(e.fromNode, from);
    const to = adj.get(e.toNode) ?? [];
    to.push({ edgeId: e.id, to: e.fromNode, length: len });
    adj.set(e.toNode, to);
  }
  return adj;
}
function straightLine(e, nodeById) {
  if (e.geometry && e.geometry.length >= 2) {
    let total = 0;
    for (let i = 1; i < e.geometry.length; i++) {
      total += haversine(
        e.geometry[i - 1][0],
        e.geometry[i - 1][1],
        e.geometry[i][0],
        e.geometry[i][1]
      );
    }
    return total;
  }
  const from = nodeById.get(e.fromNode);
  const to = nodeById.get(e.toNode);
  if (!from || !to) return 0;
  return haversine(from.lng, from.lat, to.lng, to.lat);
}
function haversine(lng1, lat1, lng2, lat2) {
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
var SEVERITY_RADIUS = {
  low: 500,
  medium: 1e3,
  high: 2e3,
  critical: 5e3
};
function analyzeIncident(dataset, incident2) {
  var _a;
  const severity = ((_a = incident2.properties) == null ? void 0 : _a.severity) ?? "medium";
  const radius = SEVERITY_RADIUS[severity];
  const directEdges = dataset.edges.filter((e) => {
    const from = dataset.nodes.find((n) => n.id === e.fromNode);
    const to = dataset.nodes.find((n) => n.id === e.toNode);
    if (!from || !to) return false;
    const midLng = (from.lng + to.lng) / 2;
    const midLat = (from.lat + to.lat) / 2;
    return haversine(incident2.lng, incident2.lat, midLng, midLat) <= radius;
  });
  const cameras = dataset.nodes.filter(
    (n) => n.kind === "camera" && haversine(incident2.lng, incident2.lat, n.lng, n.lat) <= radius
  );
  const rescue = dataset.nodes.filter(
    (n) => n.kind === "rescue" && haversine(incident2.lng, incident2.lat, n.lng, n.lat) <= radius
  );
  const hospitals = dataset.nodes.filter(
    (n) => n.kind === "hospital" && haversine(incident2.lng, incident2.lat, n.lng, n.lat) <= radius
  );
  let detour = null;
  if (incident2.edgeId) {
    const edge = dataset.edges.find((e) => e.id === incident2.edgeId);
    if (edge) {
      const adj = buildRoadAdjacency(dataset);
      const blocked = /* @__PURE__ */ new Set([edge.id]);
      const r = dijkstraAvoid(adj, dataset, edge.fromNode, edge.toNode, blocked);
      if (r.found) {
        detour = { found: true, path: r.path, distance: r.distance };
      } else {
        detour = { found: false, path: [], distance: Infinity };
      }
    }
  }
  return {
    affectedEdges: directEdges.map((e) => e.id),
    radiusMeters: radius,
    nearbyResources: { cameras, rescue, hospitals },
    detour
  };
}
function dijkstraAvoid(adj, dataset, start, end, blocked) {
  const dist = /* @__PURE__ */ new Map();
  const parents = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  const pq = [{ id: start, d: 0 }];
  for (const n of adj.keys()) {
    dist.set(n, Infinity);
    parents.set(n, null);
  }
  dist.set(start, 0);
  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const cur2 = pq.shift();
    if (visited.has(cur2.id)) continue;
    visited.add(cur2.id);
    if (cur2.id === end) break;
    for (const e of adj.get(cur2.id) ?? []) {
      if (blocked.has(e.edgeId)) continue;
      if (visited.has(e.to)) continue;
      const alt = (dist.get(cur2.id) ?? Infinity) + e.length;
      if (alt < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, alt);
        parents.set(e.to, cur2.id);
        pq.push({ id: e.to, d: alt });
      }
    }
  }
  if ((dist.get(end) ?? Infinity) === Infinity) {
    return { distance: Infinity, path: [], found: false };
  }
  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    const p = parents.get(cur);
    if (p === void 0) break;
    cur = p;
  }
  return { distance: dist.get(end) ?? 0, path, found: true };
}
function buildIncidentTimeline(incident2) {
  var _a, _b, _c, _d, _e;
  const steps = [
    {
      status: "occurred",
      label: `${INCIDENT_TYPE_LABELS[incident2.type] ?? "事件"}发生`,
      time: (_a = incident2.properties) == null ? void 0 : _a.occurredAt
    }
  ];
  if ((_b = incident2.properties) == null ? void 0 : _b.dispatchedAt) {
    steps.push({ status: "dispatched", label: "已派单处置", time: incident2.properties.dispatchedAt });
  }
  if (((_c = incident2.properties) == null ? void 0 : _c.status) === "handling" || ((_d = incident2.properties) == null ? void 0 : _d.resolvedAt)) {
    steps.push({ status: "handling", label: "处置中", time: incident2.properties.resolvedAt });
  }
  if (((_e = incident2.properties) == null ? void 0 : _e.status) === "resolved") {
    steps.push({ status: "resolved", label: "已解除", time: incident2.properties.resolvedAt });
  }
  return steps;
}
var IncidentMap = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "layerPrefix");
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? "cg-incident";
  }
  /** 渲染事件标记 */
  renderIncidents(incidents) {
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const features = incidents.map((inc) => {
      var _a;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [inc.lng, inc.lat] },
        properties: {
          id: inc.id,
          type: inc.type,
          severity: ((_a = inc.properties) == null ? void 0 : _a.severity) ?? "medium"
        }
      };
    });
    if (!mlMap.getSource(`${prefix}-src`)) {
      mlMap.addSource(`${prefix}-src`, { type: "FeatureCollection", features });
      mlMap.addLayer({
        id: `${prefix}-pt`,
        type: "circle",
        source: `${prefix}-src`,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "severity"], 0, 5, 1, 12],
          "circle-color": [
            "match",
            ["get", "severity"],
            ...Object.entries(INCIDENT_SEVERITY_COLORS).flatMap(([k, v]) => [k, v]),
            "#6b7280"
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });
      this.layerIds.push(`${prefix}-pt`);
    }
  }
  /** 分析事件并返回影响范围（供上层高亮 + 展示） */
  analyze(incident2) {
    return analyzeIncident(this.dataset, incident2);
  }
  /** 事件时间线 */
  timeline(incident2) {
    return buildIncidentTimeline(incident2);
  }
  /** 事件类型颜色（供 UI 用） */
  colorFor(type) {
    return INCIDENT_TYPE_COLORS[type] ?? "#6b7280";
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
const __pageData = JSON.parse('{"title":"T3 事件响应图","description":"","frontmatter":{"title":"T3 事件响应图"},"headers":[],"relativePath":"transport/incident.md","filePath":"transport/incident.md"}');
const __default__ = { name: "transport/incident.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const incidentMap = ref(null);
    const selectedIncidentId = ref("inc01");
    const impact = ref(null);
    const timeline = ref([]);
    function analyze() {
      var _a;
      if (!incidentMap.value) return;
      const inc = (_a = wuhanTransport.incidents) == null ? void 0 : _a.find((i) => i.id === selectedIncidentId.value);
      if (!inc) return;
      impact.value = incidentMap.value.analyze(inc);
      timeline.value = incidentMap.value.timeline(inc);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
      m.on("load", () => {
        map.value = m;
        const im = new IncidentMap({ map: m, dataset: wuhanTransport, layerPrefix: "cg-inc" });
        im.renderIncidents(wuhanTransport.incidents ?? []);
        incidentMap.value = im;
        analyze();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = incidentMap.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-3f7e2906>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "T3 · 事件响应图",
        subtitle: "caoguo-transport：事件标记 + 影响范围 + 附近资源 + 绕行方案 + 事件时间线。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="inc-map" data-v-3f7e2906${_scopeId}></div>`);
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "inc-map"
              }, null, 512)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "事件选择",
              hint: "IM-1 事件标记"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<select class="cg-select" data-v-3f7e2906${_scopeId2}><!--[-->`);
                  ssrRenderList(unref(wuhanTransport).incidents, (inc) => {
                    var _a;
                    _push3(`<option${ssrRenderAttr("value", inc.id)} data-v-3f7e2906${ssrIncludeBooleanAttr(Array.isArray(selectedIncidentId.value) ? ssrLooseContain(selectedIncidentId.value, inc.id) : ssrLooseEqual(selectedIncidentId.value, inc.id)) ? " selected" : ""}${_scopeId2}>${ssrInterpolate(((_a = inc.properties) == null ? void 0 : _a.title) ?? inc.id)}</option>`);
                  });
                  _push3(`<!--]--></select>`);
                } else {
                  return [
                    withDirectives(createVNode("select", {
                      "onUpdate:modelValue": ($event) => selectedIncidentId.value = $event,
                      class: "cg-select",
                      onChange: analyze
                    }, [
                      (openBlock(true), createBlock(Fragment, null, renderList(unref(wuhanTransport).incidents, (inc) => {
                        var _a;
                        return openBlock(), createBlock("option", {
                          key: inc.id,
                          value: inc.id
                        }, toDisplayString(((_a = inc.properties) == null ? void 0 : _a.title) ?? inc.id), 9, ["value"]);
                      }), 128))
                    ], 40, ["onUpdate:modelValue"]), [
                      [vModelSelect, selectedIncidentId.value]
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-3f7e2906${_scopeId}><code data-v-3f7e2906${_scopeId}>&lt;SimPanel v-if=&quot;impact&quot; title=&quot;影响分析&quot; hint=&quot;IM-2/IM-3/IM-4&quot;&gt;
  &lt;div class=&quot;cg-result&quot;&gt;
    &lt;p&gt;影响路段：&lt;strong&gt;${ssrInterpolate(impact.value.affectedEdges.length)}&lt;/strong&gt; 条&lt;/p&gt;
    &lt;p&gt;影响半径：&lt;strong&gt;${ssrInterpolate((impact.value.radiusMeters / 1e3).toFixed(1))} km&lt;/strong&gt;&lt;/p&gt;
    &lt;p&gt;附近摄像头：&lt;strong&gt;${ssrInterpolate(impact.value.nearbyResources.cameras.length)}&lt;/strong&gt;&lt;/p&gt;
    &lt;p&gt;附近救援站：&lt;strong&gt;${ssrInterpolate(impact.value.nearbyResources.rescue.length)}&lt;/strong&gt;&lt;/p&gt;
    &lt;p&gt;附近医院：&lt;strong&gt;${ssrInterpolate(impact.value.nearbyResources.hospitals.length)}&lt;/strong&gt;&lt;/p&gt;
    &lt;p v-if=&quot;impact.detour&quot;&gt;
      绕行方案：
      &lt;strong&gt;${ssrInterpolate(impact.value.detour.found ? `可用（${impact.value.detour.path.length} 节点）` : "无替代路径")}&lt;/strong&gt;
    &lt;/p&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;

&lt;SimPanel v-if=&quot;timeline.length&quot; title=&quot;事件时间线&quot; hint=&quot;IM-5&quot;&gt;
  &lt;div class=&quot;cg-timeline&quot;&gt;
    &lt;div v-for=&quot;(step, i) in timeline&quot; :key=&quot;i&quot; class=&quot;cg-tl-step&quot;&gt;
      &lt;span class=&quot;cg-tl-dot&quot; /&gt;
      &lt;div&gt;
        &lt;p class=&quot;cg-tl-label&quot;&gt;${ssrInterpolate(_ctx.step.label)}&lt;/p&gt;
        &lt;p v-if=&quot;step.time&quot; class=&quot;cg-tl-time&quot;&gt;${ssrInterpolate(_ctx.step.time)}&lt;/p&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "事件选择",
                hint: "IM-1 事件标记"
              }, {
                default: withCtx(() => [
                  withDirectives(createVNode("select", {
                    "onUpdate:modelValue": ($event) => selectedIncidentId.value = $event,
                    class: "cg-select",
                    onChange: analyze
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(wuhanTransport).incidents, (inc) => {
                      var _a;
                      return openBlock(), createBlock("option", {
                        key: inc.id,
                        value: inc.id
                      }, toDisplayString(((_a = inc.properties) == null ? void 0 : _a.title) ?? inc.id), 9, ["value"]);
                    }), 128))
                  ], 40, ["onUpdate:modelValue"]), [
                    [vModelSelect, selectedIncidentId.value]
                  ])
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel v-if="impact" title="影响分析" hint="IM-2/IM-3/IM-4">\n  <div class="cg-result">\n    <p>影响路段：<strong>' + toDisplayString(impact.value.affectedEdges.length) + "</strong> 条</p>\n    <p>影响半径：<strong>" + toDisplayString((impact.value.radiusMeters / 1e3).toFixed(1)) + " km</strong></p>\n    <p>附近摄像头：<strong>" + toDisplayString(impact.value.nearbyResources.cameras.length) + "</strong></p>\n    <p>附近救援站：<strong>" + toDisplayString(impact.value.nearbyResources.rescue.length) + "</strong></p>\n    <p>附近医院：<strong>" + toDisplayString(impact.value.nearbyResources.hospitals.length) + '</strong></p>\n    <p v-if="impact.detour">\n      绕行方案：\n      <strong>' + toDisplayString(impact.value.detour.found ? `可用（${impact.value.detour.path.length} 节点）` : "无替代路径") + '</strong>\n    </p>\n  </div>\n</SimPanel>\n\n<SimPanel v-if="timeline.length" title="事件时间线" hint="IM-5">\n  <div class="cg-timeline">\n    <div v-for="(step, i) in timeline" :key="i" class="cg-tl-step">\n      <span class="cg-tl-dot" />\n      <div>\n        <p class="cg-tl-label">' + toDisplayString(_ctx.step.label) + '</p>\n        <p v-if="step.time" class="cg-tl-time">' + toDisplayString(_ctx.step.time) + "</p>\n      </div>\n    </div>\n  </div>\n</SimPanel>\n", 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("transport/incident.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const incident = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3f7e2906"]]);
export {
  __pageData,
  incident as default
};
