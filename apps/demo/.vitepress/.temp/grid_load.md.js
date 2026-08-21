var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, openBlock, createBlock, Fragment, renderList, createVNode, toDisplayString, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrInterpolate } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanGrid } from "./wuhan-grid.rktezxTU.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var OVERLOAD_THRESHOLD = 0.8;
function loadRateColor(loadRate) {
  if (loadRate >= OVERLOAD_THRESHOLD) return "#ef4444";
  if (loadRate >= 0.6) return "#fbbf24";
  if (loadRate >= 0.4) return "#4ade80";
  return "#22c55e";
}
function isOverloaded(loadRate) {
  return loadRate >= OVERLOAD_THRESHOLD;
}
function overloadedDevices(dataset) {
  return dataset.devices.filter((d) => {
    var _a;
    const lr = (_a = d.properties) == null ? void 0 : _a.loadRate;
    return lr !== void 0 && isOverloaded(lr);
  });
}
function predictLoad(input) {
  const tempFactor = 1 + 0.02 * Math.max(0, input.temperature - 26);
  const holidayFactor = input.isHoliday ? 0.7 : 1;
  const eventFactor = input.eventFactor ?? 1;
  return input.base * tempFactor * holidayFactor * eventFactor;
}
function predictLoadSeries(base, temps, isHoliday = false) {
  return temps.map(
    (t) => predictLoad({ base, temperature: t, isHoliday })
  );
}
var LoadHeatmap = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "layerPrefix");
    __publicField(this, "overloadPaint");
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? "cg-load";
    this.overloadPaint = options.overloadPaint ?? {
      "circle-radius": 9,
      "circle-color": "#ef4444",
      "circle-stroke-width": 3,
      "circle-stroke-color": "#ffffff"
    };
  }
  /** 渲染负荷热力（设备按负荷率着色） */
  render() {
    this.clear();
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const devicesWithLoad = this.dataset.devices.filter(
      (d) => {
        var _a;
        return ((_a = d.properties) == null ? void 0 : _a.loadRate) !== void 0;
      }
    );
    const geoJSON = {
      type: "FeatureCollection",
      features: devicesWithLoad.map((d) => {
        var _a, _b;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [d.lng, d.lat] },
          properties: {
            deviceId: d.id,
            kind: d.kind,
            loadRate: ((_a = d.properties) == null ? void 0 : _a.loadRate) ?? 0,
            color: loadRateColor(((_b = d.properties) == null ? void 0 : _b.loadRate) ?? 0)
          }
        };
      })
    };
    mlMap.addSource(`${prefix}-src`, geoJSON);
    mlMap.addLayer({
      id: `${prefix}-circle`,
      type: "circle",
      source: `${prefix}-src`,
      paint: {
        "circle-radius": 7,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9
      }
    });
    this.layerIds.push(`${prefix}-circle`);
  }
  /** 高亮过载设备（负荷率 ≥ 80%） */
  highlightOverload() {
    const overloaded = overloadedDevices(this.dataset);
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    if (overloaded.length > 0) {
      const geoJSON = {
        type: "FeatureCollection",
        features: overloaded.map((d) => {
          var _a;
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: [d.lng, d.lat] },
            properties: { deviceId: d.id, loadRate: ((_a = d.properties) == null ? void 0 : _a.loadRate) ?? 0 }
          };
        })
      };
      mlMap.addSource(`${prefix}-overload-src`, geoJSON);
      mlMap.addLayer({
        id: `${prefix}-overload`,
        type: "circle",
        source: `${prefix}-overload-src`,
        paint: this.overloadPaint
      });
      this.layerIds.push(`${prefix}-overload`);
    }
    return overloaded;
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
const __pageData = JSON.parse('{"title":"G3 负荷热力图","description":"","frontmatter":{"title":"G3 负荷热力图"},"headers":[],"relativePath":"grid/load.md","filePath":"grid/load.md"}');
const __default__ = { name: "grid/load.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const heatmap = ref(null);
    const baseLoad = ref(100);
    const temperature = ref(32);
    const isHoliday = ref(false);
    const overloaded = computed(() => overloadedDevices(wuhanGrid));
    const forecast = computed(() => {
      const temps = Array.from({ length: 24 }, (_, i) => temperature.value + 4 * Math.sin((i - 8) / 24 * Math.PI * 2));
      return predictLoadSeries(baseLoad.value, temps, isHoliday.value);
    });
    const peakForecast = computed(() => Math.max(...forecast.value));
    function refresh() {
      var _a, _b;
      (_a = heatmap.value) == null ? void 0 : _a.render();
      (_b = heatmap.value) == null ? void 0 : _b.highlightOverload();
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.2 });
      m.on("load", () => {
        map.value = m;
        heatmap.value = new LoadHeatmap({
          map: m,
          dataset: wuhanGrid,
          layerPrefix: "cg-load"
        });
        refresh();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = heatmap.value) == null ? void 0 : _a.destroy();
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-35f9440d>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "G3 · 负荷热力图",
        subtitle: "台区/线路负荷着色（绿→黄→红）+ 过载预警（负荷率 ≥80%）+ 24h 负荷预测。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="load-map" data-v-35f9440d${_scopeId}></div>`);
            if (overloaded.value.length) {
              _push2(`<div class="overload-tag" data-v-35f9440d${_scopeId}> 过载设备：${ssrInterpolate(overloaded.value.length)} 个 </div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "load-map"
              }, null, 512),
              overloaded.value.length ? (openBlock(), createBlock("div", {
                key: 0,
                class: "overload-tag"
              }, " 过载设备：" + toDisplayString(overloaded.value.length) + " 个 ", 1)) : createCommentVNode("", true)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "过载预警",
              hint: "负荷率 ≥ 80%"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  if (overloaded.value.length) {
                    _push3(`<div class="overload-list" data-v-35f9440d${_scopeId2}><!--[-->`);
                    ssrRenderList(overloaded.value, (d) => {
                      var _a;
                      _push3(`<div class="overload-item" data-v-35f9440d${_scopeId2}><span class="overload-dot" data-v-35f9440d${_scopeId2}></span><span data-v-35f9440d${_scopeId2}>${ssrInterpolate(d.name ?? d.id)}</span><span class="overload-rate" data-v-35f9440d${_scopeId2}>${ssrInterpolate(((((_a = d.properties) == null ? void 0 : _a.loadRate) ?? 0) * 100).toFixed(0))}%</span></div>`);
                    });
                    _push3(`<!--]--></div>`);
                  } else {
                    _push3(`<p class="cg-hint" data-v-35f9440d${_scopeId2}>当前无过载设备</p>`);
                  }
                } else {
                  return [
                    overloaded.value.length ? (openBlock(), createBlock("div", {
                      key: 0,
                      class: "overload-list"
                    }, [
                      (openBlock(true), createBlock(Fragment, null, renderList(overloaded.value, (d) => {
                        var _a;
                        return openBlock(), createBlock("div", {
                          key: d.id,
                          class: "overload-item"
                        }, [
                          createVNode("span", { class: "overload-dot" }),
                          createVNode("span", null, toDisplayString(d.name ?? d.id), 1),
                          createVNode("span", { class: "overload-rate" }, toDisplayString(((((_a = d.properties) == null ? void 0 : _a.loadRate) ?? 0) * 100).toFixed(0)) + "%", 1)
                        ]);
                      }), 128))
                    ])) : (openBlock(), createBlock("p", {
                      key: 1,
                      class: "cg-hint"
                    }, "当前无过载设备"))
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-35f9440d${_scopeId}><code data-v-35f9440d${_scopeId}>&lt;SimPanel title=&quot;负荷预测&quot; hint=&quot;24h 简化模型&quot;&gt;
  &lt;div class=&quot;field&quot;&gt;
    &lt;label&gt;基准负荷（MW）&lt;/label&gt;
    &lt;input v-model.number=&quot;baseLoad&quot; type=&quot;number&quot; class=&quot;cg-input&quot; /&gt;
  &lt;/div&gt;
  &lt;div class=&quot;field&quot;&gt;
    &lt;label&gt;气温（℃）&lt;/label&gt;
    &lt;input v-model.number=&quot;temperature&quot; type=&quot;number&quot; class=&quot;cg-input&quot; /&gt;
  &lt;/div&gt;
  &lt;label class=&quot;checkbox&quot;&gt;
    &lt;input v-model=&quot;isHoliday&quot; type=&quot;checkbox&quot; /&gt;
    &lt;span&gt;节假日（负荷 ×0.7）&lt;/span&gt;
  &lt;/label&gt;
  &lt;div class=&quot;forecast-summary&quot;&gt;
    &lt;span&gt;预测峰值：&lt;/span&gt;
    &lt;b&gt;${ssrInterpolate(peakForecast.value.toFixed(1))} MW&lt;/b&gt;
  &lt;/div&gt;
  &lt;div class=&quot;forecast-bars&quot;&gt;
    &lt;div
      v-for=&quot;(v, i) in forecast&quot;
      :key=&quot;i&quot;
      class=&quot;forecast-bar&quot;
      :style=&quot;{ height: \`\${(v / peakForecast) * 100}%\` }&quot;
      :title=&quot;\`\${i}:00 → \${v.toFixed(1)} MW\`&quot;
    /&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "过载预警",
                hint: "负荷率 ≥ 80%"
              }, {
                default: withCtx(() => [
                  overloaded.value.length ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: "overload-list"
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(overloaded.value, (d) => {
                      var _a;
                      return openBlock(), createBlock("div", {
                        key: d.id,
                        class: "overload-item"
                      }, [
                        createVNode("span", { class: "overload-dot" }),
                        createVNode("span", null, toDisplayString(d.name ?? d.id), 1),
                        createVNode("span", { class: "overload-rate" }, toDisplayString(((((_a = d.properties) == null ? void 0 : _a.loadRate) ?? 0) * 100).toFixed(0)) + "%", 1)
                      ]);
                    }), 128))
                  ])) : (openBlock(), createBlock("p", {
                    key: 1,
                    class: "cg-hint"
                  }, "当前无过载设备"))
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel title="负荷预测" hint="24h 简化模型">\n  <div class="field">\n    <label>基准负荷（MW）</label>\n    <input v-model.number="baseLoad" type="number" class="cg-input" />\n  </div>\n  <div class="field">\n    <label>气温（℃）</label>\n    <input v-model.number="temperature" type="number" class="cg-input" />\n  </div>\n  <label class="checkbox">\n    <input v-model="isHoliday" type="checkbox" />\n    <span>节假日（负荷 ×0.7）</span>\n  </label>\n  <div class="forecast-summary">\n    <span>预测峰值：</span>\n    <b>' + toDisplayString(peakForecast.value.toFixed(1)) + ' MW</b>\n  </div>\n  <div class="forecast-bars">\n    <div\n      v-for="(v, i) in forecast"\n      :key="i"\n      class="forecast-bar"\n      :style="{ height: `${(v / peakForecast) * 100}%` }"\n      :title="`${i}:00 → ${v.toFixed(1)} MW`"\n    />\n  </div>\n</SimPanel>\n', 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("grid/load.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const load = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-35f9440d"]]);
export {
  __pageData,
  load as default
};
