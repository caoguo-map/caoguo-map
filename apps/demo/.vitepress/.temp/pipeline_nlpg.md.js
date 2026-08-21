var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { defineComponent, ref, computed, onMounted, onUnmounted, withCtx, withDirectives, createVNode, vModelText, openBlock, createBlock, Fragment, renderList, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderStyle } from "vue/server-renderer";
import { M as Map, W as WUHAN_CENTER } from "./index.BvU6W28e.js";
import { B as BurstSimulator } from "./chunk-HCT6NSNS.CrGzGtJ8.js";
import { w as wuhanPipeline, p as pipeIds } from "./wuhan-pipeline.Dx5TNthR.js";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "maplibre-gl";
var PATTERNS = [
  { intent: "burst", re: /(爆管|破裂|泄漏|故障|事故|爆裂)/, confidence: 0.95 },
  { intent: "valve", re: /(阀门|闸).*?(关闭|关|合)|(?:关闭|关|合).*?(阀门|闸)/, confidence: 0.9 },
  { intent: "material_age", re: /(\d+)\s*年.*?(铸铁|钢|PE|PVC|铜)/, confidence: 0.85 },
  { intent: "material_age", re: /(铸铁|钢|PE|PVC|铜).*?(\d+)\s*年/, confidence: 0.85 },
  { intent: "pressure", re: /压力.*?(低于|高于|小于|大于|<|>|>=|<=|低|高)\s*(\d+\.?\d*)/, confidence: 0.85 },
  { intent: "nearby", re: /(\d+)\s*(米|m|公里|km).*?(学校|医院|工厂|消防|政府|小区)/, confidence: 0.85 },
  { intent: "alarm_cluster", re: /报警|告警/, confidence: 0.8 }
];
var TYPE_REGEX = [
  { type: "gas", re: /燃气|煤气|天然气/ },
  { type: "water", re: /供水|自来水|水管/ },
  { type: "drainage", re: /排水|污水|雨水/ },
  { type: "heating", re: /供热|暖气|热力/ },
  { type: "power", re: /电力|电缆|高压/ },
  { type: "telecom", re: /通信|光纤|光缆/ }
];
var MATERIAL_REGEX = [
  { key: "cast_iron", cname: "铸铁", re: /铸铁/ },
  { key: "ductile_iron", cname: "球墨铸铁", re: /球墨/ },
  { key: "steel", cname: "钢", re: /钢/ },
  { key: "pe", cname: "PE", re: /PE/ },
  { key: "pvc", cname: "PVC", re: /PVC/ },
  { key: "concrete", cname: "混凝土", re: /混凝土/ },
  { key: "hdpe", cname: "HDPE", re: /HDPE/ },
  { key: "copper", cname: "铜", re: /铜/ }
];
var REGION_REGEX = /(朝阳区|海淀区|江岸区|江汉区|硚口区|汉阳区|武昌区|青山区|洪山区|东西湖区|黄陂区|新洲区|江夏区|蔡甸区|汉南区)/;
function parsePipelineQuery(query) {
  let best = { intent: "unknown", confidence: 0 };
  for (const p of PATTERNS) {
    const m = query.match(p.re);
    if (m) {
      const c = p.confidence * (1 + 0.05 * (m[0].length / query.length));
      if (c > best.confidence) best = { intent: p.intent, confidence: Math.min(c, 1) };
    }
  }
  const filters = {};
  for (const t of TYPE_REGEX) {
    if (t.re.test(query)) {
      filters.pipelineType = t.type;
      break;
    }
  }
  for (const m of MATERIAL_REGEX) {
    if (m.re.test(query)) {
      filters.material = m.key;
      break;
    }
  }
  const ageMatch = query.match(/(\d+)\s*年/);
  if (ageMatch) {
    const years = parseInt(ageMatch[1]);
    if (best.intent === "material_age") {
      if (/超[过于]/.test(query) || /[以]?上/.test(query)) filters.minAgeYears = years;
      else if (/内|以下|不超/.test(query)) filters.maxAgeYears = years;
      else filters.minAgeYears = years;
    } else {
      filters.minAgeYears = years;
    }
  }
  const pressureMatch = query.match(/(\d+\.?\d*)\s*(MPa|mpa)/);
  if (pressureMatch) {
    const v = parseFloat(pressureMatch[1]);
    if (/低|小于|小于等于|</.test(query)) filters.maxPressure = v;
    else if (/高|大于|大于等于|>/.test(query)) filters.minPressure = v;
    else filters.maxPressure = v;
  } else if (/压力/.test(query)) {
    filters.maxPressure = 0.2;
  }
  const distMatch = query.match(/(\d+)\s*(公里|km|千米|米|m)/);
  if (distMatch) {
    let d = parseInt(distMatch[1]);
    const unit = distMatch[2];
    if (/公里|km|千米/.test(unit)) d *= 1e3;
    filters.radius = d;
  }
  if (/昨天/.test(query)) filters.timeWindow = "1d";
  else if (/今天/.test(query)) filters.timeWindow = "1d";
  else if (/最近一周|过去一周|7\s*天/.test(query)) filters.timeWindow = "7d";
  else if (/最近一个月/.test(query)) filters.timeWindow = "30d";
  const regionMatch = query.match(REGION_REGEX);
  if (regionMatch) filters.region = regionMatch[1];
  return {
    intent: best.intent,
    filters,
    description: buildDescription(best.intent, filters),
    confidence: best.confidence
  };
}
function buildDescription(intent, f) {
  var _a;
  const desc = [];
  if (intent === "burst") desc.push("触发爆管推演");
  else if (intent === "valve") desc.push("查询阀门关闭影响");
  else if (intent === "material_age") {
    const matName = ((_a = MATERIAL_REGEX.find((m) => m.key === f.material)) == null ? void 0 : _a.cname) ?? f.material ?? "";
    desc.push(`筛选${matName}管${f.minAgeYears ?? "?"}年以上`);
  } else if (intent === "pressure") desc.push(`筛选压力${f.maxPressure ?? ""}MPa以下`);
  else if (intent === "nearby") desc.push(`${f.radius}m内查找POI`);
  else if (intent === "alarm_cluster") desc.push(`查询${f.timeWindow ?? "1d"}内报警聚集`);
  if (f.pipelineType) desc.push(`[${f.pipelineType}]`);
  if (f.region) desc.push(`区域:${f.region}`);
  return desc.join(" ");
}
var PipelineNlp = class {
  constructor(options = {}) {
    __publicField(this, "burstSimulator");
    __publicField(this, "onIntent");
    this.burstSimulator = options.burstSimulator;
    this.onIntent = options.onIntent;
  }
  /** 解析并按意图触发动作 */
  query(text) {
    const result = parsePipelineQuery(text);
    if (this.onIntent) this.onIntent(result.intent, result);
    return result;
  }
  /** 仅解析不触发动作 */
  parse(text) {
    return parsePipelineQuery(text);
  }
  /** 关联 BurstSimulator */
  setBurstSimulator(sim) {
    this.burstSimulator = sim;
  }
};
const __pageData = JSON.parse('{"title":"P4 管网 NLPG","description":"","frontmatter":{"title":"P4 管网 NLPG"},"headers":[],"relativePath":"pipeline/nlpg.md","filePath":"pipeline/nlpg.md"}');
const __default__ = { name: "pipeline/nlpg.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const mapEl = ref(null);
    const map = ref(null);
    const sim = ref(null);
    const query = ref("武昌区爆管");
    const result = ref(null);
    const intentLabel = computed(() => {
      if (!result.value) return "";
      const labels = {
        burst: "爆管推演",
        valve: "阀门关闭",
        material_age: "材质/年限",
        pressure: "压力筛选",
        nearby: "附近查询",
        alarm_cluster: "报警聚类",
        unknown: "未识别"
      };
      return labels[result.value.intent] ?? result.value.intent;
    });
    computed(() => {
      if (!result.value) return "#94a3b8";
      const colors = {
        burst: "#ef4444",
        valve: "#fbbf24",
        material_age: "#60a5fa",
        pressure: "#a78bfa",
        nearby: "#22c55e",
        alarm_cluster: "#f97316",
        unknown: "#94a3b8"
      };
      return colors[result.value.intent] ?? "#94a3b8";
    });
    const examples = [
      "武昌区爆管推演",
      "查找 30 年以上的铸铁管",
      "压力低于 0.2MPa 的管段",
      "500 米内的学校",
      "过去一周的报警聚集"
    ];
    function run() {
      if (!nlp.value) return;
      const r = nlp.value.query(query.value);
      result.value = r;
      if (r.intent === "burst") {
        if (pipeIds[0] && sim.value) {
          const chosen = pipeIds[Math.floor(pipeIds.length / 2)] ?? pipeIds[0];
          sim.value.simulate(chosen, { scenario: "water" });
        }
      }
    }
    const nlp = ref(null);
    onMounted(() => {
      if (!mapEl.value) return;
      const m = new Map({ container: mapEl.value, center: WUHAN_CENTER, zoom: 11.6 });
      m.on("load", () => {
        map.value = m;
        const s = new BurstSimulator({
          map: m,
          dataset: wuhanPipeline,
          scenario: "water",
          layerPrefix: "cg-pipe-nlpg"
        });
        sim.value = s;
        nlp.value = new PipelineNlp({ burstSimulator: s });
        run();
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = sim.value) == null ? void 0 : _a.destroy();
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-e174f80a>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "P4 · 管网 NLPG 自然语言查询",
        subtitle: "意图识别 + 约束提取 → 联动 burst/topology/health 组件。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="pipeline-map" data-v-e174f80a${_scopeId}></div>`);
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
              title: "查询输入",
              hint: "中文意图识别"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<textarea class="cg-textarea" rows="3" placeholder="例如：武昌区燃气爆管推演" data-v-e174f80a${_scopeId2}>${ssrInterpolate(query.value)}</textarea><div class="cg-examples" data-v-e174f80a${_scopeId2}><!--[-->`);
                  ssrRenderList(examples, (e) => {
                    _push3(`<button class="cg-example" data-v-e174f80a${_scopeId2}>${ssrInterpolate(e)}</button>`);
                  });
                  _push3(`<!--]--></div><button class="cg-btn cg-btn-primary" style="${ssrRenderStyle({ "margin-top": "12px", "width": "100%" })}" data-v-e174f80a${_scopeId2}> 解析 </button>`);
                } else {
                  return [
                    withDirectives(createVNode("textarea", {
                      "onUpdate:modelValue": ($event) => query.value = $event,
                      class: "cg-textarea",
                      rows: "3",
                      placeholder: "例如：武昌区燃气爆管推演"
                    }, null, 8, ["onUpdate:modelValue"]), [
                      [vModelText, query.value]
                    ]),
                    createVNode("div", { class: "cg-examples" }, [
                      (openBlock(), createBlock(Fragment, null, renderList(examples, (e) => {
                        return createVNode("button", {
                          key: e,
                          class: "cg-example",
                          onClick: ($event) => {
                            query.value = e;
                            run();
                          }
                        }, toDisplayString(e), 9, ["onClick"]);
                      }), 64))
                    ]),
                    createVNode("button", {
                      class: "cg-btn cg-btn-primary",
                      style: { "margin-top": "12px", "width": "100%" },
                      onClick: run
                    }, " 解析 ")
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<pre data-v-e174f80a${_scopeId}><code data-v-e174f80a${_scopeId}>&lt;SimPanel v-if=&quot;result&quot; title=&quot;解析结果&quot; hint=&quot;正则 + 词典法&quot;&gt;
  &lt;div class=&quot;cg-intent-row&quot;&gt;
    &lt;div
      class=&quot;cg-intent-badge&quot;
      :style=&quot;{ backgroundColor: intentColor }&quot;
    &gt;
      ${ssrInterpolate(intentLabel.value)}
    &lt;/div&gt;
    &lt;div class=&quot;cg-confidence&quot;&gt;
      置信度 ${ssrInterpolate((result.value.confidence * 100).toFixed(0))}%
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;div class=&quot;cg-description&quot;&gt;${ssrInterpolate(result.value.description)}&lt;/div&gt;

  &lt;h4 class=&quot;cg-h4&quot;&gt;提取的约束（filters）&lt;/h4&gt;
  &lt;pre class=&quot;cg-filters&quot;&gt;${ssrInterpolate(JSON.stringify(result.value.filters, null, 2))}&lt;/pre&gt;
&lt;/SimPanel&gt;
</code></pre>`);
          } else {
            return [
              createVNode(SimPanel, {
                title: "查询输入",
                hint: "中文意图识别"
              }, {
                default: withCtx(() => [
                  withDirectives(createVNode("textarea", {
                    "onUpdate:modelValue": ($event) => query.value = $event,
                    class: "cg-textarea",
                    rows: "3",
                    placeholder: "例如：武昌区燃气爆管推演"
                  }, null, 8, ["onUpdate:modelValue"]), [
                    [vModelText, query.value]
                  ]),
                  createVNode("div", { class: "cg-examples" }, [
                    (openBlock(), createBlock(Fragment, null, renderList(examples, (e) => {
                      return createVNode("button", {
                        key: e,
                        class: "cg-example",
                        onClick: ($event) => {
                          query.value = e;
                          run();
                        }
                      }, toDisplayString(e), 9, ["onClick"]);
                    }), 64))
                  ]),
                  createVNode("button", {
                    class: "cg-btn cg-btn-primary",
                    style: { "margin-top": "12px", "width": "100%" },
                    onClick: run
                  }, " 解析 ")
                ]),
                _: 1
              }),
              createVNode("pre", null, [
                createVNode("code", null, '<SimPanel v-if="result" title="解析结果" hint="正则 + 词典法">\n  <div class="cg-intent-row">\n    <div\n      class="cg-intent-badge"\n      :style="{ backgroundColor: intentColor }"\n    >\n      ' + toDisplayString(intentLabel.value) + '\n    </div>\n    <div class="cg-confidence">\n      置信度 ' + toDisplayString((result.value.confidence * 100).toFixed(0)) + '%\n    </div>\n  </div>\n\n  <div class="cg-description">' + toDisplayString(result.value.description) + '</div>\n\n  <h4 class="cg-h4">提取的约束（filters）</h4>\n  <pre class="cg-filters">' + toDisplayString(JSON.stringify(result.value.filters, null, 2)) + "</pre>\n</SimPanel>\n", 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pipeline/nlpg.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const nlpg = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e174f80a"]]);
export {
  __pageData,
  nlpg as default
};
