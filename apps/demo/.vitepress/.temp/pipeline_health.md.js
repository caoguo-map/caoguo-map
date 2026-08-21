var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, onMounted, onUnmounted, withCtx, createVNode, openBlock, createBlock, toDisplayString, Fragment, renderList, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderList } from "vue/server-renderer";
import { M as Map$1, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { w as wuhanPipeline } from "./wuhan-pipeline.Dx5TNthR.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var DEFAULT_WEIGHTS = {
  age: 0.25,
  material: 0.2,
  soil: 0.15,
  history: 0.2,
  pressure: 0.1,
  protection: 0.1
};
var MATERIAL_RISK = {
  cast_iron: 0.85,
  // 铸铁 = 高风险（旧管网）
  ductile_iron: 0.2,
  // 球墨铸铁
  steel: 0.4,
  pe: 0.1,
  pvc: 0.15,
  concrete: 0.3,
  hdpe: 0.05,
  copper: 0.1,
  unknown: 0.5
};
function scorePipeHealth(input, weights = DEFAULT_WEIGHTS) {
  const dims = {
    age: scoreAge(input, weights.age),
    material: scoreMaterial(input, weights.material),
    soil: scoreSoil(input, weights.soil),
    history: scoreHistory(input, weights.history),
    pressure: scorePressure(input, weights.pressure),
    protection: scoreProtection(input, weights.protection)
  };
  const total = dims.age.score * dims.age.weight + dims.material.score * dims.material.weight + dims.soil.score * dims.soil.weight + dims.history.score * dims.history.weight + dims.pressure.score * dims.pressure.weight + dims.protection.score * dims.protection.weight;
  let final = total;
  if (input.status === "damaged") final *= 0.5;
  else if (input.status === "under_repair") final *= 0.7;
  else if (input.status === "abandoned") final = 0;
  return {
    score: Math.round(final),
    level: toLevel(final),
    dimensions: dims
  };
}
function toLevel(score) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  if (score >= 20) return "poor";
  return "critical";
}
function scoreAge(input, weight) {
  if (!input.installDate) {
    return { score: 50, weight, reason: "未知安装日期，按中等计" };
  }
  const ageYears = (Date.now() - new Date(input.installDate).getTime()) / (365.25 * 24 * 3600 * 1e3);
  if (ageYears < 0) return { score: 100, weight, reason: "未来日期，视为优秀" };
  if (ageYears < 5) return { score: 100, weight, reason: "新建管线 (<5年)" };
  if (ageYears < 15) return { score: 85, weight, reason: "较新 (5-15年)" };
  if (ageYears < 25) return { score: 65, weight, reason: "中龄 (15-25年)" };
  if (ageYears < 40) return { score: 40, weight, reason: "老龄 (25-40年)" };
  if (ageYears < 60) return { score: 20, weight, reason: "超期 (>40年)" };
  return { score: 5, weight, reason: "超期 (>60年)" };
}
function scoreMaterial(input, weight) {
  if (!input.material) {
    return { score: 50, weight, reason: "未知材质，按中等计" };
  }
  const risk = MATERIAL_RISK[input.material] ?? 0.5;
  const score = Math.round((1 - risk) * 100);
  const labels = {
    cast_iron: "铸铁（高风险）",
    ductile_iron: "球墨铸铁",
    steel: "钢",
    pe: "PE（低风险）",
    pvc: "PVC",
    concrete: "混凝土",
    hdpe: "HDPE（最佳）",
    copper: "铜",
    unknown: "未知"
  };
  return {
    score,
    weight,
    reason: labels[input.material] ?? input.material
  };
}
function scoreSoil(input, weight) {
  const c = input.soilCorrosion ?? 0.5;
  const score = Math.round((1 - c) * 100);
  return {
    score,
    weight,
    reason: c === 0.5 && !input.soilCorrosion ? "无土壤数据，按平均计" : `土壤腐蚀指数 ${c.toFixed(2)}`
  };
}
function scoreHistory(input, weight) {
  return { score: 100, weight, reason: "历史无故障" };
}
function scorePressure(input, weight) {
  if (!input.pressure) {
    return { score: 75, weight, reason: "无压力数据，按中等偏好计" };
  }
  if (!input.ratedPressure) {
    return { score: 75, weight, reason: "仅知当前压力" };
  }
  const ratio = input.pressure / input.ratedPressure;
  if (ratio < 0.5) return { score: 60, weight, reason: "压力偏低 (使用率 <50%)" };
  if (ratio < 0.8) return { score: 90, weight, reason: "压力正常 (使用率 50-80%)" };
  if (ratio < 1) return { score: 75, weight, reason: "压力偏高 (使用率 80-100%)" };
  if (ratio < 1.2) return { score: 30, weight, reason: "压力超限 (100-120%)" };
  return { score: 0, weight, reason: "压力严重超限 (>120%)" };
}
function scoreProtection(input, weight) {
  return { score: 50, weight, reason: "阴保状态未知" };
}
function aggregateHeatmap(points, options = {}) {
  const cell = options.cellSize ?? 500;
  const agg = options.aggregation ?? "average";
  if (points.length === 0) return [];
  const refLat = points[0].lat;
  const refLng = points[0].lng;
  const mPerDegLat = 110540;
  const mPerDegLng = 111320 * Math.cos(refLat * Math.PI / 180);
  const grid = /* @__PURE__ */ new Map();
  for (const p of points) {
    const x = (p.lng - refLng) * mPerDegLng;
    const y = (p.lat - refLat) * mPerDegLat;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const key = `${cx}:${cy}`;
    const cur = grid.get(key);
    if (!cur) {
      grid.set(key, {
        acc: p.healthScore,
        count: 1,
        minS: p.healthScore,
        maxS: p.healthScore,
        lng: p.lng,
        lat: p.lat
      });
    } else {
      cur.acc += p.healthScore;
      cur.count += 1;
      if (p.healthScore < cur.minS) cur.minS = p.healthScore;
      if (p.healthScore > cur.maxS) cur.maxS = p.healthScore;
      cur.lng = (cur.lng * (cur.count - 1) + p.lng) / cur.count;
      cur.lat = (cur.lat * (cur.count - 1) + p.lat) / cur.count;
    }
  }
  const cells = [];
  for (const v of grid.values()) {
    let score;
    if (agg === "min") score = v.minS;
    else if (agg === "max") score = v.maxS;
    else score = v.acc / v.count;
    cells.push({
      lng: v.lng,
      lat: v.lat,
      healthScore: Math.round(score),
      pipeCount: v.count
    });
  }
  return cells;
}
function heatmapToGeoJSON(cells) {
  return {
    type: "FeatureCollection",
    features: cells.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      properties: {
        healthScore: c.healthScore,
        pipeCount: c.pipeCount
      }
    }))
  };
}
function prioritizeMaintenance(pipes, topN = 10) {
  return [...pipes].sort((a, b) => a.healthScore - b.healthScore).slice(0, topN);
}
var PipelineHealth = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "cellSize");
    __publicField(this, "layerPrefix");
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "lastResult", null);
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.cellSize = options.cellSize ?? 500;
    this.layerPrefix = options.layerPrefix ?? "cg-health";
  }
  /** 评估全网管线健康度 */
  evaluate(weights = DEFAULT_WEIGHTS) {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n]));
    const scores = this.dataset.pipes.map((p) => {
      var _a, _b, _c, _d, _e;
      const input = {
        installDate: (_a = p.properties) == null ? void 0 : _a.installDate,
        material: (_b = p.properties) == null ? void 0 : _b.material,
        pressure: (_c = p.properties) == null ? void 0 : _c.pressure,
        ratedPressure: (_d = p.properties) == null ? void 0 : _d.ratedPressure,
        status: (_e = p.properties) == null ? void 0 : _e.status
      };
      return { pipeId: p.id, score: scorePipeHealth(input, weights) };
    });
    const points = scores.flatMap((s, i) => {
      const pipe = this.dataset.pipes[i];
      const from = nodeById.get(pipe.fromNode);
      const to = nodeById.get(pipe.toNode);
      if (!from || !to) return [];
      return [
        {
          lng: (from.lng + to.lng) / 2,
          lat: (from.lat + to.lat) / 2,
          healthScore: s.score.score
        }
      ];
    });
    const heatmap = aggregateHeatmap(points, { cellSize: this.cellSize });
    const maintenance = prioritizeMaintenance(
      scores.flatMap((s, i) => {
        const pipe = this.dataset.pipes[i];
        const from = nodeById.get(pipe.fromNode);
        const to = nodeById.get(pipe.toNode);
        if (!from || !to) return [];
        return [
          {
            id: pipe.id,
            healthScore: s.score.score,
            lng: (from.lng + to.lng) / 2,
            lat: (from.lat + to.lat) / 2,
            label: pipe.id
          }
        ];
      })
    );
    const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    const result = { scores, heatmap, maintenance, durationMs };
    this.lastResult = result;
    this.renderHeatmap(result);
    for (const l of this.listeners) l(result);
    return result;
  }
  /** 清空图层 */
  clear() {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
  /** 销毁 */
  destroy() {
    this.clear();
    this.listeners.clear();
    this.lastResult = null;
  }
  /** 订阅结果 */
  onResult(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  /** 取最后一次结果 */
  getLastResult() {
    return this.lastResult;
  }
  renderHeatmap(result) {
    this.clear();
    const mlMap = this.map.instance;
    const data = heatmapToGeoJSON(result.heatmap);
    const sourceId = `${this.layerPrefix}-heat-src`;
    const layerId = `${this.layerPrefix}-heat-point`;
    if (!mlMap.getSource(sourceId)) mlMap.addSource(sourceId, data);
    try {
      mlMap.addLayer({
        id: layerId,
        type: "heatmap",
        source: sourceId,
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "healthScore"],
            0,
            1,
            50,
            0.5,
            100,
            0
          ],
          "heatmap-intensity": 1,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(34,197,94,0)",
            0.2,
            "rgba(34,197,94,0.5)",
            0.5,
            "rgba(245,158,11,0.7)",
            0.8,
            "rgba(239,68,68,0.8)",
            1,
            "rgba(127,29,29,0.9)"
          ],
          "heatmap-radius": 25,
          "heatmap-opacity": 0.7
        }
      });
      this.layerIds.push(layerId);
    } catch {
    }
  }
};
const __pageData = JSON.parse('{"title":"P3 健康评估","description":"","frontmatter":{"title":"P3 健康评估"},"headers":[],"relativePath":"pipeline/health.md","filePath":"pipeline/health.md"}');
const __default__ = { name: "pipeline/health.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const health2 = ref(null);
    const result = ref(null);
    function run() {
      if (!health2.value) return;
      result.value = health2.value.evaluate();
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map$1({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
      m.on("load", () => {
        map.value = m;
        const h = new PipelineHealth({
          map: m,
          dataset: wuhanPipeline,
          cellSize: 400,
          layerPrefix: "cg-pipe-health"
        });
        health2.value = h;
        run();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = health2.value) == null ? void 0 : _a.destroy();
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-da719e24>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "P3 管网健康评估",
        subtitle: "6 维加权评分 - 年龄 25%, 材质 20%, 土壤 15%, 历史 20%, 压力 10%, 阴保 10%"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="pipeline-map" data-v-da719e24${_scopeId}></div>`);
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "pipeline-map"
              }, null, 512)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "健康评估概览",
              hint: "网格聚合 + 热力图"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<p class="cg-desc" data-v-da719e24${_scopeId2}>基于管线 6 维评分 (年龄/材质/土壤/历史/压力/阴保) + 状态处罚 (损坏 x 0.5, 维修 x 0.7, 废弃 = 0)</p><button class="cg-btn cg-btn-primary" data-v-da719e24${_scopeId2}>重新评估</button>`);
                  if (result.value) {
                    _push3(`<div class="cg-result" data-v-da719e24${_scopeId2}><div class="cg-stat-row" data-v-da719e24${_scopeId2}><div class="cg-stat" data-v-da719e24${_scopeId2}><div class="cg-stat-label" data-v-da719e24${_scopeId2}>管线总数</div><div class="cg-stat-value" data-v-da719e24${_scopeId2}>${ssrInterpolate(result.value.scores.length)}</div></div><div class="cg-stat" data-v-da719e24${_scopeId2}><div class="cg-stat-label" data-v-da719e24${_scopeId2}>网格数</div><div class="cg-stat-value" data-v-da719e24${_scopeId2}>${ssrInterpolate(result.value.heatmap.length)}</div></div><div class="cg-stat" data-v-da719e24${_scopeId2}><div class="cg-stat-label" data-v-da719e24${_scopeId2}>优先维护</div><div class="cg-stat-value cg-stat-warn" data-v-da719e24${_scopeId2}>${ssrInterpolate(result.value.maintenance.length)}</div></div></div><h4 class="cg-h4" data-v-da719e24${_scopeId2}>优先维护列表 (健康分最低 Top 10)</h4><div class="cg-maint-list" data-v-da719e24${_scopeId2}><!--[-->`);
                    ssrRenderList(result.value.maintenance, (m) => {
                      _push3(`<div class="cg-maint-item" data-v-da719e24${_scopeId2}><span class="cg-maint-id" data-v-da719e24${_scopeId2}>${ssrInterpolate(m.id)}</span><span class="cg-maint-score" data-v-da719e24${_scopeId2}>${ssrInterpolate(m.healthScore)}</span></div>`);
                    });
                    _push3(`<!--]--></div><div class="cg-perf" data-v-da719e24${_scopeId2}>耗时 ${ssrInterpolate(result.value.durationMs.toFixed(1))} ms</div></div>`);
                  } else {
                    _push3(`<!---->`);
                  }
                } else {
                  return [
                    createVNode("p", { class: "cg-desc" }, "基于管线 6 维评分 (年龄/材质/土壤/历史/压力/阴保) + 状态处罚 (损坏 x 0.5, 维修 x 0.7, 废弃 = 0)"),
                    createVNode("button", {
                      class: "cg-btn cg-btn-primary",
                      onClick: run
                    }, "重新评估"),
                    result.value ? (openBlock(), createBlock("div", {
                      key: 0,
                      class: "cg-result"
                    }, [
                      createVNode("div", { class: "cg-stat-row" }, [
                        createVNode("div", { class: "cg-stat" }, [
                          createVNode("div", { class: "cg-stat-label" }, "管线总数"),
                          createVNode("div", { class: "cg-stat-value" }, toDisplayString(result.value.scores.length), 1)
                        ]),
                        createVNode("div", { class: "cg-stat" }, [
                          createVNode("div", { class: "cg-stat-label" }, "网格数"),
                          createVNode("div", { class: "cg-stat-value" }, toDisplayString(result.value.heatmap.length), 1)
                        ]),
                        createVNode("div", { class: "cg-stat" }, [
                          createVNode("div", { class: "cg-stat-label" }, "优先维护"),
                          createVNode("div", { class: "cg-stat-value cg-stat-warn" }, toDisplayString(result.value.maintenance.length), 1)
                        ])
                      ]),
                      createVNode("h4", { class: "cg-h4" }, "优先维护列表 (健康分最低 Top 10)"),
                      createVNode("div", { class: "cg-maint-list" }, [
                        (openBlock(true), createBlock(Fragment, null, renderList(result.value.maintenance, (m) => {
                          return openBlock(), createBlock("div", {
                            key: m.id,
                            class: "cg-maint-item"
                          }, [
                            createVNode("span", { class: "cg-maint-id" }, toDisplayString(m.id), 1),
                            createVNode("span", { class: "cg-maint-score" }, toDisplayString(m.healthScore), 1)
                          ]);
                        }), 128))
                      ]),
                      createVNode("div", { class: "cg-perf" }, "耗时 " + toDisplayString(result.value.durationMs.toFixed(1)) + " ms", 1)
                    ])) : createCommentVNode("", true)
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "健康评估概览",
                hint: "网格聚合 + 热力图"
              }, {
                default: withCtx(() => [
                  createVNode("p", { class: "cg-desc" }, "基于管线 6 维评分 (年龄/材质/土壤/历史/压力/阴保) + 状态处罚 (损坏 x 0.5, 维修 x 0.7, 废弃 = 0)"),
                  createVNode("button", {
                    class: "cg-btn cg-btn-primary",
                    onClick: run
                  }, "重新评估"),
                  result.value ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: "cg-result"
                  }, [
                    createVNode("div", { class: "cg-stat-row" }, [
                      createVNode("div", { class: "cg-stat" }, [
                        createVNode("div", { class: "cg-stat-label" }, "管线总数"),
                        createVNode("div", { class: "cg-stat-value" }, toDisplayString(result.value.scores.length), 1)
                      ]),
                      createVNode("div", { class: "cg-stat" }, [
                        createVNode("div", { class: "cg-stat-label" }, "网格数"),
                        createVNode("div", { class: "cg-stat-value" }, toDisplayString(result.value.heatmap.length), 1)
                      ]),
                      createVNode("div", { class: "cg-stat" }, [
                        createVNode("div", { class: "cg-stat-label" }, "优先维护"),
                        createVNode("div", { class: "cg-stat-value cg-stat-warn" }, toDisplayString(result.value.maintenance.length), 1)
                      ])
                    ]),
                    createVNode("h4", { class: "cg-h4" }, "优先维护列表 (健康分最低 Top 10)"),
                    createVNode("div", { class: "cg-maint-list" }, [
                      (openBlock(true), createBlock(Fragment, null, renderList(result.value.maintenance, (m) => {
                        return openBlock(), createBlock("div", {
                          key: m.id,
                          class: "cg-maint-item"
                        }, [
                          createVNode("span", { class: "cg-maint-id" }, toDisplayString(m.id), 1),
                          createVNode("span", { class: "cg-maint-score" }, toDisplayString(m.healthScore), 1)
                        ]);
                      }), 128))
                    ]),
                    createVNode("div", { class: "cg-perf" }, "耗时 " + toDisplayString(result.value.durationMs.toFixed(1)) + " ms", 1)
                  ])) : createCommentVNode("", true)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pipeline/health.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const health = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-da719e24"]]);
export {
  __pageData,
  health as default
};
