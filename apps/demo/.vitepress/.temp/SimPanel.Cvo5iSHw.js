import { defineComponent, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderSlot } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "DemoLayout",
  __ssrInlineRender: true,
  props: {
    title: {},
    subtitle: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "demo-layout" }, _attrs))} data-v-09f39b46>`);
      if (__props.title) {
        _push(`<header class="demo-head" data-v-09f39b46><h1 data-v-09f39b46>${ssrInterpolate(__props.title)}</h1>`);
        if (__props.subtitle) {
          _push(`<p data-v-09f39b46>${ssrInterpolate(__props.subtitle)}</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</header>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="demo-body" data-v-09f39b46><section class="demo-map" data-v-09f39b46>`);
      ssrRenderSlot(_ctx.$slots, "map", {}, null, _push, _parent);
      _push(`</section><aside class="demo-side" data-v-09f39b46>`);
      ssrRenderSlot(_ctx.$slots, "panel", {}, null, _push, _parent);
      _push(`</aside></div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("common/DemoLayout.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const DemoLayout = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-09f39b46"]]);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SimPanel",
  __ssrInlineRender: true,
  props: {
    title: {},
    hint: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "sim-panel cg-card" }, _attrs))} data-v-c29fcda4><div class="sp-head" data-v-c29fcda4><h3 data-v-c29fcda4>${ssrInterpolate(__props.title)}</h3>`);
      if (__props.hint) {
        _push(`<span class="sp-hint" data-v-c29fcda4>${ssrInterpolate(__props.hint)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="sp-body" data-v-c29fcda4>`);
      ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("common/SimPanel.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const SimPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c29fcda4"]]);
export {
  DemoLayout as D,
  SimPanel as S
};
