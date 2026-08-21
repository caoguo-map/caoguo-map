import { defineComponent, withCtx, createVNode, createTextVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { C as CodeViewer } from "./CodeViewer.CAOK_Ui0.js";
import { M as MapDemo } from "./MapDemo.DigDKiJJ.js";
import "./plugin-vue_export-helper.1tPrXgE0.js";
import "./index.BvU6W28e.js";
import "maplibre-gl";
const __pageData = JSON.parse('{"title":"D1 基础地图","description":"","frontmatter":{"title":"D1 基础地图"},"headers":[],"relativePath":"basic/index.md","filePath":"basic/index.md"}');
const __default__ = { name: "basic/index.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const code = `import { Map, WUHAN_CENTER } from '@caoguo/maplibre'

const map = new Map({
  container: '#app',
  center: WUHAN_CENTER, // [114.3055, 30.5928]
  zoom: 11,
  pitch: 45,
})`;
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "D1 · 基础地图",
        subtitle: "初始化一张武汉暗色底图，支持缩放、平移与俯仰。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(MapDemo, {
              zoom: 11,
              height: "100%"
            }, null, _parent2, _scopeId));
          } else {
            return [
              createVNode(MapDemo, {
                zoom: 11,
                height: "100%"
              })
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "说明",
              hint: "最小可用示例"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<p${_scopeId2}>这是草果地图的最小示例。底图使用内置<strong${_scopeId2}>暗色演示样式</strong>（公开 OSM 栅格），上线前请替换为私有化底图。</p><ul${_scopeId2}><li${_scopeId2}>拖动平移、滚轮缩放</li><li${_scopeId2}>右键旋转方位角</li><li${_scopeId2}>数据完全在前端渲染</li></ul>`);
                } else {
                  return [
                    createVNode("p", null, [
                      createTextVNode("这是草果地图的最小示例。底图使用内置"),
                      createVNode("strong", null, "暗色演示样式"),
                      createTextVNode("（公开 OSM 栅格），上线前请替换为私有化底图。")
                    ]),
                    createVNode("ul", null, [
                      createVNode("li", null, "拖动平移、滚轮缩放"),
                      createVNode("li", null, "右键旋转方位角"),
                      createVNode("li", null, "数据完全在前端渲染")
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(ssrRenderComponent(CodeViewer, {
              code,
              lang: "ts"
            }, null, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "说明",
                hint: "最小可用示例"
              }, {
                default: withCtx(() => [
                  createVNode("p", null, [
                    createTextVNode("这是草果地图的最小示例。底图使用内置"),
                    createVNode("strong", null, "暗色演示样式"),
                    createTextVNode("（公开 OSM 栅格），上线前请替换为私有化底图。")
                  ]),
                  createVNode("ul", null, [
                    createVNode("li", null, "拖动平移、滚轮缩放"),
                    createVNode("li", null, "右键旋转方位角"),
                    createVNode("li", null, "数据完全在前端渲染")
                  ])
                ]),
                _: 1
              }),
              createVNode(CodeViewer, {
                code,
                lang: "ts"
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("basic/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
