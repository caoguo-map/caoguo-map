import { defineComponent, ref, withCtx, createVNode, openBlock, createBlock, Fragment, renderList, toDisplayString, withDirectives, withKeys, vModelText, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderAttr } from "vue/server-renderer";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { M as MapDemo } from "./MapDemo.DigDKiJJ.js";
import { w as wuhanPipes } from "./wuhan-pipes.T9gYoWj4.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "./index.BvU6W28e.js";
import "maplibre-gl";
const __pageData = JSON.parse('{"title":"D4 Copilot 交互","description":"","frontmatter":{"title":"D4 Copilot 交互"},"headers":[],"relativePath":"copilot/index.md","filePath":"copilot/index.md"}');
const __default__ = { name: "copilot/index.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const thread = ref([
      { role: "user", text: "显示武汉管网爆管影响范围" },
      { role: "bot", text: "已加载主干 / 支管图层，并执行爆管影响范围模拟（演示）。" }
    ]);
    const input = ref("");
    const highlight = ref([]);
    const flyTo = ref([114.3055, 30.5928]);
    function reply(text) {
      if (text.includes("爆管")) {
        highlight.value = wuhanPipes.features.map((f) => f.properties.name);
        flyTo.value = [114.3055, 30.5928];
        return "已在地图高亮全部管线，并执行爆管影响范围模拟：受影响半径约 300m，建议优先排查主干管。";
      }
      if (text.includes("主干管 A")) {
        highlight.value = ["主干管 A"];
        flyTo.value = [114.34, 30.615];
        return "已为「主干管 A」切换红色高亮样式，并飞行定位到其末端。";
      }
      if (text.includes("健康度") || text.includes("摘要")) {
        return "4 条管线，平均压力 0.33 MPa，最大管径 800，健康度评分 92 / 100。整体运行状态良好。";
      }
      return "收到。这是演示环境，我可以根据指令高亮管线、飞行定位并生成摘要，试试「把主干管 A 高亮成红色」。";
    }
    function send() {
      const t = input.value.trim();
      if (!t) return;
      thread.value.push({ role: "user", text: t });
      thread.value.push({ role: "bot", text: reply(t) });
      input.value = "";
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-f709429a>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "D4 · MapCopilot 交互",
        subtitle: "用自然语言指挥地图（演示：预置指令 + 实时地图反馈）。"
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
              title: "Copilot",
              hint: "可交互演示"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<div class="chat" data-v-f709429a${_scopeId2}><!--[-->`);
                  ssrRenderList(thread.value, (m, i) => {
                    _push3(`<div class="${ssrRenderClass([m.role, "bubble"])}" data-v-f709429a${_scopeId2}><span class="who" data-v-f709429a${_scopeId2}>${ssrInterpolate(m.role === "user" ? "你" : "Copilot")}</span><p data-v-f709429a${_scopeId2}>${ssrInterpolate(m.text)}</p></div>`);
                  });
                  _push3(`<!--]--></div><div class="chat-input" data-v-f709429a${_scopeId2}><input${ssrRenderAttr("value", input.value)} placeholder="问问地图试试…（演示）" data-v-f709429a${_scopeId2}><button data-v-f709429a${_scopeId2}>发送</button></div><p class="hint" data-v-f709429a${_scopeId2}>试试：「显示爆管影响范围」「把主干管 A 高亮成红色」「生成健康度摘要」</p>`);
                } else {
                  return [
                    createVNode("div", { class: "chat" }, [
                      (openBlock(true), createBlock(Fragment, null, renderList(thread.value, (m, i) => {
                        return openBlock(), createBlock("div", {
                          key: i,
                          class: ["bubble", m.role]
                        }, [
                          createVNode("span", { class: "who" }, toDisplayString(m.role === "user" ? "你" : "Copilot"), 1),
                          createVNode("p", null, toDisplayString(m.text), 1)
                        ], 2);
                      }), 128))
                    ]),
                    createVNode("div", { class: "chat-input" }, [
                      withDirectives(createVNode("input", {
                        "onUpdate:modelValue": ($event) => input.value = $event,
                        placeholder: "问问地图试试…（演示）",
                        onKeyup: withKeys(send, ["enter"])
                      }, null, 40, ["onUpdate:modelValue"]), [
                        [vModelText, input.value]
                      ]),
                      createVNode("button", { onClick: send }, "发送")
                    ]),
                    createVNode("p", { class: "hint" }, "试试：「显示爆管影响范围」「把主干管 A 高亮成红色」「生成健康度摘要」")
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "Copilot",
                hint: "可交互演示"
              }, {
                default: withCtx(() => [
                  createVNode("div", { class: "chat" }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(thread.value, (m, i) => {
                      return openBlock(), createBlock("div", {
                        key: i,
                        class: ["bubble", m.role]
                      }, [
                        createVNode("span", { class: "who" }, toDisplayString(m.role === "user" ? "你" : "Copilot"), 1),
                        createVNode("p", null, toDisplayString(m.text), 1)
                      ], 2);
                    }), 128))
                  ]),
                  createVNode("div", { class: "chat-input" }, [
                    withDirectives(createVNode("input", {
                      "onUpdate:modelValue": ($event) => input.value = $event,
                      placeholder: "问问地图试试…（演示）",
                      onKeyup: withKeys(send, ["enter"])
                    }, null, 40, ["onUpdate:modelValue"]), [
                      [vModelText, input.value]
                    ]),
                    createVNode("button", { onClick: send }, "发送")
                  ]),
                  createVNode("p", { class: "hint" }, "试试：「显示爆管影响范围」「把主干管 A 高亮成红色」「生成健康度摘要」")
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("copilot/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f709429a"]]);
export {
  __pageData,
  index as default
};
