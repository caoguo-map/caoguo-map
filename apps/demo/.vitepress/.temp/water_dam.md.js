import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, openBlock, createBlock, Fragment, renderList, createVNode, toDisplayString, withDirectives, vModelText, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrInterpolate, ssrRenderAttr } from "vue/server-renderer";
import { M as Map, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { r as reservoirIds, w as wuhanWater } from "./wuhan-water.Jkl2xV_h.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
function updateStorageRate(currentRate, outflowDelta, timeStep = 1) {
  const next = currentRate - outflowDelta * 0.01 * timeStep;
  return Math.max(0, Math.min(1, next));
}
function reservoirStatus(storageRate) {
  if (storageRate >= 0.9) return "discharging";
  if (storageRate <= 0.3) return "storing";
  return "balanced";
}
function downstreamLevelChange(outflowDelta, distanceKm) {
  const decay = Math.max(0.1, Math.pow(0.8, distanceKm / 10));
  return outflowDelta * 0.01 * decay;
}
function simulateDamSchedule(dataset, schedule) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const reservoirs = dataset.features.filter((f) => f.kind === "reservoir");
  const waterStations = dataset.features.filter((f) => f.kind === "waterStation");
  const reservoirStates = reservoirs.map((r) => {
    var _a;
    const curRate = ((_a = r.properties) == null ? void 0 : _a.storageRate) ?? 0.5;
    const delta = schedule.outflows[r.id] ?? 0;
    const newRate = updateStorageRate(curRate, delta);
    return {
      reservoirId: r.id,
      storageRate: newRate,
      status: reservoirStatus(newRate)
    };
  });
  const downstreamLevels = waterStations.map((ws) => {
    var _a;
    let totalChange = 0;
    for (const r of reservoirs) {
      const delta = schedule.outflows[r.id] ?? 0;
      const dist = haversine(r.lng, r.lat, ws.lng, ws.lat) / 1e3;
      totalChange += downstreamLevelChange(delta, dist);
    }
    const curLevel = ((_a = ws.properties) == null ? void 0 : _a.waterLevel) ?? 0;
    return {
      stationId: ws.id,
      levelChange: totalChange,
      level: curLevel + totalChange
    };
  });
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return { downstreamLevels, reservoirStates, durationMs };
}
function haversine(lng1, lat1, lng2, lat2) {
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const __pageData = JSON.parse('{"title":"DO1 水库联合调度","description":"","frontmatter":{"title":"DO1 水库联合调度"},"headers":[],"relativePath":"water/dam.md","filePath":"water/dam.md"}');
const __default__ = { name: "water/dam.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const outflows = ref(
      Object.fromEntries(reservoirIds.map((id) => [id, 0]))
    );
    const result = ref(null);
    const reservoirs = computed(
      () => wuhanWater.features.filter((f) => f.kind === "reservoir")
    );
    function runSchedule() {
      result.value = simulateDamSchedule(wuhanWater, { outflows: outflows.value });
    }
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11 });
      m.on("load", () => {
        map.value = m;
        runSchedule();
      });
    });
    onUnmounted(() => {
      map.value = null;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-d226ebca>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "DO1 · 水库联合调度",
        subtitle: "调整各水库泄量 → 下游水位影响推演 → 多方案对比。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="dam-map" data-v-d226ebca${_scopeId}></div>`);
          } else {
            return [
              createVNode("div", {
                ref_key: "mapEl",
                ref: mapEl,
                class: "dam-map"
              }, null, 512)
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "调度方案编辑器",
              hint: "调整各水库泄量"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<!--[-->`);
                  ssrRenderList(reservoirs.value, (r) => {
                    var _a, _b;
                    _push3(`<div class="res-row" data-v-d226ebca${_scopeId2}><div class="res-info" data-v-d226ebca${_scopeId2}><span class="res-name" data-v-d226ebca${_scopeId2}>${ssrInterpolate(r.name)}</span><span class="res-meta" data-v-d226ebca${_scopeId2}> 蓄水率 ${ssrInterpolate(((((_a = r.properties) == null ? void 0 : _a.storageRate) ?? 0) * 100).toFixed(0))}% · 出库 ${ssrInterpolate(((_b = r.properties) == null ? void 0 : _b.outflow) ?? 0)} m³/s </span></div><input${ssrRenderAttr("value", outflows.value[r.id])} type="number" class="cg-input res-input" placeholder="泄量调整" data-v-d226ebca${_scopeId2}></div>`);
                  });
                  _push3(`<!--]--><button class="cg-run" data-v-d226ebca${_scopeId2}>推演下游水位</button>`);
                } else {
                  return [
                    (openBlock(true), createBlock(Fragment, null, renderList(reservoirs.value, (r) => {
                      var _a, _b;
                      return openBlock(), createBlock("div", {
                        key: r.id,
                        class: "res-row"
                      }, [
                        createVNode("div", { class: "res-info" }, [
                          createVNode("span", { class: "res-name" }, toDisplayString(r.name), 1),
                          createVNode("span", { class: "res-meta" }, " 蓄水率 " + toDisplayString(((((_a = r.properties) == null ? void 0 : _a.storageRate) ?? 0) * 100).toFixed(0)) + "% · 出库 " + toDisplayString(((_b = r.properties) == null ? void 0 : _b.outflow) ?? 0) + " m³/s ", 1)
                        ]),
                        withDirectives(createVNode("input", {
                          "onUpdate:modelValue": ($event) => outflows.value[r.id] = $event,
                          type: "number",
                          class: "cg-input res-input",
                          placeholder: "泄量调整"
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [
                            vModelText,
                            outflows.value[r.id],
                            void 0,
                            { number: true }
                          ]
                        ])
                      ]);
                    }), 128)),
                    createVNode("button", {
                      class: "cg-run",
                      onClick: runSchedule
                    }, "推演下游水位")
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-d226ebca${_scopeId}><code data-v-d226ebca${_scopeId}>&lt;SimPanel v-if=&quot;result&quot; title=&quot;下游水位影响&quot; :hint=&quot;\`\${result.durationMs.toFixed(1)}ms\`&quot;&gt;
  &lt;div v-for=&quot;ws in result.downstreamLevels&quot; :key=&quot;ws.stationId&quot; class=&quot;level-row&quot;&gt;
    &lt;span class=&quot;level-name&quot;&gt;${ssrInterpolate(_ctx.ws.stationId)}&lt;/span&gt;
    &lt;span class=&quot;level-value&quot;&gt;
      ${ssrInterpolate(_ctx.ws.level.toFixed(2))}m
      &lt;span :class=&quot;ws.levelChange &gt; 0 ? &#39;up&#39; : ws.levelChange &lt; 0 ? &#39;down&#39; : &#39;&#39;&quot;&gt;
        ${ssrInterpolate(_ctx.ws.levelChange > 0 ? "+" : "")}${ssrInterpolate(_ctx.ws.levelChange.toFixed(2))}
      &lt;/span&gt;
    &lt;/span&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;

&lt;SimPanel v-if=&quot;result&quot; title=&quot;水库状态变化&quot;&gt;
  &lt;div v-for=&quot;rs in result.reservoirStates&quot; :key=&quot;rs.reservoirId&quot; class=&quot;res-state&quot;&gt;
    &lt;span class=&quot;res-name&quot;&gt;${ssrInterpolate(_ctx.rs.reservoirId)}&lt;/span&gt;
    &lt;span class=&quot;res-status&quot; :class=&quot;rs.status&quot;&gt;
      ${ssrInterpolate(_ctx.rs.status === "discharging" ? "泄洪" : _ctx.rs.status === "storing" ? "蓄水" : "平衡")}
      ${ssrInterpolate((_ctx.rs.storageRate * 100).toFixed(0))}%
    &lt;/span&gt;
  &lt;/div&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "调度方案编辑器",
                hint: "调整各水库泄量"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createBlock(Fragment, null, renderList(reservoirs.value, (r) => {
                    var _a, _b;
                    return openBlock(), createBlock("div", {
                      key: r.id,
                      class: "res-row"
                    }, [
                      createVNode("div", { class: "res-info" }, [
                        createVNode("span", { class: "res-name" }, toDisplayString(r.name), 1),
                        createVNode("span", { class: "res-meta" }, " 蓄水率 " + toDisplayString(((((_a = r.properties) == null ? void 0 : _a.storageRate) ?? 0) * 100).toFixed(0)) + "% · 出库 " + toDisplayString(((_b = r.properties) == null ? void 0 : _b.outflow) ?? 0) + " m³/s ", 1)
                      ]),
                      withDirectives(createVNode("input", {
                        "onUpdate:modelValue": ($event) => outflows.value[r.id] = $event,
                        type: "number",
                        class: "cg-input res-input",
                        placeholder: "泄量调整"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [
                          vModelText,
                          outflows.value[r.id],
                          void 0,
                          { number: true }
                        ]
                      ])
                    ]);
                  }), 128)),
                  createVNode("button", {
                    class: "cg-run",
                    onClick: runSchedule
                  }, "推演下游水位")
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel v-if="result" title="下游水位影响" :hint="`${result.durationMs.toFixed(1)}ms`">\n  <div v-for="ws in result.downstreamLevels" :key="ws.stationId" class="level-row">\n    <span class="level-name">' + toDisplayString(_ctx.ws.stationId) + '</span>\n    <span class="level-value">\n      ' + toDisplayString(_ctx.ws.level.toFixed(2)) + `m
      <span :class="ws.levelChange > 0 ? 'up' : ws.levelChange < 0 ? 'down' : ''">
        ` + toDisplayString(_ctx.ws.levelChange > 0 ? "+" : "") + toDisplayString(_ctx.ws.levelChange.toFixed(2)) + '\n      </span>\n    </span>\n  </div>\n</SimPanel>\n\n<SimPanel v-if="result" title="水库状态变化">\n  <div v-for="rs in result.reservoirStates" :key="rs.reservoirId" class="res-state">\n    <span class="res-name">' + toDisplayString(_ctx.rs.reservoirId) + '</span>\n    <span class="res-status" :class="rs.status">\n      ' + toDisplayString(_ctx.rs.status === "discharging" ? "泄洪" : _ctx.rs.status === "storing" ? "蓄水" : "平衡") + "\n      " + toDisplayString((_ctx.rs.storageRate * 100).toFixed(0)) + "%\n    </span>\n  </div>\n</SimPanel>\n", 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("water/dam.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const dam = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d226ebca"]]);
export {
  __pageData,
  dam as default
};
