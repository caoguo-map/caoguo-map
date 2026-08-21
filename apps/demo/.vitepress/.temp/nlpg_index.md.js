import { defineComponent, ref, withCtx, withDirectives, createVNode, withKeys, vModelText, openBlock, createBlock, Fragment, renderList, toDisplayString, createCommentVNode, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrRenderList, ssrInterpolate } from "vue/server-renderer";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { M as MapDemo } from "./MapDemo.DigDKiJJ.js";
import { w as wuhanPipes } from "./wuhan-pipes.T9gYoWj4.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "./index.BvU6W28e.js";
import "maplibre-gl";
const __pageData = JSON.parse('{"title":"D3 NLPG 查询","description":"","frontmatter":{"title":"D3 NLPG 查询"},"headers":[],"relativePath":"nlpg/index.md","filePath":"nlpg/index.md"}');
const __default__ = { name: "nlpg/index.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const query = ref("光谷附近 500 米内的管线");
    const examples = [
      "光谷附近 500 米内的管线",
      "江汉路片区主干管",
      "直径大于 600 的管线"
    ];
    const POIS = {
      光谷: [114.4, 30.49],
      江汉路: [114.27, 30.58]
    };
    const pipes = wuhanPipes.features.map((f) => ({
      name: f.properties.name,
      diameter: f.properties.diameter
    }));
    const highlight = ref([]);
    const flyTo = ref(null);
    const steps = ref([]);
    function run(q) {
      const text = q.trim();
      const names = [];
      let fly = null;
      const log = [`解析：「${text}」`];
      for (const [poi, coord] of Object.entries(POIS)) {
        if (text.includes(poi)) {
          fly = coord;
          log.push(`→ 地理实体解析：${poi} → 中心点`);
          break;
        }
      }
      if (!fly) log.push("→ 地理实体解析：未识别 POI，使用全图");
      if (text.includes("主干")) {
        names.push(...pipes.filter((p) => p.name.includes("主干")).map((p) => p.name));
        log.push("→ 要素过滤：主干管");
      } else if (text.includes("支管")) {
        names.push(...pipes.filter((p) => p.name.includes("支管")).map((p) => p.name));
        log.push("→ 要素过滤：支管");
      }
      const m = text.match(/直径\s*(大于|大于等?于|>|≥)\s*(\d+)/);
      if (m) {
        const n = Number(m[2]);
        const matched = pipes.filter((p) => p.diameter > n).map((p) => p.name);
        names.push(...matched);
        log.push(`→ 管径约束：diameter > ${n} → 命中 ${matched.length} 条`);
      }
      if (names.length === 0) {
        names.push(...pipes.map((p) => p.name));
        log.push("→ 未识别过滤条件，返回全部管线");
      }
      const uniq = [...new Set(names)];
      log.push(`→ 命中 ${uniq.length} 条管线，已在地图高亮`);
      highlight.value = uniq;
      flyTo.value = fly;
      steps.value = log;
    }
    run(query.value);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-5fc50a5e>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "D3 · NLPG 自然语言查询",
        subtitle: "用一句话把地理意图转为空间查询（演示：前端模拟解析 + 实时高亮）。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(MapDemo, {
              data: unref(wuhanPipes),
              zoom: 11.4,
              "color-by": "diameter",
              highlight: highlight.value,
              "fly-to": flyTo.value,
              height: "100%"
            }, null, _parent2, _scopeId));
          } else {
            return [
              createVNode(MapDemo, {
                data: unref(wuhanPipes),
                zoom: 11.4,
                "color-by": "diameter",
                highlight: highlight.value,
                "fly-to": flyTo.value,
                height: "100%"
              }, null, 8, ["data", "highlight", "fly-to"])
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "自然语言查询",
              hint: "前端模拟"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<input${ssrRenderAttr("value", query.value)} class="nlpg-input" placeholder="例如：光谷附近 500 米内的管线" data-v-5fc50a5e${_scopeId2}><div class="nlpg-examples" data-v-5fc50a5e${_scopeId2}><!--[-->`);
                  ssrRenderList(examples, (e) => {
                    _push3(`<button data-v-5fc50a5e${_scopeId2}>${ssrInterpolate(e)}</button>`);
                  });
                  _push3(`<!--]--></div><button class="cg-btn cg-btn-primary nlpg-run" data-v-5fc50a5e${_scopeId2}>执行查询</button>`);
                  if (steps.value.length) {
                    _push3(`<pre class="nlpg-result" data-v-5fc50a5e${_scopeId2}>${ssrInterpolate(steps.value.join("\n"))}</pre>`);
                  } else {
                    _push3(`<!---->`);
                  }
                } else {
                  return [
                    withDirectives(createVNode("input", {
                      "onUpdate:modelValue": ($event) => query.value = $event,
                      class: "nlpg-input",
                      placeholder: "例如：光谷附近 500 米内的管线",
                      onKeyup: withKeys(($event) => run(query.value), ["enter"])
                    }, null, 40, ["onUpdate:modelValue", "onKeyup"]), [
                      [vModelText, query.value]
                    ]),
                    createVNode("div", { class: "nlpg-examples" }, [
                      (openBlock(), createBlock(Fragment, null, renderList(examples, (e) => {
                        return createVNode("button", {
                          key: e,
                          onClick: ($event) => {
                            query.value = e;
                            run(e);
                          }
                        }, toDisplayString(e), 9, ["onClick"]);
                      }), 64))
                    ]),
                    createVNode("button", {
                      class: "cg-btn cg-btn-primary nlpg-run",
                      onClick: ($event) => run(query.value)
                    }, "执行查询", 8, ["onClick"]),
                    steps.value.length ? (openBlock(), createBlock("pre", {
                      key: 0,
                      class: "nlpg-result"
                    }, toDisplayString(steps.value.join("\n")), 1)) : createCommentVNode("", true)
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "自然语言查询",
                hint: "前端模拟"
              }, {
                default: withCtx(() => [
                  withDirectives(createVNode("input", {
                    "onUpdate:modelValue": ($event) => query.value = $event,
                    class: "nlpg-input",
                    placeholder: "例如：光谷附近 500 米内的管线",
                    onKeyup: withKeys(($event) => run(query.value), ["enter"])
                  }, null, 40, ["onUpdate:modelValue", "onKeyup"]), [
                    [vModelText, query.value]
                  ]),
                  createVNode("div", { class: "nlpg-examples" }, [
                    (openBlock(), createBlock(Fragment, null, renderList(examples, (e) => {
                      return createVNode("button", {
                        key: e,
                        onClick: ($event) => {
                          query.value = e;
                          run(e);
                        }
                      }, toDisplayString(e), 9, ["onClick"]);
                    }), 64))
                  ]),
                  createVNode("button", {
                    class: "cg-btn cg-btn-primary nlpg-run",
                    onClick: ($event) => run(query.value)
                  }, "执行查询", 8, ["onClick"]),
                  steps.value.length ? (openBlock(), createBlock("pre", {
                    key: 0,
                    class: "nlpg-result"
                  }, toDisplayString(steps.value.join("\n")), 1)) : createCommentVNode("", true)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("nlpg/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5fc50a5e"]]);
export {
  __pageData,
  index as default
};
