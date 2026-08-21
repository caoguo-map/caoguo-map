import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, unref, createVNode, withDirectives, openBlock, createBlock, Fragment, renderList, toDisplayString, vModelSelect, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrInterpolate, ssrRenderStyle, ssrRenderClass } from "vue/server-renderer";
import { M as Map, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { B as BurstSimulator } from "./chunk-HCT6NSNS.CrGzGtJ8.js";
import { w as wuhanPipeline } from "./wuhan-pipeline.Dx5TNthR.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
const __pageData = JSON.parse('{"title":"P2 爆管推演","description":"","frontmatter":{"title":"P2 爆管推演"},"headers":[],"relativePath":"pipeline/burst.md","filePath":"pipeline/burst.md"}');
const __default__ = { name: "pipeline/burst.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const sim = ref(null);
    const selectedPipe = ref("p04");
    const scenario = ref("water");
    const result = ref(null);
    const durationMs = ref(0);
    function run() {
      var _a;
      if (!sim.value) return;
      const r = sim.value.simulate(selectedPipe.value, { scenario: scenario.value });
      result.value = r;
      durationMs.value = r.durationMs;
      const center = resultCenter(r);
      if (center) {
        const m = map.value;
        (_a = m.instance) == null ? void 0 : _a.flyTo({ center, zoom: 12.5 });
      }
    }
    function clear() {
      var _a;
      (_a = sim.value) == null ? void 0 : _a.clear();
      result.value = null;
    }
    function resultCenter(r) {
      if (r.affectedNodes.length === 0) return null;
      let lng = 0;
      let lat = 0;
      for (const n of r.affectedNodes) {
        lng += n.lng;
        lat += n.lat;
      }
      return [lng / r.affectedNodes.length, lat / r.affectedNodes.length];
    }
    const importantUserDesc = computed(() => {
      if (!result.value || result.value.importantUsers.length === 0) return "无";
      return result.value.importantUsers.map((u) => u.name).join("、");
    });
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
      m.on("load", () => {
        map.value = m;
        const s = new BurstSimulator({
          map: m,
          dataset: wuhanPipeline,
          scenario: "water",
          layerPrefix: "cg-pipe-burst"
        });
        sim.value = s;
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = sim.value) == null ? void 0 : _a.destroy();
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-187cec3e>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "P2 · 爆管推演",
        subtitle: "故障管段 → 自动找隔离阀门 → 推演受影响范围 → 识别重要用户。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="pipeline-map" data-v-187cec3e${_scopeId}></div>`);
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
          var _a, _b, _c, _d;
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "爆管参数",
              hint: "选择故障管段 + 场景"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<label class="cg-label" data-v-187cec3e${_scopeId2}>故障管段</label><select class="cg-select" data-v-187cec3e${_scopeId2}><!--[-->`);
                  ssrRenderList(unref(wuhanPipeline).pipes, (p) => {
                    var _a2;
                    _push3(`<option${ssrRenderAttr("value", p.id)} data-v-187cec3e${ssrIncludeBooleanAttr(Array.isArray(selectedPipe.value) ? ssrLooseContain(selectedPipe.value, p.id) : ssrLooseEqual(selectedPipe.value, p.id)) ? " selected" : ""}${_scopeId2}>${ssrInterpolate(p.id)} — ${ssrInterpolate((_a2 = p.properties) == null ? void 0 : _a2.diameter)}mm </option>`);
                  });
                  _push3(`<!--]--></select><label class="cg-label" style="${ssrRenderStyle({ "margin-top": "14px" })}" data-v-187cec3e${_scopeId2}>场景</label><div class="cg-tabs" data-v-187cec3e${_scopeId2}><!--[-->`);
                  ssrRenderList(["gas", "water", "drainage", "heating"], (s) => {
                    _push3(`<button class="${ssrRenderClass([{ active: scenario.value === s }, "cg-tab"])}" data-v-187cec3e${_scopeId2}>${ssrInterpolate(s === "gas" ? "燃气" : s === "water" ? "供水" : s === "drainage" ? "排水" : "供热")}</button>`);
                  });
                  _push3(`<!--]--></div><div class="cg-actions" data-v-187cec3e${_scopeId2}><button class="cg-btn cg-btn-primary" data-v-187cec3e${_scopeId2}>触发爆管推演</button><button class="cg-btn" data-v-187cec3e${_scopeId2}>清除</button></div>`);
                } else {
                  return [
                    createVNode("label", { class: "cg-label" }, "故障管段"),
                    withDirectives(createVNode("select", {
                      "onUpdate:modelValue": ($event) => selectedPipe.value = $event,
                      class: "cg-select"
                    }, [
                      (openBlock(true), createBlock(Fragment, null, renderList(unref(wuhanPipeline).pipes, (p) => {
                        var _a2;
                        return openBlock(), createBlock("option", {
                          key: p.id,
                          value: p.id
                        }, toDisplayString(p.id) + " — " + toDisplayString((_a2 = p.properties) == null ? void 0 : _a2.diameter) + "mm ", 9, ["value"]);
                      }), 128))
                    ], 8, ["onUpdate:modelValue"]), [
                      [vModelSelect, selectedPipe.value]
                    ]),
                    createVNode("label", {
                      class: "cg-label",
                      style: { "margin-top": "14px" }
                    }, "场景"),
                    createVNode("div", { class: "cg-tabs" }, [
                      (openBlock(), createBlock(Fragment, null, renderList(["gas", "water", "drainage", "heating"], (s) => {
                        return createVNode("button", {
                          key: s,
                          class: ["cg-tab", { active: scenario.value === s }],
                          onClick: ($event) => scenario.value = s
                        }, toDisplayString(s === "gas" ? "燃气" : s === "water" ? "供水" : s === "drainage" ? "排水" : "供热"), 11, ["onClick"]);
                      }), 64))
                    ]),
                    createVNode("div", { class: "cg-actions" }, [
                      createVNode("button", {
                        class: "cg-btn cg-btn-primary",
                        onClick: run
                      }, "触发爆管推演"),
                      createVNode("button", {
                        class: "cg-btn",
                        onClick: clear
                      }, "清除")
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-187cec3e${_scopeId}><code data-v-187cec3e${_scopeId}>&lt;SimPanel v-if=&quot;result&quot; title=&quot;推演结果&quot; hint=&quot;纯函数 · 端到端毫秒级&quot;&gt;
  &lt;div class=&quot;cg-stat-row&quot;&gt;
    &lt;div class=&quot;cg-stat&quot;&gt;
      &lt;div class=&quot;cg-stat-label&quot;&gt;受影响节点&lt;/div&gt;
      &lt;div class=&quot;cg-stat-value&quot;&gt;${ssrInterpolate(result.value.affectedNodes.length)}&lt;/div&gt;
    &lt;/div&gt;
    &lt;div class=&quot;cg-stat&quot;&gt;
      &lt;div class=&quot;cg-stat-label&quot;&gt;受影响管段&lt;/div&gt;
      &lt;div class=&quot;cg-stat-value&quot;&gt;${ssrInterpolate(result.value.affectedPipes.length)}&lt;/div&gt;
    &lt;/div&gt;
    &lt;div class=&quot;cg-stat&quot;&gt;
      &lt;div class=&quot;cg-stat-label&quot;&gt;受影响用户&lt;/div&gt;
      &lt;div class=&quot;cg-stat-value&quot;&gt;${ssrInterpolate(result.value.affectedUserCount)}&lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;h4 class=&quot;cg-h4&quot;&gt;隔离方案&lt;/h4&gt;
  &lt;div class=&quot;cg-summary&quot;&gt;${ssrInterpolate(result.value.valvePlan.summary)}&lt;/div&gt;
  &lt;div v-if=&quot;result.valvePlan.closeValves.length&quot; class=&quot;cg-valve-list&quot;&gt;
    &lt;strong&gt;关闭：&lt;/strong&gt;
    &lt;span
      v-for=&quot;v in result.valvePlan.closeValves&quot;
      :key=&quot;v.id&quot;
      class=&quot;cg-valve cg-valve-close&quot;
    &gt;
      ${ssrInterpolate(((_a = _ctx.v.properties) == null ? void 0 : _a.code) ?? _ctx.v.id)}
    &lt;/span&gt;
  &lt;/div&gt;
  &lt;div v-if=&quot;result.valvePlan.openValves.length&quot; class=&quot;cg-valve-list&quot;&gt;
    &lt;strong&gt;打开：&lt;/strong&gt;
    &lt;span
      v-for=&quot;v in result.valvePlan.openValves&quot;
      :key=&quot;v.id&quot;
      class=&quot;cg-valve cg-valve-open&quot;
    &gt;
      ${ssrInterpolate(((_b = _ctx.v.properties) == null ? void 0 : _b.code) ?? _ctx.v.id)}
    &lt;/span&gt;
  &lt;/div&gt;

  &lt;h4 class=&quot;cg-h4&quot;&gt;重要用户&lt;/h4&gt;
  &lt;div class=&quot;cg-important&quot;&gt;${ssrInterpolate(importantUserDesc.value)}&lt;/div&gt;

  &lt;h4 class=&quot;cg-h4&quot;&gt;性能&lt;/h4&gt;
  &lt;div class=&quot;cg-perf&quot;&gt;推演耗时 ${ssrInterpolate(durationMs.value.toFixed(1))} ms&lt;/div&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "爆管参数",
                hint: "选择故障管段 + 场景"
              }, {
                default: withCtx(() => [
                  createVNode("label", { class: "cg-label" }, "故障管段"),
                  withDirectives(createVNode("select", {
                    "onUpdate:modelValue": ($event) => selectedPipe.value = $event,
                    class: "cg-select"
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(wuhanPipeline).pipes, (p) => {
                      var _a2;
                      return openBlock(), createBlock("option", {
                        key: p.id,
                        value: p.id
                      }, toDisplayString(p.id) + " — " + toDisplayString((_a2 = p.properties) == null ? void 0 : _a2.diameter) + "mm ", 9, ["value"]);
                    }), 128))
                  ], 8, ["onUpdate:modelValue"]), [
                    [vModelSelect, selectedPipe.value]
                  ]),
                  createVNode("label", {
                    class: "cg-label",
                    style: { "margin-top": "14px" }
                  }, "场景"),
                  createVNode("div", { class: "cg-tabs" }, [
                    (openBlock(), createBlock(Fragment, null, renderList(["gas", "water", "drainage", "heating"], (s) => {
                      return createVNode("button", {
                        key: s,
                        class: ["cg-tab", { active: scenario.value === s }],
                        onClick: ($event) => scenario.value = s
                      }, toDisplayString(s === "gas" ? "燃气" : s === "water" ? "供水" : s === "drainage" ? "排水" : "供热"), 11, ["onClick"]);
                    }), 64))
                  ]),
                  createVNode("div", { class: "cg-actions" }, [
                    createVNode("button", {
                      class: "cg-btn cg-btn-primary",
                      onClick: run
                    }, "触发爆管推演"),
                    createVNode("button", {
                      class: "cg-btn",
                      onClick: clear
                    }, "清除")
                  ])
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel v-if="result" title="推演结果" hint="纯函数 · 端到端毫秒级">\n  <div class="cg-stat-row">\n    <div class="cg-stat">\n      <div class="cg-stat-label">受影响节点</div>\n      <div class="cg-stat-value">' + toDisplayString(result.value.affectedNodes.length) + '</div>\n    </div>\n    <div class="cg-stat">\n      <div class="cg-stat-label">受影响管段</div>\n      <div class="cg-stat-value">' + toDisplayString(result.value.affectedPipes.length) + '</div>\n    </div>\n    <div class="cg-stat">\n      <div class="cg-stat-label">受影响用户</div>\n      <div class="cg-stat-value">' + toDisplayString(result.value.affectedUserCount) + '</div>\n    </div>\n  </div>\n\n  <h4 class="cg-h4">隔离方案</h4>\n  <div class="cg-summary">' + toDisplayString(result.value.valvePlan.summary) + '</div>\n  <div v-if="result.valvePlan.closeValves.length" class="cg-valve-list">\n    <strong>关闭：</strong>\n    <span\n      v-for="v in result.valvePlan.closeValves"\n      :key="v.id"\n      class="cg-valve cg-valve-close"\n    >\n      ' + toDisplayString(((_c = _ctx.v.properties) == null ? void 0 : _c.code) ?? _ctx.v.id) + '\n    </span>\n  </div>\n  <div v-if="result.valvePlan.openValves.length" class="cg-valve-list">\n    <strong>打开：</strong>\n    <span\n      v-for="v in result.valvePlan.openValves"\n      :key="v.id"\n      class="cg-valve cg-valve-open"\n    >\n      ' + toDisplayString(((_d = _ctx.v.properties) == null ? void 0 : _d.code) ?? _ctx.v.id) + '\n    </span>\n  </div>\n\n  <h4 class="cg-h4">重要用户</h4>\n  <div class="cg-important">' + toDisplayString(importantUserDesc.value) + '</div>\n\n  <h4 class="cg-h4">性能</h4>\n  <div class="cg-perf">推演耗时 ' + toDisplayString(durationMs.value.toFixed(1)) + " ms</div>\n</SimPanel>\n", 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pipeline/burst.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const burst = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-187cec3e"]]);
export {
  __pageData,
  burst as default
};
