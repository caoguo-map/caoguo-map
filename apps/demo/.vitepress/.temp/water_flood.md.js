import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, createVNode, withDirectives, vModelText, toDisplayString, openBlock, createBlock, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrInterpolate } from "vue/server-renderer";
import { M as Map, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanWater } from "./wuhan-water.Jkl2xV_h.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
function scsRunoff(rainfallMm, curveNumber) {
  if (rainfallMm <= 0) return 0;
  const S = 25400 / curveNumber - 254;
  if (S <= 0) return rainfallMm;
  const Ia = 0.2 * S;
  if (rainfallMm <= Ia) return 0;
  const P = rainfallMm;
  const Q = (P - Ia) * (P - Ia) / (P + 0.8 * S);
  return Q;
}
function peakFlowRational(input) {
  if (input.concentrationTime <= 0) return 0;
  return 0.278 * input.runoffCoefficient * input.rainfallIntensity * input.catchmentArea / input.concentrationTime;
}
function runoffCoefficientFromCN(curveNumber) {
  return Math.min(0.95, curveNumber / 100);
}
function inundateCells(dem, waterLevel, seed) {
  const rows = dem.length;
  if (rows === 0) return /* @__PURE__ */ new Set();
  const cols = dem[0].length;
  const key = (r, c) => `${r},${c}`;
  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const flooded = /* @__PURE__ */ new Set();
  const queue = [seed];
  if (inBounds(seed[0], seed[1])) flooded.add(key(seed[0], seed[1]));
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1]
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc)) continue;
      if (flooded.has(key(nr, nc))) continue;
      if (dem[nr][nc] >= waterLevel) continue;
      flooded.add(key(nr, nc));
      queue.push([nr, nc]);
    }
  }
  return flooded;
}
function maxDepth(dem, flooded, waterLevel) {
  let min = Infinity;
  for (const cell of flooded) {
    const [r, c] = cell.split(",").map(Number);
    if (dem[r][c] < min) min = dem[r][c];
  }
  return min === Infinity ? 0 : waterLevel - min;
}
function simulateFlood(dataset, dem, input, seedCell = [0, 0]) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const rainfall = input.rainfall ?? 0;
  const inflow = input.inflow ?? 0;
  const cn = input.curveNumber ?? 75;
  const runoff = scsRunoff(rainfall, cn);
  const c = runoffCoefficientFromCN(cn);
  const peakFlow = peakFlowRational({
    runoffCoefficient: c,
    rainfallIntensity: input.rainfallIntensity ?? rainfall,
    catchmentArea: input.catchmentArea ?? 1,
    concentrationTime: input.concentrationTime ?? 1
  });
  const waterLevel = runoff / 10 + (inflow > 0 ? inflow / 500 : 0);
  const flooded = inundateCells(dem, waterLevel, seedCell);
  const depth = maxDepth(dem, flooded, waterLevel);
  const cells = [];
  for (const cell of flooded) {
    const [r, c2] = cell.split(",").map(Number);
    cells.push([c2, r]);
  }
  const inundationPolygon = convexHull(cells);
  const affectedFeatures = [];
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return {
    peakFlow,
    runoff,
    inundationPolygon,
    maxDepth: depth,
    inundatedArea: flooded.size,
    // 简化：网格数当作面积
    affectedFeatures,
    durationMs
  };
}
function convexHull(points) {
  if (points.length < 3) return [...points];
  const pts = [...points];
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
const __pageData = JSON.parse('{"title":"F1 洪水淹没模拟","description":"","frontmatter":{"title":"F1 洪水淹没模拟"},"headers":[],"relativePath":"water/flood.md","filePath":"water/flood.md"}');
const __default__ = { name: "water/flood.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const rainfall = ref(120);
    const curveNumber = ref(75);
    const result = ref(null);
    const DEM_SIZE = 20;
    const dem = Array.from(
      { length: DEM_SIZE },
      (_, r) => Array.from({ length: DEM_SIZE }, (_2, c) => {
        const distToCenter = Math.hypot(r - 10, c - 10);
        return 22 + distToCenter * 0.6;
      })
    );
    const cellSize = 3e-3;
    const polygonCoords = computed(() => {
      if (!result.value) return [];
      return result.value.inundationPolygon.map(([c, r]) => [
        114.3 + (c - DEM_SIZE / 2) * cellSize,
        30.6 + (r - DEM_SIZE / 2) * cellSize
      ]);
    });
    const stats = computed(() => {
      if (!result.value) return null;
      return {
        runoff: result.value.runoff.toFixed(1),
        peakFlow: result.value.peakFlow.toFixed(1),
        maxDepth: result.value.maxDepth.toFixed(2),
        area: result.value.inundatedArea,
        duration: result.value.durationMs.toFixed(1)
      };
    });
    function runSim() {
      result.value = simulateFlood(wuhanWater, dem, { rainfall: rainfall.value, curveNumber: curveNumber.value }, [10, 10]);
      renderInundation();
    }
    function renderInundation() {
      if (!map.value || !result.value) return;
      const mlMap = map.value.instance;
      const coords = polygonCoords.value;
      if (coords.length < 3) return;
      const id = "cg-flood-polygon";
      if (mlMap.getSource(`${id}-src`)) {
        mlMap.getSource(`${id}-src`).setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] }, properties: {} }]
        });
        return;
      }
      mlMap.addSource(`${id}-src`, {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] }, properties: {} }]
      });
      mlMap.addLayer({
        id,
        type: "fill",
        source: `${id}-src`,
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.35,
          "fill-outline-color": "#60a5fa"
        }
      });
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.5 });
      m.on("load", () => {
        map.value = m;
        runSim();
      });
    });
    onUnmounted(() => {
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-e059b7fc>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "F1 · 洪水淹没模拟",
        subtitle: "SCS-CN 径流 + 推理公式洪峰 + flood fill 淹没范围提取（简化 DEM）。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="flood-map" data-v-e059b7fc${_scopeId}></div>`);
            if (stats.value) {
              _push2(`<div class="flood-tag" data-v-e059b7fc${_scopeId}> 淹没 ${ssrInterpolate(stats.value.area)} 格 · 最大水深 ${ssrInterpolate(stats.value.maxDepth)}m · ${ssrInterpolate(stats.value.duration)}ms </div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "flood-map"
              }, null, 512),
              stats.value ? (openBlock(), createBlock("div", {
                key: 0,
                class: "flood-tag"
              }, " 淹没 " + toDisplayString(stats.value.area) + " 格 · 最大水深 " + toDisplayString(stats.value.maxDepth) + "m · " + toDisplayString(stats.value.duration) + "ms ", 1)) : createCommentVNode("", true)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "参数面板",
              hint: "降雨量/径流系数"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<div class="field" data-v-e059b7fc${_scopeId2}><label data-v-e059b7fc${_scopeId2}>降雨量（mm）</label><input${ssrRenderAttr("value", rainfall.value)} type="number" class="cg-input" data-v-e059b7fc${_scopeId2}></div><div class="field" data-v-e059b7fc${_scopeId2}><label data-v-e059b7fc${_scopeId2}>径流系数 CN（55-95）</label><input${ssrRenderAttr("value", curveNumber.value)} type="number" class="cg-input" data-v-e059b7fc${_scopeId2}></div><button class="cg-run" data-v-e059b7fc${_scopeId2}>重新模拟</button>`);
                } else {
                  return [
                    createVNode("div", { class: "field" }, [
                      createVNode("label", null, "降雨量（mm）"),
                      withDirectives(createVNode("input", {
                        "onUpdate:modelValue": ($event) => rainfall.value = $event,
                        type: "number",
                        class: "cg-input"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [
                          vModelText,
                          rainfall.value,
                          void 0,
                          { number: true }
                        ]
                      ])
                    ]),
                    createVNode("div", { class: "field" }, [
                      createVNode("label", null, "径流系数 CN（55-95）"),
                      withDirectives(createVNode("input", {
                        "onUpdate:modelValue": ($event) => curveNumber.value = $event,
                        type: "number",
                        class: "cg-input"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [
                          vModelText,
                          curveNumber.value,
                          void 0,
                          { number: true }
                        ]
                      ])
                    ]),
                    createVNode("button", {
                      class: "cg-run",
                      onClick: runSim
                    }, "重新模拟")
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-e059b7fc${_scopeId}><code data-v-e059b7fc${_scopeId}>&lt;SimPanel v-if=&quot;stats&quot; title=&quot;模拟结果&quot; :hint=&quot;\`\${stats.duration}ms\`&quot;&gt;
  &lt;div class=&quot;result-grid&quot;&gt;
    &lt;div class=&quot;result-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(stats.value.runoff)}&lt;/b&gt;&lt;span&gt;径流量 mm&lt;/span&gt;&lt;/div&gt;
    &lt;div class=&quot;result-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(stats.value.peakFlow)}&lt;/b&gt;&lt;span&gt;洪峰 m³/s&lt;/span&gt;&lt;/div&gt;
    &lt;div class=&quot;result-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(stats.value.maxDepth)}&lt;/b&gt;&lt;span&gt;最大水深 m&lt;/span&gt;&lt;/div&gt;
    &lt;div class=&quot;result-cell&quot;&gt;&lt;b&gt;${ssrInterpolate(stats.value.area)}&lt;/b&gt;&lt;span&gt;淹没网格&lt;/span&gt;&lt;/div&gt;
  &lt;/div&gt;
  &lt;div class=&quot;depth-legend&quot;&gt;
    &lt;h4&gt;水深色谱&lt;/h4&gt;
    &lt;div class=&quot;depth-bar&quot; /&gt;
    &lt;div class=&quot;depth-labels&quot;&gt;
      &lt;span&gt;浅&lt;/span&gt;
      &lt;span&gt;深&lt;/span&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "参数面板",
                hint: "降雨量/径流系数"
              }, {
                default: withCtx(() => [
                  createVNode("div", { class: "field" }, [
                    createVNode("label", null, "降雨量（mm）"),
                    withDirectives(createVNode("input", {
                      "onUpdate:modelValue": ($event) => rainfall.value = $event,
                      type: "number",
                      class: "cg-input"
                    }, null, 8, ["onUpdate:modelValue"]), [
                      [
                        vModelText,
                        rainfall.value,
                        void 0,
                        { number: true }
                      ]
                    ])
                  ]),
                  createVNode("div", { class: "field" }, [
                    createVNode("label", null, "径流系数 CN（55-95）"),
                    withDirectives(createVNode("input", {
                      "onUpdate:modelValue": ($event) => curveNumber.value = $event,
                      type: "number",
                      class: "cg-input"
                    }, null, 8, ["onUpdate:modelValue"]), [
                      [
                        vModelText,
                        curveNumber.value,
                        void 0,
                        { number: true }
                      ]
                    ])
                  ]),
                  createVNode("button", {
                    class: "cg-run",
                    onClick: runSim
                  }, "重新模拟")
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel v-if="stats" title="模拟结果" :hint="`${stats.duration}ms`">\n  <div class="result-grid">\n    <div class="result-cell"><b>' + toDisplayString(stats.value.runoff) + '</b><span>径流量 mm</span></div>\n    <div class="result-cell"><b>' + toDisplayString(stats.value.peakFlow) + '</b><span>洪峰 m³/s</span></div>\n    <div class="result-cell"><b>' + toDisplayString(stats.value.maxDepth) + '</b><span>最大水深 m</span></div>\n    <div class="result-cell"><b>' + toDisplayString(stats.value.area) + '</b><span>淹没网格</span></div>\n  </div>\n  <div class="depth-legend">\n    <h4>水深色谱</h4>\n    <div class="depth-bar" />\n    <div class="depth-labels">\n      <span>浅</span>\n      <span>深</span>\n    </div>\n  </div>\n</SimPanel>\n', 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("water/flood.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const flood = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e059b7fc"]]);
export {
  __pageData,
  flood as default
};
