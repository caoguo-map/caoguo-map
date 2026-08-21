var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderStyle } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanTelecom, a as wuhanSignalSamples } from "./wuhan-telecom.CHlkX2EX.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var CARRIER_COLORS = {
  "中国移动": "#4ade80",
  "中国联通": "#ef4444",
  "中国电信": "#3b82f6",
  "中国广电": "#f59e0b"
};
var TECHNOLOGY_COLORS = {
  "5G": "#22d3ee",
  "4G": "#3b82f6",
  "3G": "#6b7280"
};
var STATION_STATUS_COLORS = {
  online: "#4ade80",
  offline: "#6b7280",
  fault: "#ef4444"
};
var STATION_STATUS_LABELS = {
  online: "在线",
  offline: "离线",
  fault: "故障"
};
function paintStationByCarrier() {
  return [
    "match",
    ["get", "carrier"],
    ...Object.entries(CARRIER_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintStationByTechnology() {
  return [
    "match",
    ["get", "technology"],
    ...Object.entries(TECHNOLOGY_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintStationByStatus() {
  return [
    "match",
    ["coalesce", ["get", "status"], "online"],
    ...Object.entries(STATION_STATUS_COLORS).flatMap(([k, v]) => [k, v]),
    "#6b7280"
  ];
}
function paintCoverageBySignal() {
  return [
    "match",
    ["get", "signalLevel"],
    "excellent",
    "#22d3ee",
    "good",
    "#4ade80",
    "fair",
    "#fbbf24",
    "poor",
    "#f59e0b",
    "#6b7280"
  ];
}
function paintStationBy(mode) {
  switch (mode) {
    case "carrier":
      return paintStationByCarrier();
    case "technology":
      return paintStationByTechnology();
    case "status":
      return paintStationByStatus();
    default:
      return paintStationByCarrier();
  }
}
function legendByCarrier() {
  return {
    title: "运营商",
    items: Object.keys(CARRIER_COLORS).map((k) => ({
      label: k,
      color: CARRIER_COLORS[k],
      shape: "circle"
    }))
  };
}
function legendByTechnology() {
  return {
    title: "技术制式",
    items: Object.keys(TECHNOLOGY_COLORS).map((k) => ({
      label: k,
      color: TECHNOLOGY_COLORS[k],
      shape: "circle"
    }))
  };
}
function legendByStationStatus() {
  return {
    title: "基站状态",
    items: Object.keys(STATION_STATUS_COLORS).map((k) => ({
      label: STATION_STATUS_LABELS[k],
      color: STATION_STATUS_COLORS[k],
      shape: "circle"
    }))
  };
}
function buildTelecomLegend(mode) {
  switch (mode) {
    case "carrier":
      return legendByCarrier();
    case "technology":
      return legendByTechnology();
    case "status":
      return legendByStationStatus();
    default:
      return legendByCarrier();
  }
}
function pointInPolygon(lng, lat, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = yi > lat !== yj > lat && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function detectCoverageGaps(samples, coverageAreas, weakThreshold = -105) {
  const gaps = [];
  for (const s of samples) {
    const covered = coverageAreas.some(
      (area) => pointInPolygon(s.lng, s.lat, area.geom)
    );
    if (!covered) {
      gaps.push({ lng: s.lng, lat: s.lat, level: "none", rsrp: s.rsrp });
    } else if (s.rsrp < weakThreshold) {
      gaps.push({ lng: s.lng, lat: s.lat, level: "weak", rsrp: s.rsrp });
    }
  }
  return gaps;
}
var CellCoverage = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "colorBy");
    __publicField(this, "layerPrefix");
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? "carrier";
    this.layerPrefix = options.layerPrefix ?? "cg-cell";
  }
  /** 渲染基站 + 覆盖区域 */
  render() {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const coverageGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.coverageAreas.map((a) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [a.geom] },
        properties: { stationId: a.stationId, signalLevel: a.signalLevel }
      }))
    };
    const stationGeoJSON = {
      type: "FeatureCollection",
      features: this.dataset.baseStations.map((s) => {
        var _a, _b;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lng, s.lat] },
          properties: {
            stationId: s.id,
            carrier: s.carrier,
            technology: ((_a = s.properties) == null ? void 0 : _a.technology) ?? "4G",
            status: ((_b = s.properties) == null ? void 0 : _b.status) ?? "online",
            name: s.name ?? ""
          }
        };
      })
    };
    mlMap.addSource(`${prefix}-coverage-src`, coverageGeoJSON);
    mlMap.addSource(`${prefix}-station-src`, stationGeoJSON);
    if (coverageGeoJSON.features.length > 0) {
      mlMap.addLayer({
        id: `${prefix}-coverage-fill`,
        type: "fill",
        source: `${prefix}-coverage-src`,
        paint: {
          "fill-color": paintCoverageBySignal(),
          "fill-opacity": 0.25
        }
      });
      this.layerIds.push(`${prefix}-coverage-fill`);
    }
    mlMap.addLayer({
      id: `${prefix}-station-pt`,
      type: "circle",
      source: `${prefix}-station-src`,
      paint: {
        "circle-radius": 6,
        "circle-color": paintStationBy(this.colorBy),
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff"
      }
    });
    this.layerIds.push(`${prefix}-station-pt`);
  }
  /** 切换基站着色模式 */
  setColorBy(mode) {
    this.colorBy = mode;
    const mlMap = this.map.instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-station-pt`,
          "circle-color",
          paintStationBy(mode)
        );
      } catch {
      }
    }
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
const __pageData = JSON.parse('{"title":"T1 基站覆盖地图","description":"","frontmatter":{"title":"T1 基站覆盖地图"},"headers":[],"relativePath":"telecom/coverage.md","filePath":"telecom/coverage.md"}');
const __default__ = { name: "telecom/coverage.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const coverage2 = ref(null);
    const colorMode = ref("carrier");
    const modes = [
      { value: "carrier", label: "按运营商" },
      { value: "technology", label: "按技术制式" },
      { value: "status", label: "按状态" }
    ];
    const gaps = ref([]);
    const stats = ref({ stations: wuhanTelecom.baseStations.length, areas: wuhanTelecom.coverageAreas.length });
    const legend = computed(() => buildTelecomLegend(colorMode.value));
    function switchColor(mode) {
      var _a;
      colorMode.value = mode;
      (_a = coverage2.value) == null ? void 0 : _a.setColorBy(mode);
    }
    function detectGaps() {
      gaps.value = detectCoverageGaps(wuhanSignalSamples, wuhanTelecom.coverageAreas);
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
      m.on("load", () => {
        map.value = m;
        const c = new CellCoverage({ map: m, dataset: wuhanTelecom, colorBy: colorMode.value, layerPrefix: "cg-cell" });
        c.render();
        coverage2.value = c;
        detectGaps();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = coverage2.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-05965f86>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "T1 · 基站覆盖地图",
        subtitle: "caoguo-telecom：基站按运营商/技术着色 + 覆盖区域叠加 + 盲区识别。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="cell-map" data-v-05965f86${_scopeId}></div><div class="stats-tag" data-v-05965f86${_scopeId}>${ssrInterpolate(stats.value.stations)} 基站 · ${ssrInterpolate(stats.value.areas)} 覆盖区域 </div>`);
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "cell-map"
              }, null, 512),
              createVNode("div", { class: "stats-tag" }, toDisplayString(stats.value.stations) + " 基站 · " + toDisplayString(stats.value.areas) + " 覆盖区域 ", 1)
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
                  _push3(`<div class="cg-tabs" data-v-05965f86${_scopeId2}><!--[-->`);
                  ssrRenderList(modes, (m) => {
                    _push3(`<button class="${ssrRenderClass([{ active: colorMode.value === m.value }, "cg-tab"])}" data-v-05965f86${_scopeId2}>${ssrInterpolate(m.label)}</button>`);
                  });
                  _push3(`<!--]--></div><div class="cg-legend" data-v-05965f86${_scopeId2}><h4 data-v-05965f86${_scopeId2}>${ssrInterpolate(legend.value.title)}</h4><!--[-->`);
                  ssrRenderList(legend.value.items, (item, i) => {
                    _push3(`<div class="cg-legend-item" data-v-05965f86${_scopeId2}><span class="cg-legend-swatch" style="${ssrRenderStyle({ background: item.color, borderRadius: "50%", width: "10px", height: "10px" })}" data-v-05965f86${_scopeId2}></span><span class="cg-legend-label" data-v-05965f86${_scopeId2}>${ssrInterpolate(item.label)}</span></div>`);
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
                            style: { background: item.color, borderRadius: "50%", width: "10px", height: "10px" }
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
            _push2(`<pre data-v-05965f86${_scopeId}><code data-v-05965f86${_scopeId}>&lt;SimPanel title=&quot;覆盖盲区识别&quot; hint=&quot;CC-4&quot;&gt;
  &lt;button class=&quot;cg-btn&quot; @click=&quot;detectGaps&quot;&gt;重新检测&lt;/button&gt;
  &lt;div v-if=&quot;gaps.length&quot; class=&quot;cg-result&quot;&gt;
    &lt;p&gt;检测到 &lt;strong&gt;${ssrInterpolate(gaps.value.length)}&lt;/strong&gt; 个盲区点&lt;/p&gt;
    &lt;div v-for=&quot;(g, i) in gaps&quot; :key=&quot;i&quot; class=&quot;cg-gap-item&quot;&gt;
      &lt;span class=&quot;cg-gap-dot&quot; :style=&quot;{ background: g.level === &#39;none&#39; ? &#39;#ef4444&#39; : &#39;#f59e0b&#39; }&quot; /&gt;
      &lt;span&gt;${ssrInterpolate(_ctx.g.level === "none" ? "无覆盖" : "弱覆盖")} (${ssrInterpolate(_ctx.g.rsrp)} dBm)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/div&gt;
  &lt;p v-else class=&quot;cg-empty&quot;&gt;未检测到盲区&lt;/p&gt;
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
                          style: { background: item.color, borderRadius: "50%", width: "10px", height: "10px" }
                        }, null, 4),
                        createVNode("span", { class: "cg-legend-label" }, toDisplayString(item.label), 1)
                      ]);
                    }), 128))
                  ])
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel title="覆盖盲区识别" hint="CC-4">\n  <button class="cg-btn" @click="detectGaps">重新检测</button>\n  <div v-if="gaps.length" class="cg-result">\n    <p>检测到 <strong>' + toDisplayString(gaps.value.length) + `</strong> 个盲区点</p>
    <div v-for="(g, i) in gaps" :key="i" class="cg-gap-item">
      <span class="cg-gap-dot" :style="{ background: g.level === 'none' ? '#ef4444' : '#f59e0b' }" />
      <span>` + toDisplayString(_ctx.g.level === "none" ? "无覆盖" : "弱覆盖") + " (" + toDisplayString(_ctx.g.rsrp) + ' dBm)</span>\n    </div>\n  </div>\n  <p v-else class="cg-empty">未检测到盲区</p>\n</SimPanel>\n', 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("telecom/coverage.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const coverage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-05965f86"]]);
export {
  __pageData,
  coverage as default
};
