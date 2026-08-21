import { defineComponent, ref, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderClass } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "CodeViewer",
  __ssrInlineRender: true,
  props: {
    code: {},
    lang: {}
  },
  setup(__props) {
    const copied = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "code-viewer cg-card" }, _attrs))} data-v-9ab276ac><div class="cv-head" data-v-9ab276ac><span class="cv-lang" data-v-9ab276ac>${ssrInterpolate(__props.lang || "ts")}</span><button class="${ssrRenderClass([{ ok: copied.value }, "cv-copy"])}" data-v-9ab276ac>${ssrInterpolate(copied.value ? "已复制" : "查看源码 / 复制")}</button></div><pre class="cv-block" data-v-9ab276ac><code data-v-9ab276ac>${ssrInterpolate(__props.code)}</code></pre></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("common/CodeViewer.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const CodeViewer = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9ab276ac"]]);
export {
  CodeViewer as C
};
